use std::collections::HashMap;
use std::process::Stdio;

use async_trait::async_trait;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio_util::sync::CancellationToken;

use super::parser::parse_nmap_xml;
use super::profiles::get_profiles;
use crate::plugins::traits::{
    PacketEnrichment, Plugin, PluginCapability, PluginError, PluginProgress, PluginResult,
    PluginStatus,
};

pub struct NmapPlugin;

impl NmapPlugin {
    pub fn new() -> Self {
        Self
    }

    fn find_nmap() -> Option<String> {
        let cmd = if cfg!(target_os = "windows") { "where" } else { "which" };
        std::process::Command::new(cmd)
            .arg("nmap")
            .output()
            .ok()
            .and_then(|o| {
                if o.status.success() {
                    let output = String::from_utf8_lossy(&o.stdout);
                    output.lines().next().map(|l| l.trim().to_string())
                } else {
                    None
                }
            })
    }
}

#[async_trait]
impl Plugin for NmapPlugin {
    fn name(&self) -> &str {
        "nmap"
    }

    fn description(&self) -> &str {
        "Network exploration and security auditing tool"
    }

    fn capabilities(&self) -> Vec<PluginCapability> {
        vec![
            PluginCapability::HostDiscovery,
            PluginCapability::PortScan,
            PluginCapability::ServiceDetection,
            PluginCapability::VulnScan,
            PluginCapability::OsDetection,
        ]
    }

    fn is_available(&self) -> bool {
        Self::find_nmap().is_some()
    }

    fn default_params(&self) -> serde_json::Value {
        serde_json::json!({
            "target": "",
            "profile": "quick",
            "customFlags": "",
            "profiles": get_profiles(),
        })
    }

    async fn execute(
        &self,
        params: serde_json::Value,
        cancel: CancellationToken,
        progress_tx: tokio::sync::mpsc::Sender<PluginProgress>,
    ) -> Result<PluginResult, PluginError> {
        let nmap_path = Self::find_nmap()
            .ok_or_else(|| PluginError::NotAvailable("nmap".into()))?;

        let target = params
            .get("target")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        if target.is_empty() {
            return Err(PluginError::ExecutionFailed("No target specified".into()));
        }

        let profile_id = params
            .get("profile")
            .and_then(|v| v.as_str())
            .unwrap_or("quick");

        let profiles = get_profiles();
        let profile = profiles
            .iter()
            .find(|p| p.id == profile_id)
            .ok_or_else(|| PluginError::ExecutionFailed(format!("Unknown profile: {}", profile_id)))?;

        // Build nmap args
        let mut args: Vec<String> = vec!["-oX".into(), "-".into()]; // XML output to stdout

        if profile_id == "custom" {
            let custom_flags = params
                .get("customFlags")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            // Sanitize: only allow flags starting with '-' and known safe patterns
            let blocked = ["--script", "--datadir", "--stylesheet", "--webxml"];
            for token in custom_flags.split_whitespace() {
                let lower = token.to_lowercase();
                if blocked.iter().any(|b| lower.starts_with(b)) {
                    return Err(PluginError::ExecutionFailed(
                        format!("Blocked nmap flag for security: {}", token),
                    ));
                }
                args.push(token.to_string());
            }
        } else {
            args.extend(profile.flags.clone());
        }

        args.push(target.clone());

        let started_at = chrono_now();

        let _ = progress_tx
            .send(PluginProgress {
                plugin: "nmap".into(),
                line: format!("Starting nmap scan: {} {}", nmap_path, args.join(" ")),
                percent: Some(0.0),
            })
            .await;

        // Spawn nmap process
        let mut child = Command::new(&nmap_path)
            .args(&args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| PluginError::ExecutionFailed(format!("Failed to spawn nmap: {}", e)))?;

        let stderr = child.stderr.take()
            .ok_or_else(|| PluginError::ExecutionFailed("Failed to capture nmap stderr".into()))?;
        let stderr_reader = BufReader::new(stderr);
        let mut stderr_lines = stderr_reader.lines();

        // Stream stderr lines as progress
        let progress_tx2 = progress_tx.clone();
        let cancel2 = cancel.clone();
        let stderr_handle = tokio::spawn(async move {
            loop {
                tokio::select! {
                    _ = cancel2.cancelled() => break,
                    line = stderr_lines.next_line() => {
                        match line {
                            Ok(Some(l)) => {
                                let _ = progress_tx2
                                    .send(PluginProgress {
                                        plugin: "nmap".into(),
                                        line: l,
                                        percent: None,
                                    })
                                    .await;
                            }
                            Ok(None) => break,
                            Err(_) => break,
                        }
                    }
                }
            }
        });

        // Wait for process or cancellation
        let _child_id = child.id();
        let stdout_pipe = child.stdout.take()
            .ok_or_else(|| PluginError::ExecutionFailed("Failed to capture nmap stdout".into()))?;
        let mut stdout_reader = BufReader::new(stdout_pipe);
        let mut xml_output = Vec::new();

        let wait_result = tokio::select! {
            _ = cancel.cancelled() => {
                let _ = child.kill().await;
                return Err(PluginError::Cancelled);
            }
            result = async {
                use tokio::io::AsyncReadExt;
                let _ = stdout_reader.read_to_end(&mut xml_output).await;
                child.wait().await
            } => {
                result.map_err(|e| PluginError::ExecutionFailed(format!("nmap process error: {}", e)))?
            }
        };

        let output_str = String::from_utf8_lossy(&xml_output).to_string();

        let _ = stderr_handle.await;

        let completed_at = chrono_now();

        if !wait_result.success() && output_str.is_empty() {
            return Err(PluginError::ExecutionFailed(format!(
                "nmap exited with status {}",
                wait_result,
            )));
        }

        let _ = progress_tx
            .send(PluginProgress {
                plugin: "nmap".into(),
                line: "Parsing scan results...".into(),
                percent: Some(90.0),
            })
            .await;

        // Parse XML output
        let scan_result = parse_nmap_xml(&output_str)?;

        // Build enrichments
        let enrichments: Vec<PacketEnrichment> = scan_result
            .hosts
            .iter()
            .filter(|h| h.status == "up")
            .map(|h| {
                let open_ports: Vec<u16> = h
                    .ports
                    .iter()
                    .filter(|p| p.state == "open")
                    .map(|p| p.port_id)
                    .collect();
                let services: HashMap<u16, String> = h
                    .ports
                    .iter()
                    .filter(|p| p.state == "open")
                    .filter_map(|p| p.service_name.as_ref().map(|svc| (p.port_id, svc.clone())))
                    .collect();
                let os_guess = h.os_matches.first().map(|o| o.name.clone());

                PacketEnrichment {
                    ip: h.address.clone(),
                    hostname: h.hostname.clone(),
                    open_ports,
                    os_guess,
                    services,
                }
            })
            .collect();

        let host_count = scan_result.hosts.len();
        let up_count = scan_result.hosts.iter().filter(|h| h.status == "up").count();
        let total_open: usize = scan_result
            .hosts
            .iter()
            .flat_map(|h| &h.ports)
            .filter(|p| p.state == "open")
            .count();

        let summary = format!(
            "Scanned {} host(s), {} up, {} open port(s) found",
            host_count, up_count, total_open
        );

        let _ = progress_tx
            .send(PluginProgress {
                plugin: "nmap".into(),
                line: format!("Scan complete: {}", summary),
                percent: Some(100.0),
            })
            .await;

        Ok(PluginResult {
            plugin_name: "nmap".into(),
            started_at,
            completed_at,
            status: PluginStatus::Completed,
            summary,
            data: serde_json::to_value(&scan_result)
                .unwrap_or(serde_json::Value::Null),
            enrichments,
        })
    }
}

fn chrono_now() -> String {
    // Simple timestamp without chrono dependency
    let duration = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}", duration.as_secs())
}
