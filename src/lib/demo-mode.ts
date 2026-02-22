import { ParsedPacket } from "../types/packet";
import { RouteHop } from "../types/stream";
import {
  ENCRYPTED_PROTOCOLS,
  getTemplateForProtocol,
  type ProtocolTemplate,
} from "./protocol-templates";

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
  "DHCP",
  "NTP",
  "SNMP",
  "TELNET",
  "RDP",
  "MQTT",
  "MySQL",
  "PGSQL",
  "LDAP",
  "SIP",
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

// ---------------------------------------------------------------------------
// Stateful conversation tracking for realistic payloads
// ---------------------------------------------------------------------------

interface StreamConversationState {
  template: ProtocolTemplate;
  messageIndex: number;
  byteOffset: number;
  initiatorIP: string; // the srcIP of the first packet in this stream
}

const streamConversations = new Map<string, StreamConversationState>();
const MAX_CONVERSATIONS = 50;

export function resetConversationState(): void {
  streamConversations.clear();
}

function asciiToHex(text: string): string {
  let hex = "";
  for (let i = 0; i < text.length; i++) {
    hex += text.charCodeAt(i).toString(16).padStart(2, "0").toUpperCase();
  }
  return hex;
}

function getConversationPayload(
  streamKey: string,
  protocol: string,
  srcIp: string,
  fragmentSize: number
): { hex: string; length: number } | null {
  if (ENCRYPTED_PROTOCOLS.has(protocol)) return null;

  let state = streamConversations.get(streamKey);

  if (!state) {
    const template = getTemplateForProtocol(protocol);
    if (!template) return null;

    // Evict oldest if at capacity
    if (streamConversations.size >= MAX_CONVERSATIONS) {
      const firstKey = streamConversations.keys().next().value;
      if (firstKey !== undefined) streamConversations.delete(firstKey);
    }

    state = {
      template,
      messageIndex: 0,
      byteOffset: 0,
      initiatorIP: srcIp,
    };
    streamConversations.set(streamKey, state);
  }

  // Find the next message matching this packet's direction
  const direction = srcIp === state.initiatorIP ? "client" : "server";
  let msg = state.template[state.messageIndex];

  // If current message direction doesn't match, try to advance to find one that does
  if (msg && msg.direction !== direction) {
    // Check if the next message matches
    for (let i = state.messageIndex + 1; i < state.template.length; i++) {
      if (state.template[i].direction === direction) {
        state.messageIndex = i;
        state.byteOffset = 0;
        msg = state.template[i];
        break;
      }
    }
    // If still no match, just use whatever message we're on
    if (msg.direction !== direction) {
      msg = state.template[state.messageIndex];
    }
  }

  if (!msg) {
    // Template exhausted — loop back
    state.messageIndex = 0;
    state.byteOffset = 0;
    msg = state.template[0];
    if (!msg) return null;
  }

  const content = msg.content;
  const remaining = content.length - state.byteOffset;

  if (remaining <= 0) {
    // Advance to next message
    state.messageIndex++;
    state.byteOffset = 0;
    if (state.messageIndex >= state.template.length) {
      state.messageIndex = 0;
    }
    const nextMsg = state.template[state.messageIndex];
    if (!nextMsg) return null;
    const slice = nextMsg.content.slice(0, fragmentSize);
    state.byteOffset = slice.length;
    if (state.byteOffset >= nextMsg.content.length) {
      state.messageIndex++;
      state.byteOffset = 0;
    }
    return { hex: asciiToHex(slice), length: slice.length };
  }

  const slice = content.slice(
    state.byteOffset,
    state.byteOffset + fragmentSize
  );
  state.byteOffset += slice.length;

  // If we consumed the entire message, advance
  if (state.byteOffset >= content.length) {
    state.messageIndex++;
    state.byteOffset = 0;
  }

  return { hex: asciiToHex(slice), length: slice.length };
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
    DHCP: 67,
    NTP: 123,
    SNMP: 161,
    TELNET: 23,
    RDP: 3389,
    MQTT: 1883,
    MySQL: 3306,
    PGSQL: 5432,
    LDAP: 389,
    SIP: 5060,
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
    ICMP: "Echo Request id=0x1a2b seq=1",
    ARP: "Who has 192.168.1.1? Tell 192.168.1.100",
    DHCP: "DHCP Discover - Transaction ID 0x3a2f",
    NTP: "NTP v4 Client Request",
    SNMP: "SNMP GET .1.3.6.1.2.1.1",
    TELNET: "Telnet IAC WILL ECHO",
    RDP: "[RDP Encrypted PDU]",
    MQTT: "CONNECT MQIsdp client-01",
    MySQL: "COM_QUERY SELECT * FROM users",
    PGSQL: "Query: SELECT * FROM sessions",
    LDAP: 'searchRequest "dc=example,dc=com"',
    SIP: "INVITE sip:user@host SIP/2.0",
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
  // Scale reuse probability with pool size so early packets create diverse streams
  // With 1 stream: ~15% reuse, 5 streams: ~50%, 10+: ~70%
  const reuseChance = Math.min(0.7, existingStreams.length / 14);
  const reuseStream = existingStreams.length > 0 && Math.random() < reuseChance;
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

  const isUdp = ["UDP", "DNS", "DHCP", "NTP", "SNMP", "SIP"].includes(protocol);
  const basePayloadLength = Math.floor(Math.random() * 1000) + 20;
  const tcpHeaderLength = 20 + Math.floor(Math.random() * 4) * 4;
  const ipHeaderLength = 20;
  const ttl = Math.floor(Math.random() * 64) + 32;

  // Compute stream key early so we can look up conversation state
  const tempStreamKey = [srcIp, dstIp].sort().join(":") + "-" +
    [srcPort, dstPort].sort((a, b) => a - b).join(":");

  // Try to get realistic conversation payload for unencrypted protocols
  const fragmentSize = Math.floor(Math.random() * 200) + 40;
  const conversationPayload = getConversationPayload(
    tempStreamKey,
    protocol,
    srcIp,
    fragmentSize
  );

  const payloadLength = conversationPayload
    ? conversationPayload.length
    : basePayloadLength;
  const payloadHex = conversationPayload
    ? conversationPayload.hex
    : randomHex(Math.min(basePayloadLength, 64));

  const totalLength =
    14 + ipHeaderLength + (isUdp ? 8 : tcpHeaderLength) + payloadLength;

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
      data: payloadHex,
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
