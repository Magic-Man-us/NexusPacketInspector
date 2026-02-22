use rayon::prelude::*;
use tauri::Emitter;

use crate::parser::dissector::dissect_packet;
use crate::parser::packet::ParsedPacket;
use crate::parser::pcap_reader;
use crate::state::AppState;

#[tauri::command]
pub async fn open_pcap(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    path: String,
) -> Result<usize, String> {
    // Mark as loading
    {
        let mut loading = state.is_loading.write();
        if *loading {
            return Err("A file is already being loaded".into());
        }
        *loading = true;
    }

    // Read raw packets from file
    let raw_packets = match pcap_reader::read_pcap(&path) {
        Ok(packets) => packets,
        Err(e) => {
            *state.is_loading.write() = false;
            return Err(e);
        }
    };

    let _total = raw_packets.len();

    // Dissect packets in parallel using rayon
    let parsed: Vec<ParsedPacket> = match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        raw_packets
            .par_iter()
            .enumerate()
            .filter_map(|(i, raw)| dissect_packet(i as u64, raw).ok())
            .collect()
    })) {
        Ok(result) => result,
        Err(_) => {
            *state.is_loading.write() = false;
            return Err("Packet dissection failed unexpectedly".into());
        }
    };

    let parsed_count = parsed.len();

    // Store in state BEFORE emitting so frontend reads are consistent
    {
        let mut packets = state.packets.write();
        *packets = parsed;
    }

    // Emit packets in batches of 1000
    let batch_size = 1000;
    {
        let packets = state.packets.read();
        for chunk in packets.chunks(batch_size) {
            let _ = app.emit("packets-chunk", chunk);
        }
    }
    {
        let mut file_path = state.file_path.write();
        *file_path = Some(path);
    }
    {
        let mut filtered = state.filtered_indices.write();
        *filtered = (0..parsed_count).collect();
    }
    {
        *state.is_loading.write() = false;
    }

    Ok(parsed_count)
}

#[tauri::command]
pub fn get_packet_range(
    state: tauri::State<'_, AppState>,
    start: usize,
    count: usize,
) -> Result<Vec<ParsedPacket>, String> {
    let packets = state.packets.read();

    if start >= packets.len() {
        return Ok(Vec::new());
    }

    let end = std::cmp::min(start + count, packets.len());
    Ok(packets[start..end].to_vec())
}
