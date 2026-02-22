use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanProfile {
    pub id: String,
    pub name: String,
    pub description: String,
    pub flags: Vec<String>,
}

pub fn get_profiles() -> Vec<ScanProfile> {
    vec![
        ScanProfile {
            id: "quick".into(),
            name: "Quick Scan".into(),
            description: "Fast scan of top 100 ports".into(),
            flags: vec!["-T4".into(), "-F".into()],
        },
        ScanProfile {
            id: "full".into(),
            name: "Full Scan".into(),
            description: "Scan all 65535 ports".into(),
            flags: vec!["-T3".into(), "-p-".into()],
        },
        ScanProfile {
            id: "stealth".into(),
            name: "Stealth Scan".into(),
            description: "Low-profile SYN scan".into(),
            flags: vec!["-sS".into(), "-T2".into(), "--max-rate".into(), "100".into()],
        },
        ScanProfile {
            id: "vuln".into(),
            name: "Vulnerability Scan".into(),
            description: "Service detection + vulnerability scripts".into(),
            flags: vec!["-sV".into(), "--script".into(), "vuln".into()],
        },
        ScanProfile {
            id: "custom".into(),
            name: "Custom".into(),
            description: "Provide your own nmap flags".into(),
            flags: vec![],
        },
    ]
}
