export interface ParsedPacket {
  id: number;
  timestamp: string;
  time: number;
  protocol: string;
  isUdp: boolean;
  ethernet: EthernetFrame;
  ip: IpHeader;
  tcp: TcpHeader | null;
  udp: UdpHeader | null;
  payload: PayloadInfo;
  srcPort: number;
  dstPort: number;
  length: number;
  info: string;
  streamKey: string;
}

export interface EthernetFrame {
  destMac: string;
  srcMac: string;
  etherType: string;
}

export interface IpHeader {
  version: number;
  ihl: number;
  dscp: number;
  ecn: number;
  totalLength: number;
  identification: string;
  flags: IpFlags;
  fragmentOffset: number;
  ttl: number;
  protocol: number;
  headerChecksum: string;
  srcIp: string;
  dstIp: string;
}

export interface IpFlags {
  reserved: boolean;
  dontFragment: boolean;
  moreFragments: boolean;
}

export interface TcpHeader {
  srcPort: number;
  dstPort: number;
  sequenceNumber: number;
  ackNumber: number;
  dataOffset: number;
  reserved: number;
  flags: TcpFlags;
  windowSize: number;
  checksum: string;
  urgentPointer: number;
}

export interface TcpFlags {
  urg: boolean;
  ack: boolean;
  psh: boolean;
  rst: boolean;
  syn: boolean;
  fin: boolean;
}

export interface UdpHeader {
  srcPort: number;
  dstPort: number;
  length: number;
  checksum: string;
}

export interface PayloadInfo {
  length: number;
  data: string;
  preview: string;
}
