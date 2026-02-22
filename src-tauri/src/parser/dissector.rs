use etherparse::SlicedPacket;

use super::packet::*;
use super::stream_tracker::compute_stream_key;

/// Dissect raw packet bytes into a structured ParsedPacket.
pub fn dissect_packet(id: u64, raw: &[u8]) -> Result<ParsedPacket, String> {
    let sliced =
        SlicedPacket::from_ethernet(raw).map_err(|e| format!("Failed to parse packet: {}", e))?;

    // -- Ethernet Frame --
    let ethernet = parse_ethernet(raw);

    // -- IP Header --
    let (ip, src_ip, dst_ip) = parse_ip(&sliced);

    // -- Transport Layer --
    let (tcp, udp, src_port, dst_port, is_udp) = parse_transport(&sliced);

    // -- Payload --
    let payload = parse_payload(&sliced);

    // -- Protocol detection --
    let protocol = detect_protocol(&sliced, src_port, dst_port);

    // -- Stream key --
    let stream_key = compute_stream_key(&src_ip, src_port, &dst_ip, dst_port);

    // -- Info string --
    let info = build_info_string(&protocol, src_port, dst_port, &tcp, &udp, payload.length);

    let length = raw.len() as u32;

    Ok(ParsedPacket {
        id,
        timestamp: String::new(),
        time: 0.0,
        protocol,
        is_udp,
        ethernet,
        ip,
        tcp,
        udp,
        payload,
        src_port,
        dst_port,
        length,
        info,
        stream_key,
    })
}

fn format_mac(bytes: &[u8]) -> String {
    if bytes.len() >= 6 {
        format!(
            "{:02x}:{:02x}:{:02x}:{:02x}:{:02x}:{:02x}",
            bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5]
        )
    } else {
        "00:00:00:00:00:00".to_string()
    }
}

fn parse_ethernet(raw: &[u8]) -> EthernetFrame {
    if raw.len() >= 14 {
        let dest_mac = format_mac(&raw[0..6]);
        let src_mac = format_mac(&raw[6..12]);
        let ether_type_val = u16::from_be_bytes([raw[12], raw[13]]);
        let ether_type = match ether_type_val {
            0x0800 => "IPv4".to_string(),
            0x0806 => "ARP".to_string(),
            0x86DD => "IPv6".to_string(),
            0x8100 => "802.1Q".to_string(),
            other => format!("0x{:04x}", other),
        };
        EthernetFrame {
            dest_mac,
            src_mac,
            ether_type,
        }
    } else {
        EthernetFrame {
            dest_mac: "00:00:00:00:00:00".to_string(),
            src_mac: "00:00:00:00:00:00".to_string(),
            ether_type: "Unknown".to_string(),
        }
    }
}

fn parse_ip(sliced: &SlicedPacket) -> (IpHeader, String, String) {
    match &sliced.net {
        Some(etherparse::NetSlice::Ipv4(ipv4_slice)) => {
            let h = ipv4_slice.header();
            let src = h.source();
            let dst = h.destination();
            let src_ip = format!("{}.{}.{}.{}", src[0], src[1], src[2], src[3]);
            let dst_ip = format!("{}.{}.{}.{}", dst[0], dst[1], dst[2], dst[3]);
            let frag_offset: u16 = h.fragments_offset().value();
            let ip_header = IpHeader {
                version: 4,
                ihl: h.ihl(),
                dscp: h.dcp().value(),
                ecn: h.ecn().value(),
                total_length: h.total_len(),
                identification: h.identification(),
                flags: IpFlags {
                    reserved: false,
                    dont_fragment: h.dont_fragment(),
                    more_fragments: h.more_fragments(),
                },
                fragment_offset: frag_offset,
                ttl: h.ttl(),
                protocol: h.protocol().0,
                header_checksum: h.header_checksum(),
                src_ip: src_ip.clone(),
                dst_ip: dst_ip.clone(),
            };
            (ip_header, src_ip, dst_ip)
        }
        Some(etherparse::NetSlice::Ipv6(ipv6_slice)) => {
            let h = ipv6_slice.header();
            let src_ip = format!("{}", h.source_addr());
            let dst_ip = format!("{}", h.destination_addr());
            let ip_header = IpHeader {
                version: 6,
                ihl: 0,
                dscp: h.traffic_class() >> 2,
                ecn: h.traffic_class() & 0x03,
                total_length: h.payload_length(),
                identification: 0,
                flags: IpFlags {
                    reserved: false,
                    dont_fragment: false,
                    more_fragments: false,
                },
                fragment_offset: 0,
                ttl: h.hop_limit(),
                protocol: h.next_header().0,
                header_checksum: 0,
                src_ip: src_ip.clone(),
                dst_ip: dst_ip.clone(),
            };
            (ip_header, src_ip, dst_ip)
        }
        None => {
            let ip_header = IpHeader {
                version: 0,
                ihl: 0,
                dscp: 0,
                ecn: 0,
                total_length: 0,
                identification: 0,
                flags: IpFlags {
                    reserved: false,
                    dont_fragment: false,
                    more_fragments: false,
                },
                fragment_offset: 0,
                ttl: 0,
                protocol: 0,
                header_checksum: 0,
                src_ip: "0.0.0.0".to_string(),
                dst_ip: "0.0.0.0".to_string(),
            };
            (ip_header, "0.0.0.0".to_string(), "0.0.0.0".to_string())
        }
    }
}

fn parse_transport(sliced: &SlicedPacket) -> (Option<TcpHeader>, Option<UdpHeader>, u16, u16, bool) {
    match &sliced.transport {
        Some(etherparse::TransportSlice::Tcp(tcp_slice)) => {
            let tcp = TcpHeader {
                src_port: tcp_slice.source_port(),
                dst_port: tcp_slice.destination_port(),
                sequence_number: tcp_slice.sequence_number(),
                ack_number: tcp_slice.acknowledgment_number(),
                data_offset: tcp_slice.data_offset(),
                reserved: 0,
                flags: TcpFlags {
                    urg: tcp_slice.urg(),
                    ack: tcp_slice.ack(),
                    psh: tcp_slice.psh(),
                    rst: tcp_slice.rst(),
                    syn: tcp_slice.syn(),
                    fin: tcp_slice.fin(),
                },
                window_size: tcp_slice.window_size(),
                checksum: tcp_slice.checksum(),
                urgent_pointer: tcp_slice.urgent_pointer(),
            };
            let src_port = tcp_slice.source_port();
            let dst_port = tcp_slice.destination_port();
            (Some(tcp), None, src_port, dst_port, false)
        }
        Some(etherparse::TransportSlice::Udp(udp_slice)) => {
            let udp = UdpHeader {
                src_port: udp_slice.source_port(),
                dst_port: udp_slice.destination_port(),
                length: udp_slice.length(),
                checksum: udp_slice.checksum(),
            };
            let src_port = udp_slice.source_port();
            let dst_port = udp_slice.destination_port();
            (None, Some(udp), src_port, dst_port, true)
        }
        Some(etherparse::TransportSlice::Icmpv4(_)) => (None, None, 0, 0, false),
        Some(etherparse::TransportSlice::Icmpv6(_)) => (None, None, 0, 0, false),
        None => (None, None, 0, 0, false),
    }
}

fn parse_payload(sliced: &SlicedPacket) -> PayloadInfo {
    // In etherparse 0.16, payload is accessed via the transport or net layer
    let data: &[u8] = match &sliced.transport {
        Some(etherparse::TransportSlice::Tcp(tcp_slice)) => tcp_slice.payload(),
        Some(etherparse::TransportSlice::Udp(udp_slice)) => udp_slice.payload(),
        Some(etherparse::TransportSlice::Icmpv4(icmp_slice)) => icmp_slice.payload(),
        Some(etherparse::TransportSlice::Icmpv6(icmp_slice)) => icmp_slice.payload(),
        None => {
            // Try to get payload from the IP layer
            match &sliced.net {
                Some(net_slice) => match net_slice.ip_payload_ref() {
                    Some(ip_payload) => ip_payload.payload,
                    None => &[],
                },
                None => &[],
            }
        }
    };

    let length = data.len();
    let hex_data: String = data
        .iter()
        .take(256)
        .map(|b| format!("{:02x}", b))
        .collect::<Vec<_>>()
        .join(" ");
    let preview: String = data
        .iter()
        .take(64)
        .map(|&b| {
            if b.is_ascii_graphic() || b == b' ' {
                b as char
            } else {
                '.'
            }
        })
        .collect();

    PayloadInfo {
        length,
        data: hex_data,
        preview,
    }
}

fn detect_protocol(
    sliced: &SlicedPacket,
    src_port: u16,
    dst_port: u16,
) -> String {
    // No IP or transport layer — identify by link layer only
    if sliced.net.is_none() && sliced.transport.is_none() {
        return "Unknown".to_string();
    }

    // Check transport layer for ICMP
    match &sliced.transport {
        Some(etherparse::TransportSlice::Icmpv4(_)) => return "ICMP".to_string(),
        Some(etherparse::TransportSlice::Icmpv6(_)) => return "ICMPv6".to_string(),
        _ => {}
    }

    // Detect by well-known port numbers — check dst first (client→server), then src (server→client)
    for &port in &[dst_port, src_port] {
        match port {
            80 => return "HTTP".to_string(),
            443 => return "HTTPS".to_string(),
            53 => return "DNS".to_string(),
            22 => return "SSH".to_string(),
            21 => return "FTP".to_string(),
            25 | 587 => return "SMTP".to_string(),
            110 => return "POP3".to_string(),
            143 => return "IMAP".to_string(),
            23 => return "Telnet".to_string(),
            3389 => return "RDP".to_string(),
            _ => {}
        }
    }

    // Fall back to transport protocol
    match &sliced.transport {
        Some(etherparse::TransportSlice::Tcp(_)) => "TCP".to_string(),
        Some(etherparse::TransportSlice::Udp(_)) => "UDP".to_string(),
        _ => "Unknown".to_string(),
    }
}

fn build_info_string(
    protocol: &str,
    src_port: u16,
    dst_port: u16,
    tcp: &Option<TcpHeader>,
    _udp: &Option<UdpHeader>,
    payload_len: usize,
) -> String {
    if let Some(ref tcp_h) = tcp {
        let mut flags = Vec::new();
        if tcp_h.flags.syn {
            flags.push("SYN");
        }
        if tcp_h.flags.ack {
            flags.push("ACK");
        }
        if tcp_h.flags.fin {
            flags.push("FIN");
        }
        if tcp_h.flags.rst {
            flags.push("RST");
        }
        if tcp_h.flags.psh {
            flags.push("PSH");
        }
        if tcp_h.flags.urg {
            flags.push("URG");
        }
        let flag_str = if flags.is_empty() {
            String::new()
        } else {
            format!("[{}] ", flags.join(", "))
        };
        format!(
            "{} {} -> {} {}Seq={} Ack={} Win={} Len={}",
            protocol,
            src_port,
            dst_port,
            flag_str,
            tcp_h.sequence_number,
            tcp_h.ack_number,
            tcp_h.window_size,
            payload_len
        )
    } else {
        format!(
            "{} {} -> {} Len={}",
            protocol, src_port, dst_port, payload_len
        )
    }
}
