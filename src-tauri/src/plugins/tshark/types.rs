use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TsharkAnalysisMode {
    DeepAnalysis,
    DisplayFilter,
    ProtocolHierarchy,
    ExpertInfo,
    Conversations,
    FollowStream,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TsharkResult {
    pub mode: TsharkAnalysisMode,
    pub data: TsharkData,
    pub packet_count: usize,
    pub pcap_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TsharkData {
    Json(serde_json::Value),
    ProtocolHierarchy(Vec<ProtocolNode>),
    ExpertInfo(Vec<ExpertEntry>),
    Conversations(Vec<ConversationEntry>),
    Stream(StreamData),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtocolNode {
    pub protocol: String,
    pub frames: u64,
    pub bytes: u64,
    pub percent_frames: f64,
    pub depth: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExpertEntry {
    pub severity: String,
    pub group: String,
    pub protocol: String,
    pub summary: String,
    pub count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationEntry {
    pub address_a: String,
    pub address_b: String,
    pub frames_a_to_b: u64,
    pub bytes_a_to_b: u64,
    pub frames_b_to_a: u64,
    pub bytes_b_to_a: u64,
    pub total_frames: u64,
    pub total_bytes: u64,
    pub rel_start: f64,
    pub duration: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamData {
    pub stream_index: u32,
    pub protocol: String,
    pub segments: Vec<StreamSegment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamSegment {
    pub from_server: bool,
    pub data: String,
}
