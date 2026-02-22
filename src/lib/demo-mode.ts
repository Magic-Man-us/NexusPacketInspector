import { ParsedPacket } from "../types/packet";
import { RouteHop } from "../types/stream";

// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS PACKET ANALYZER - Demo Mode Packet Generation
// ═══════════════════════════════════════════════════════════════════════════════

const PROTOCOLS = [
  "TCP",
  "UDP",
  "HTTP",
  "HTTPS",
  "DNS",
  "ICMP",
  "ARP",
  "SSH",
  "FTP",
  "SMTP",
];

// Router IP patterns for simulation
const ROUTER_PREFIXES = ["10.0.0", "192.168.0", "172.16.0", "100.64.0"];
const ISP_ROUTERS = [
  "72.14.215",
  "209.85.248",
  "142.250.80",
  "151.101.1",
  "104.244.42",
];

export interface StreamInfo {
  protocol: string;
  srcIP: string;
  dstIP: string;
  srcPort: number;
  dstPort: number;
}

export type DemoPacket = ParsedPacket & { route: RouteHop[] };

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

function randomHex(bytes: number): string {
  return Array.from({ length: bytes }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase()
  ).join("");
}

function randomMAC(): string {
  return Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase()
  ).join(":");
}

function generateIP(): string {
  const subnets = [
    "192.168.1",
    "10.0.0",
    "172.16.0",
    "8.8.8",
    "1.1.1",
    "203.0.113",
  ];
  return `${subnets[Math.floor(Math.random() * subnets.length)]}.${Math.floor(Math.random() * 255)}`;
}

function generatePort(protocol: string): number {
  const commonPorts: Record<string, number> = {
    HTTP: 80,
    HTTPS: 443,
    DNS: 53,
    SSH: 22,
    FTP: 21,
    SMTP: 25,
  };
  return commonPorts[protocol] || Math.floor(Math.random() * 65535);
}

function generatePayloadPreview(protocol: string): string {
  const previews: Record<string, string> = {
    HTTP: "GET /index.html HTTP/1.1",
    HTTPS: "[TLS Encrypted]",
    DNS: "Query A www.example.com",
    SSH: "SSH-2.0-OpenSSH_8.9",
    FTP: "220 FTP Ready",
    SMTP: "EHLO mail.example.com",
  };
  return previews[protocol] || "[Data]";
}

// ---------------------------------------------------------------------------
// Route generation
// ---------------------------------------------------------------------------

function generateRoute(
  srcIp: string,
  dstIp: string,
  ttl: number
): RouteHop[] {
  const hops: RouteHop[] = [];
  const numHops = Math.max(
    1,
    Math.min(ttl - 1, Math.floor(Math.random() * 8) + 3)
  );

  const srcParts = srcIp.split(".");
  hops.push({
    hop: 1,
    ip: `${srcParts[0]}.${srcParts[1]}.${srcParts[2]}.1`,
    hostname: "gateway.local",
    rtt: Math.random() * 2 + 0.5,
    type: "gateway",
  });

  for (let i = 2; i < numHops; i++) {
    const isISP = i < 4;
    const prefix = isISP
      ? ROUTER_PREFIXES[Math.floor(Math.random() * ROUTER_PREFIXES.length)]
      : ISP_ROUTERS[Math.floor(Math.random() * ISP_ROUTERS.length)];

    hops.push({
      hop: i,
      ip: `${prefix}.${Math.floor(Math.random() * 255)}`,
      hostname: isISP
        ? `isp-router-${i}.provider.net`
        : `core-${i}.transit.net`,
      rtt: Math.random() * 20 + i * 5,
      type: isISP ? "isp" : "transit",
    });
  }

  const dstParts = dstIp.split(".");
  if (numHops > 2) {
    hops.push({
      hop: numHops,
      ip: `${dstParts[0]}.${dstParts[1]}.${dstParts[2]}.1`,
      hostname: "dest-gateway.remote",
      rtt: Math.random() * 30 + 20,
      type: "dest-gateway",
    });
  }

  return hops;
}

// ---------------------------------------------------------------------------
// Stream key derivation
// ---------------------------------------------------------------------------

export function getStreamKey(packet: ParsedPacket): string {
  const ips = [packet.ip.srcIp, packet.ip.dstIp].sort();
  const ports = [packet.srcPort, packet.dstPort].sort((a, b) => a - b);
  return `${ips[0]}:${ports[0]}-${ips[1]}:${ports[1]}`;
}

// ---------------------------------------------------------------------------
// Packet generation
// ---------------------------------------------------------------------------

export function generatePacket(
  id: number,
  existingStreams: StreamInfo[] = []
): DemoPacket {
  const reuseStream = existingStreams.length > 0 && Math.random() > 0.3;
  let protocol: string;
  let srcIp: string;
  let dstIp: string;
  let srcPort: number;
  let dstPort: number;

  if (reuseStream) {
    const stream =
      existingStreams[Math.floor(Math.random() * existingStreams.length)];
    protocol = stream.protocol;
    if (Math.random() > 0.5) {
      srcIp = stream.srcIP;
      dstIp = stream.dstIP;
      srcPort = stream.srcPort;
      dstPort = stream.dstPort;
    } else {
      srcIp = stream.dstIP;
      dstIp = stream.srcIP;
      srcPort = stream.dstPort;
      dstPort = stream.srcPort;
    }
  } else {
    protocol = PROTOCOLS[Math.floor(Math.random() * PROTOCOLS.length)];
    srcIp = generateIP();
    dstIp = generateIP();
    srcPort = Math.floor(Math.random() * 65535);
    dstPort = generatePort(protocol);
  }

  const isUdp = ["UDP", "DNS"].includes(protocol);
  const payloadLength = Math.floor(Math.random() * 1000) + 20;
  const tcpHeaderLength = 20 + Math.floor(Math.random() * 4) * 4;
  const ipHeaderLength = 20;
  const totalLength =
    14 + ipHeaderLength + (isUdp ? 8 : tcpHeaderLength) + payloadLength;
  const ttl = Math.floor(Math.random() * 64) + 32;

  const tcpFlags = {
    urg: Math.random() > 0.95,
    ack: Math.random() > 0.3,
    psh: Math.random() > 0.5,
    rst: Math.random() > 0.95,
    syn: Math.random() > 0.8,
    fin: Math.random() > 0.9,
  };

  const packet: DemoPacket = {
    id,
    timestamp: new Date().toISOString(),
    time: Date.now(),
    protocol,
    isUdp,
    ethernet: {
      destMac: randomMAC(),
      srcMac: randomMAC(),
      etherType: "0800",
    },
    ip: {
      version: 4,
      ihl: ipHeaderLength / 4,
      dscp: Math.floor(Math.random() * 64),
      ecn: Math.floor(Math.random() * 4),
      totalLength: totalLength - 14,
      identification: randomHex(2),
      flags: {
        reserved: false,
        dontFragment: Math.random() > 0.5,
        moreFragments: false,
      },
      fragmentOffset: 0,
      ttl,
      protocol: isUdp ? 17 : 6,
      headerChecksum: randomHex(2),
      srcIp,
      dstIp,
    },
    tcp: isUdp
      ? null
      : {
          srcPort,
          dstPort,
          sequenceNumber: Math.floor(Math.random() * 0xffffffff),
          ackNumber: tcpFlags.ack
            ? Math.floor(Math.random() * 0xffffffff)
            : 0,
          dataOffset: tcpHeaderLength / 4,
          reserved: 0,
          flags: tcpFlags,
          windowSize: Math.floor(Math.random() * 65535),
          checksum: randomHex(2),
          urgentPointer: tcpFlags.urg
            ? Math.floor(Math.random() * 65535)
            : 0,
        },
    udp: !isUdp
      ? null
      : {
          srcPort,
          dstPort,
          length: 8 + payloadLength,
          checksum: randomHex(2),
        },
    payload: {
      length: payloadLength,
      data: randomHex(Math.min(payloadLength, 64)),
      preview: generatePayloadPreview(protocol),
    },
    route: generateRoute(srcIp, dstIp, ttl),
    srcPort,
    dstPort,
    length: totalLength,
    info: `${srcIp}:${srcPort} \u2192 ${dstIp}:${dstPort}`,
    streamKey: "", // placeholder, assigned below
  };

  packet.streamKey = getStreamKey(packet);
  return packet;
}
