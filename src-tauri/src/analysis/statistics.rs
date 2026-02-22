use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::state::AppState;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PacketStatistics {
    pub total: usize,
    pub protocols: HashMap<String, usize>,
    pub ips: HashMap<String, usize>,
    pub ports: HashMap<u16, usize>,
}

#[tauri::command]
pub fn get_statistics(
    state: tauri::State<'_, AppState>,
) -> Result<PacketStatistics, String> {
    let packets = state.packets.read();

    let mut protocols: HashMap<String, usize> = HashMap::new();
    let mut ips: HashMap<String, usize> = HashMap::new();
    let mut ports: HashMap<u16, usize> = HashMap::new();

    for pkt in packets.iter() {
        *protocols.entry(pkt.protocol.clone()).or_insert(0) += 1;

        *ips.entry(pkt.ip.src_ip.clone()).or_insert(0) += 1;
        *ips.entry(pkt.ip.dst_ip.clone()).or_insert(0) += 1;

        if pkt.src_port != 0 {
            *ports.entry(pkt.src_port).or_insert(0) += 1;
        }
        if pkt.dst_port != 0 {
            *ports.entry(pkt.dst_port).or_insert(0) += 1;
        }
    }

    Ok(PacketStatistics {
        total: packets.len(),
        protocols,
        ips,
        ports,
    })
}
