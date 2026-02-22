import { ParsedPacket } from "./packet";

export interface StreamData {
  packets: ParsedPacket[];
  srcIP: string;
  dstIP: string;
  srcPort: number;
  dstPort: number;
  protocol: string;
  startTime: number;
  lastTime: number;
  color: string;
  totalBytes: number;
  route?: RouteHop[];
}

export interface RouteHop {
  hop: number;
  ip: string;
  hostname: string;
  rtt: number;
  type: string;
}
