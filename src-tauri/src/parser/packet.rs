use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedPacket {
    pub id: u64,
    pub timestamp: String,
    pub time: f64,
    pub protocol: String,
    pub is_udp: bool,
    pub ethernet: EthernetFrame,
    pub ip: IpHeader,
    pub tcp: Option<TcpHeader>,
    pub udp: Option<UdpHeader>,
    pub payload: PayloadInfo,
    pub src_port: u16,
    pub dst_port: u16,
    pub length: u32,
    pub info: String,
    pub stream_key: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EthernetFrame {
    pub dest_mac: String,
    pub src_mac: String,
    pub ether_type: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IpHeader {
    pub version: u8,
    pub ihl: u8,
    pub dscp: u8,
    pub ecn: u8,
    pub total_length: u16,
    pub identification: u16,
    pub flags: IpFlags,
    pub fragment_offset: u16,
    pub ttl: u8,
    pub protocol: u8,
    pub header_checksum: u16,
    pub src_ip: String,
    pub dst_ip: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IpFlags {
    pub reserved: bool,
    pub dont_fragment: bool,
    pub more_fragments: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TcpHeader {
    pub src_port: u16,
    pub dst_port: u16,
    pub sequence_number: u32,
    pub ack_number: u32,
    pub data_offset: u8,
    pub reserved: u8,
    pub flags: TcpFlags,
    pub window_size: u16,
    pub checksum: u16,
    pub urgent_pointer: u16,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TcpFlags {
    pub urg: bool,
    pub ack: bool,
    pub psh: bool,
    pub rst: bool,
    pub syn: bool,
    pub fin: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UdpHeader {
    pub src_port: u16,
    pub dst_port: u16,
    pub length: u16,
    pub checksum: u16,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PayloadInfo {
    pub length: usize,
    pub data: String,
    pub preview: String,
}
