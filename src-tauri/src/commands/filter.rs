use crate::state::AppState;

#[tauri::command]
pub fn apply_filter(
    state: tauri::State<'_, AppState>,
    filter_text: String,
) -> Result<Vec<usize>, String> {
    let packets = state.packets.read();
    let trimmed = filter_text.trim();

    // Empty filter returns all indices
    if trimmed.is_empty() {
        let indices: Vec<usize> = (0..packets.len()).collect();
        let mut filtered = state.filtered_indices.write();
        *filtered = indices.clone();
        return Ok(indices);
    }

    let filter_lower = trimmed.to_lowercase();
    let indices: Vec<usize> = packets
        .iter()
        .enumerate()
        .filter(|(_, pkt)| matches_filter(pkt, &filter_lower))
        .map(|(i, _)| i)
        .collect();

    let mut filtered = state.filtered_indices.write();
    *filtered = indices.clone();
    Ok(indices)
}

fn matches_filter(
    pkt: &crate::parser::packet::ParsedPacket,
    filter: &str,
) -> bool {
    // Protocol match: "tcp", "udp", "http", "dns", etc.
    if !filter.contains(' ') && !filter.contains('=') && !filter.contains('.') {
        return pkt.protocol.to_lowercase() == *filter;
    }

    // "ip.src == <addr>" or "ip.dst == <addr>"
    if let Some(rest) = filter.strip_prefix("ip.src") {
        let addr = rest.trim().trim_start_matches("==").trim();
        return pkt.ip.src_ip == addr;
    }
    if let Some(rest) = filter.strip_prefix("ip.dst") {
        let addr = rest.trim().trim_start_matches("==").trim();
        return pkt.ip.dst_ip == addr;
    }

    // "ip.addr == <addr>" - matches either src or dst
    if let Some(rest) = filter.strip_prefix("ip.addr") {
        let addr = rest.trim().trim_start_matches("==").trim();
        return pkt.ip.src_ip == addr || pkt.ip.dst_ip == addr;
    }

    // "port <number>" - matches src or dst port
    if let Some(rest) = filter.strip_prefix("port") {
        let port_str = rest.trim();
        if let Ok(port) = port_str.parse::<u16>() {
            return pkt.src_port == port || pkt.dst_port == port;
        }
    }

    // "src port <number>"
    if let Some(rest) = filter.strip_prefix("src port") {
        let port_str = rest.trim();
        if let Ok(port) = port_str.parse::<u16>() {
            return pkt.src_port == port;
        }
    }

    // "dst port <number>"
    if let Some(rest) = filter.strip_prefix("dst port") {
        let port_str = rest.trim();
        if let Ok(port) = port_str.parse::<u16>() {
            return pkt.dst_port == port;
        }
    }

    // Fallback: substring search across protocol, IPs, info
    let pkt_protocol_lower = pkt.protocol.to_lowercase();
    pkt_protocol_lower.contains(filter)
        || pkt.ip.src_ip.contains(filter)
        || pkt.ip.dst_ip.contains(filter)
        || pkt.info.to_lowercase().contains(filter)
}
