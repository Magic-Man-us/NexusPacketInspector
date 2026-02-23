use std::process::Stdio;

use async_trait::async_trait;
use tokio::io::{AsyncBufReadExt, AsyncReadExt, BufReader};
use tokio::process::Command;
use tokio_util::sync::CancellationToken;

use super::modes::build_command;
use super::parser::{parse_conversations, parse_expert_info, parse_follow_stream, parse_protocol_hierarchy};
use super::types::{TsharkAnalysisMode, TsharkData, TsharkResult};
use crate::plugins::traits::{
    Plugin, PluginCapability, PluginCategory, PluginError, PluginProgress, PluginResult,
    PluginStatus,
};

pub struct TsharkPlugin;

impl TsharkPlugin {
    pub fn new() -> Self {
        Self
    }

    fn find_tshark() -> Option<String> {
        let cmd = if cfg!(target_os = "windows") {
            "where"
        } else {
            "which"
        };
        std::process::Command::new(cmd)
            .arg("tshark")
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
impl Plugin for TsharkPlugin {
    fn name(&self) -> &str {
        "tshark"
    }

    fn description(&self) -> &str {
        "Deep PCAP analysis with Wireshark's tshark engine"
    }

    fn category(&self) -> PluginCategory {
        PluginCategory::PacketAnalysis
    }

    fn capabilities(&self) -> Vec<PluginCapability> {
        vec![
            PluginCapability::PacketAnalysis,
            PluginCapability::DisplayFilter,
            PluginCapability::ProtocolStats,
            PluginCapability::ExpertInfo,
            PluginCapability::ConversationStats,
            PluginCapability::StreamFollow,
        ]
    }

    fn is_available(&self) -> bool {
        Self::find_tshark().is_some()
    }

    fn default_params(&self) -> serde_json::Value {
        serde_json::json!({
            "pcapPath": "",
            "mode": "protocolHierarchy",
            "displayFilter": "",
            "conversationType": "ip",
            "streamProtocol": "tcp",
            "streamIndex": 0,
            "limit": 1000,
        })
    }

    async fn execute(
        &self,
        params: serde_json::Value,
        cancel: CancellationToken,
        progress_tx: tokio::sync::mpsc::Sender<PluginProgress>,
    ) -> Result<PluginResult, PluginError> {
        let tshark_path =
            Self::find_tshark().ok_or_else(|| PluginError::NotAvailable("tshark".into()))?;

        let pcap_path = params
            .get("pcapPath")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        if pcap_path.is_empty() {
            return Err(PluginError::ExecutionFailed(
                "No PCAP file path specified".into(),
            ));
        }

        // Validate pcap path exists
        if !std::path::Path::new(&pcap_path).exists() {
            return Err(PluginError::ExecutionFailed(format!(
                "PCAP file not found: {}",
                pcap_path
            )));
        }

        let mode_str = params
            .get("mode")
            .and_then(|v| v.as_str())
            .unwrap_or("protocolHierarchy");

        let mode = match mode_str {
            "deepAnalysis" => TsharkAnalysisMode::DeepAnalysis,
            "displayFilter" => TsharkAnalysisMode::DisplayFilter,
            "protocolHierarchy" => TsharkAnalysisMode::ProtocolHierarchy,
            "expertInfo" => TsharkAnalysisMode::ExpertInfo,
            "conversations" => TsharkAnalysisMode::Conversations,
            "followStream" => TsharkAnalysisMode::FollowStream,
            _ => {
                return Err(PluginError::ExecutionFailed(format!(
                    "Unknown analysis mode: {}",
                    mode_str
                )))
            }
        };

        let cmd = build_command(&mode, &pcap_path, &params);

        let started_at = chrono_now();

        let _ = progress_tx
            .send(PluginProgress {
                plugin: "tshark".into(),
                line: format!(
                    "Running tshark: {} {}",
                    tshark_path,
                    cmd.args.join(" ")
                ),
                percent: Some(0.0),
            })
            .await;

        // Spawn tshark process
        let mut child = Command::new(&tshark_path)
            .args(&cmd.args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| {
                PluginError::ExecutionFailed(format!("Failed to spawn tshark: {}", e))
            })?;

        // Stream stderr as progress
        let stderr = child
            .stderr
            .take()
            .ok_or_else(|| PluginError::ExecutionFailed("Failed to capture tshark stderr".into()))?;
        let stderr_reader = BufReader::new(stderr);
        let mut stderr_lines = stderr_reader.lines();

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
                                        plugin: "tshark".into(),
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

        // Read stdout
        let stdout_pipe = child
            .stdout
            .take()
            .ok_or_else(|| PluginError::ExecutionFailed("Failed to capture tshark stdout".into()))?;
        let mut stdout_reader = BufReader::new(stdout_pipe);
        let mut output_bytes = Vec::new();

        let wait_result = tokio::select! {
            _ = cancel.cancelled() => {
                let _ = child.kill().await;
                return Err(PluginError::Cancelled);
            }
            result = async {
                let _ = stdout_reader.read_to_end(&mut output_bytes).await;
                child.wait().await
            } => {
                result.map_err(|e| PluginError::ExecutionFailed(format!("tshark process error: {}", e)))?
            }
        };

        let output_str = String::from_utf8_lossy(&output_bytes).to_string();
        let _ = stderr_handle.await;

        let completed_at = chrono_now();

        if !wait_result.success() && output_str.is_empty() {
            return Err(PluginError::ExecutionFailed(format!(
                "tshark exited with status {}",
                wait_result,
            )));
        }

        let _ = progress_tx
            .send(PluginProgress {
                plugin: "tshark".into(),
                line: "Parsing tshark output...".into(),
                percent: Some(80.0),
            })
            .await;

        // Parse output based on mode
        let (data, packet_count) = if cmd.is_json {
            let json_val: serde_json::Value = serde_json::from_str(&output_str)
                .map_err(|e| PluginError::ParseError(format!("JSON parse error: {}", e)))?;
            let count = json_val.as_array().map(|a| a.len()).unwrap_or(0);
            (TsharkData::Json(json_val), count)
        } else {
            match &mode {
                TsharkAnalysisMode::ProtocolHierarchy => {
                    let nodes = parse_protocol_hierarchy(&output_str)?;
                    let count = nodes.len();
                    (TsharkData::ProtocolHierarchy(nodes), count)
                }
                TsharkAnalysisMode::ExpertInfo => {
                    let entries = parse_expert_info(&output_str)?;
                    let count = entries.len();
                    (TsharkData::ExpertInfo(entries), count)
                }
                TsharkAnalysisMode::Conversations => {
                    let convs = parse_conversations(&output_str)?;
                    let count = convs.len();
                    (TsharkData::Conversations(convs), count)
                }
                TsharkAnalysisMode::FollowStream => {
                    let stream = parse_follow_stream(&output_str)?;
                    let count = stream.segments.len();
                    (TsharkData::Stream(stream), count)
                }
                _ => unreachable!(),
            }
        };

        let tshark_result = TsharkResult {
            mode: mode.clone(),
            data,
            packet_count,
            pcap_path: pcap_path.clone(),
        };

        let summary = format!(
            "tshark {} analysis: {} items from {}",
            mode_str, packet_count, pcap_path
        );

        let _ = progress_tx
            .send(PluginProgress {
                plugin: "tshark".into(),
                line: format!("Analysis complete: {}", summary),
                percent: Some(100.0),
            })
            .await;

        Ok(PluginResult {
            plugin_name: "tshark".into(),
            started_at,
            completed_at,
            status: PluginStatus::Completed,
            summary,
            data: serde_json::to_value(&tshark_result).unwrap_or(serde_json::Value::Null),
            enrichments: vec![],
        })
    }
}

fn chrono_now() -> String {
    let duration = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}", duration.as_secs())
}
