use super::types::TsharkAnalysisMode;

pub struct TsharkCommand {
    pub args: Vec<String>,
    pub is_json: bool,
}

pub fn build_command(
    mode: &TsharkAnalysisMode,
    pcap_path: &str,
    params: &serde_json::Value,
) -> TsharkCommand {
    match mode {
        TsharkAnalysisMode::DeepAnalysis => {
            let limit = params
                .get("limit")
                .and_then(|v| v.as_u64())
                .unwrap_or(1000);
            TsharkCommand {
                args: vec![
                    "-r".into(),
                    pcap_path.into(),
                    "-T".into(),
                    "json".into(),
                    "-c".into(),
                    limit.to_string(),
                ],
                is_json: true,
            }
        }
        TsharkAnalysisMode::DisplayFilter => {
            let filter = params
                .get("displayFilter")
                .and_then(|v| v.as_str())
                .unwrap_or("tcp");
            let limit = params
                .get("limit")
                .and_then(|v| v.as_u64())
                .unwrap_or(500);
            TsharkCommand {
                args: vec![
                    "-r".into(),
                    pcap_path.into(),
                    "-Y".into(),
                    filter.into(),
                    "-T".into(),
                    "json".into(),
                    "-c".into(),
                    limit.to_string(),
                ],
                is_json: true,
            }
        }
        TsharkAnalysisMode::ProtocolHierarchy => TsharkCommand {
            args: vec![
                "-r".into(),
                pcap_path.into(),
                "-q".into(),
                "-z".into(),
                "io,phs".into(),
            ],
            is_json: false,
        },
        TsharkAnalysisMode::ExpertInfo => TsharkCommand {
            args: vec![
                "-r".into(),
                pcap_path.into(),
                "-q".into(),
                "-z".into(),
                "expert".into(),
            ],
            is_json: false,
        },
        TsharkAnalysisMode::Conversations => {
            let conv_type = params
                .get("conversationType")
                .and_then(|v| v.as_str())
                .unwrap_or("ip");
            TsharkCommand {
                args: vec![
                    "-r".into(),
                    pcap_path.into(),
                    "-q".into(),
                    "-z".into(),
                    format!("conv,{}", conv_type),
                ],
                is_json: false,
            }
        }
        TsharkAnalysisMode::FollowStream => {
            let proto = params
                .get("streamProtocol")
                .and_then(|v| v.as_str())
                .unwrap_or("tcp");
            let index = params
                .get("streamIndex")
                .and_then(|v| v.as_u64())
                .unwrap_or(0);
            TsharkCommand {
                args: vec![
                    "-r".into(),
                    pcap_path.into(),
                    "-q".into(),
                    "-z".into(),
                    format!("follow,{},ascii,{}", proto, index),
                ],
                is_json: false,
            }
        }
    }
}
