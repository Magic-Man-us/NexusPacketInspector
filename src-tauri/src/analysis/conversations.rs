use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::state::AppState;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Conversation {
    pub src: String,
    pub dst: String,
    pub packets: u64,
    pub bytes: u64,
    pub protocols: Vec<String>,
}

#[tauri::command]
pub fn get_conversations(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Conversation>, String> {
    let packets = state.packets.read();

    // Group by conversation key (sorted IP pair)
    let mut conversation_map: HashMap<String, ConversationAccumulator> = HashMap::new();

    for pkt in packets.iter() {
        let (src, dst) = if pkt.ip.src_ip <= pkt.ip.dst_ip {
            (pkt.ip.src_ip.clone(), pkt.ip.dst_ip.clone())
        } else {
            (pkt.ip.dst_ip.clone(), pkt.ip.src_ip.clone())
        };

        let key = format!("{}-{}", src, dst);
        let entry = conversation_map.entry(key).or_insert_with(|| {
            ConversationAccumulator {
                src,
                dst,
                packets: 0,
                bytes: 0,
                protocols: HashMap::new(),
            }
        });

        entry.packets += 1;
        entry.bytes += pkt.length as u64;
        *entry.protocols.entry(pkt.protocol.clone()).or_insert(0) += 1;
    }

    let conversations: Vec<Conversation> = conversation_map
        .into_values()
        .map(|acc| Conversation {
            src: acc.src,
            dst: acc.dst,
            packets: acc.packets,
            bytes: acc.bytes,
            protocols: acc.protocols.into_keys().collect(),
        })
        .collect();

    Ok(conversations)
}

struct ConversationAccumulator {
    src: String,
    dst: String,
    packets: u64,
    bytes: u64,
    protocols: HashMap<String, usize>,
}
