use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NmapScanResult {
    pub hosts: Vec<NmapHost>,
    pub scan_info: NmapScanInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NmapScanInfo {
    pub scanner: String,
    pub args: String,
    pub start_time: String,
    pub end_time: String,
    pub elapsed: String,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NmapHost {
    pub address: String,
    pub hostname: Option<String>,
    pub status: String,
    pub ports: Vec<NmapPort>,
    pub os_matches: Vec<NmapOsMatch>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NmapPort {
    pub port_id: u16,
    pub protocol: String,
    pub state: String,
    pub service_name: Option<String>,
    pub service_version: Option<String>,
    pub service_product: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NmapOsMatch {
    pub name: String,
    pub accuracy: String,
}
