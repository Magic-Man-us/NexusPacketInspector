use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio_util::sync::CancellationToken;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PluginCategory {
    NetworkScanning,
    PacketAnalysis,
    TrafficMonitoring,
    IntrusionDetection,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PluginCapability {
    HostDiscovery,
    PortScan,
    ServiceDetection,
    VulnScan,
    OsDetection,
    PacketAnalysis,
    DisplayFilter,
    ProtocolStats,
    ExpertInfo,
    ConversationStats,
    StreamFollow,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PluginStatus {
    Running,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginInfo {
    pub name: String,
    pub description: String,
    pub category: PluginCategory,
    pub capabilities: Vec<PluginCapability>,
    pub available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginResult {
    pub plugin_name: String,
    pub started_at: String,
    pub completed_at: String,
    pub status: PluginStatus,
    pub summary: String,
    pub data: serde_json::Value,
    pub enrichments: Vec<PacketEnrichment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PacketEnrichment {
    pub ip: String,
    pub hostname: Option<String>,
    pub open_ports: Vec<u16>,
    pub os_guess: Option<String>,
    pub services: HashMap<u16, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginProgress {
    pub plugin: String,
    pub line: String,
    pub percent: Option<f32>,
}

#[derive(Debug)]
pub enum PluginError {
    NotFound(String),
    NotAvailable(String),
    ExecutionFailed(String),
    Cancelled,
    ParseError(String),
}

impl std::fmt::Display for PluginError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PluginError::NotFound(name) => write!(f, "Plugin '{}' not found", name),
            PluginError::NotAvailable(name) => write!(f, "Plugin '{}' is not available (CLI tool not installed)", name),
            PluginError::ExecutionFailed(msg) => write!(f, "Plugin execution failed: {}", msg),
            PluginError::Cancelled => write!(f, "Plugin execution cancelled"),
            PluginError::ParseError(msg) => write!(f, "Failed to parse plugin output: {}", msg),
        }
    }
}

impl std::error::Error for PluginError {}

#[async_trait]
pub trait Plugin: Send + Sync {
    fn name(&self) -> &str;
    fn description(&self) -> &str;
    fn category(&self) -> PluginCategory;
    fn capabilities(&self) -> Vec<PluginCapability>;
    fn is_available(&self) -> bool;
    fn default_params(&self) -> serde_json::Value;
    async fn execute(
        &self,
        params: serde_json::Value,
        cancel: CancellationToken,
        progress_tx: tokio::sync::mpsc::Sender<PluginProgress>,
    ) -> Result<PluginResult, PluginError>;
}

pub fn timestamp_now() -> String {
    let duration = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}", duration.as_secs())
}
