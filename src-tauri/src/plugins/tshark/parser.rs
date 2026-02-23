use crate::plugins::traits::PluginError;

use super::types::{ConversationEntry, ExpertEntry, ProtocolNode, StreamData, StreamSegment};

pub fn parse_protocol_hierarchy(output: &str) -> Result<Vec<ProtocolNode>, PluginError> {
    let mut nodes = Vec::new();

    for line in output.lines() {
        let trimmed = line.trim();
        // Skip header/separator/empty lines
        if trimmed.is_empty()
            || trimmed.starts_with("===")
            || trimmed.starts_with("Protocol")
            || trimmed.starts_with("Filter:")
        {
            continue;
        }

        // Lines look like: "  eth  frames:100 bytes:50000"
        // or from io,phs: "eth            frames:1234 bytes:567890"
        // Determine depth by leading spaces
        let depth = line.len() - line.trim_start().len();
        let indent_level = depth / 2;

        // Parse "protocol  frames:N bytes:N"
        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.is_empty() {
            continue;
        }

        let protocol = parts[0].to_string();
        let mut frames: u64 = 0;
        let mut bytes: u64 = 0;

        for part in &parts[1..] {
            if let Some(val) = part.strip_prefix("frames:") {
                frames = val.parse().unwrap_or(0);
            } else if let Some(val) = part.strip_prefix("bytes:") {
                bytes = val.parse().unwrap_or(0);
            }
        }

        if frames > 0 || !protocol.is_empty() {
            nodes.push(ProtocolNode {
                protocol,
                frames,
                bytes,
                percent_frames: 0.0,
                depth: indent_level,
            });
        }
    }

    // Calculate percentages based on root frame count
    if let Some(root_frames) = nodes.first().map(|n| n.frames) {
        if root_frames > 0 {
            for node in &mut nodes {
                node.percent_frames = (node.frames as f64 / root_frames as f64) * 100.0;
            }
        }
    }

    Ok(nodes)
}

pub fn parse_expert_info(output: &str) -> Result<Vec<ExpertEntry>, PluginError> {
    let mut entries = Vec::new();
    let mut in_table = false;

    for line in output.lines() {
        let trimmed = line.trim();

        if trimmed.starts_with("Severity") {
            in_table = true;
            continue;
        }
        if !in_table || trimmed.is_empty() || trimmed.starts_with("===") {
            continue;
        }

        // Format: "Severity  Group     Protocol  Summary                Count"
        // Parse by splitting on multiple spaces
        let parts: Vec<&str> = trimmed.splitn(5, |c: char| c == '\t' || c == '|').collect();
        if parts.len() >= 4 {
            // Try tab-delimited first
            let severity = parts[0].trim().to_string();
            let group = parts[1].trim().to_string();
            let protocol = parts[2].trim().to_string();
            let rest = parts[3..].join(" ");
            let rest = rest.trim();

            // Extract count from end if present
            let (summary, count) = if let Some(last_space) = rest.rfind(|c: char| c.is_whitespace()) {
                let potential_count = rest[last_space..].trim();
                if let Ok(c) = potential_count.parse::<u64>() {
                    (rest[..last_space].trim().to_string(), c)
                } else {
                    (rest.to_string(), 1)
                }
            } else {
                (rest.to_string(), 1)
            };

            if !severity.is_empty() && !group.is_empty() {
                entries.push(ExpertEntry {
                    severity,
                    group,
                    protocol,
                    summary,
                    count,
                });
            }
        } else {
            // Fallback: split by whitespace
            let words: Vec<&str> = trimmed.split_whitespace().collect();
            if words.len() >= 4 {
                let severity = words[0].to_string();
                let group = words[1].to_string();
                let protocol = words[2].to_string();

                // Count is the last token if numeric
                let (summary_words, count) =
                    if let Ok(c) = words.last().unwrap_or(&"").parse::<u64>() {
                        (&words[3..words.len() - 1], c)
                    } else {
                        (&words[3..], 1u64)
                    };

                entries.push(ExpertEntry {
                    severity,
                    group,
                    protocol,
                    summary: summary_words.join(" "),
                    count,
                });
            }
        }
    }

    Ok(entries)
}

pub fn parse_conversations(output: &str) -> Result<Vec<ConversationEntry>, PluginError> {
    let mut entries = Vec::new();
    let mut in_data = false;

    for line in output.lines() {
        let trimmed = line.trim();

        // Skip the header line containing "<->" (e.g. "Address A <-> Address B ...")
        if trimmed.contains("<->") && !in_data {
            in_data = true;
            continue;
        }
        if trimmed.starts_with("Filter:") || trimmed.starts_with("===") {
            continue;
        }
        if trimmed.is_empty() {
            continue;
        }

        // Look for lines with "<->" which are data lines
        if !trimmed.contains("<->") {
            // Check if previous line was header
            if trimmed.contains("Frames") || trimmed.contains("Bytes") {
                in_data = true;
            }
            continue;
        }

        in_data = true;

        // Parse: "addr_a  <-> addr_b  framesA  bytesA  framesB  bytesB  totalFrames  totalBytes  relStart  duration"
        let halves: Vec<&str> = trimmed.splitn(2, "<->").collect();
        if halves.len() != 2 {
            continue;
        }

        let address_a = halves[0].trim().to_string();
        let right_parts: Vec<&str> = halves[1].trim().split_whitespace().collect();

        if right_parts.len() < 7 {
            continue;
        }

        let address_b = right_parts[0].to_string();

        let parse_u64 = |s: &str| -> u64 { s.replace(',', "").parse().unwrap_or(0) };
        let parse_f64 = |s: &str| -> f64 { s.parse().unwrap_or(0.0) };

        let frames_a_to_b = parse_u64(right_parts[1]);
        let bytes_a_to_b = parse_u64(right_parts[2]);
        let frames_b_to_a = parse_u64(right_parts[3]);
        let bytes_b_to_a = parse_u64(right_parts[4]);
        let total_frames = parse_u64(right_parts[5]);
        let total_bytes = parse_u64(right_parts[6]);
        let rel_start = if right_parts.len() > 7 {
            parse_f64(right_parts[7])
        } else {
            0.0
        };
        let duration = if right_parts.len() > 8 {
            parse_f64(right_parts[8])
        } else {
            0.0
        };

        entries.push(ConversationEntry {
            address_a,
            address_b,
            frames_a_to_b,
            bytes_a_to_b,
            frames_b_to_a,
            bytes_b_to_a,
            total_frames,
            total_bytes,
            rel_start,
            duration,
        });
    }

    Ok(entries)
}

pub fn parse_follow_stream(output: &str) -> Result<StreamData, PluginError> {
    let mut segments = Vec::new();
    let mut current_from_server = false;
    let mut current_data = String::new();
    let mut protocol = String::from("tcp");
    let mut stream_index: u32 = 0;
    let mut in_stream = false;

    for line in output.lines() {
        // Parse header like "Follow: tcp,ascii" or "====================================================================="
        if line.starts_with("Follow:") {
            let parts: Vec<&str> = line.split(',').collect();
            if !parts.is_empty() {
                protocol = parts[0]
                    .strip_prefix("Follow: ")
                    .unwrap_or("tcp")
                    .to_string();
            }
            continue;
        }

        if line.starts_with("Stream:") {
            if let Some(idx) = line.split_whitespace().last() {
                stream_index = idx.parse().unwrap_or(0);
            }
            continue;
        }

        if line.starts_with("=====") {
            // End of stream or separator
            if in_stream && !current_data.is_empty() {
                segments.push(StreamSegment {
                    from_server: current_from_server,
                    data: std::mem::take(&mut current_data),
                });
            }
            in_stream = !in_stream;
            continue;
        }

        if !in_stream {
            continue;
        }

        // In tshark follow output, client data starts at column 0,
        // server data is indented or marked differently.
        // The ascii follow format uses color codes or indentation.
        // Lines starting with \t are from server, others from client.
        let is_server = line.starts_with('\t');
        let clean_line = line.trim_start_matches('\t');

        if is_server != current_from_server && !current_data.is_empty() {
            segments.push(StreamSegment {
                from_server: current_from_server,
                data: std::mem::take(&mut current_data),
            });
        }

        current_from_server = is_server;
        if !current_data.is_empty() {
            current_data.push('\n');
        }
        current_data.push_str(clean_line);
    }

    // Flush remaining
    if !current_data.is_empty() {
        segments.push(StreamSegment {
            from_server: current_from_server,
            data: current_data,
        });
    }

    Ok(StreamData {
        stream_index,
        protocol,
        segments,
    })
}
