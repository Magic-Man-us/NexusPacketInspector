import { useState, useMemo } from "react";
import { ParsedPacket } from "../../types/packet";
import { LAYER_COLORS } from "../../styles/theme";

interface Props {
  packet: ParsedPacket;
}

type LayerKey = "ethernet" | "ip" | "tcp" | "udp" | "payload";

interface ByteRegion {
  start: number;
  end: number;
  layer: LayerKey;
  label: string;
}

const BYTES_PER_ROW = 16;

function hexFromPacket(packet: ParsedPacket): { bytes: number[]; regions: ByteRegion[] } {
  const bytes: number[] = [];
  const regions: ByteRegion[] = [];

  // Ethernet header (14 bytes)
  const ethStart = bytes.length;
  const srcMac = packet.ethernet.srcMac.split(":").map((h) => parseInt(h, 16));
  const dstMac = packet.ethernet.destMac.split(":").map((h) => parseInt(h, 16));
  bytes.push(...dstMac, ...srcMac);
  // EtherType (2 bytes)
  const ethType = packet.ethernet.etherType === "IPv4" ? [0x08, 0x00] : [0x86, 0xdd];
  bytes.push(...ethType);
  regions.push({ start: ethStart, end: bytes.length, layer: "ethernet", label: "Ethernet" });

  // IP header (20 bytes minimum)
  const ipStart = bytes.length;
  const ver = (packet.ip.version << 4) | (packet.ip.ihl & 0xf);
  bytes.push(ver);
  bytes.push((packet.ip.dscp << 2) | packet.ip.ecn);
  bytes.push((packet.ip.totalLength >> 8) & 0xff, packet.ip.totalLength & 0xff);
  const idVal = parseInt(packet.ip.identification.replace("0x", ""), 16) || 0;
  bytes.push((idVal >> 8) & 0xff, idVal & 0xff);
  let flagByte = 0;
  if (packet.ip.flags.dontFragment) flagByte |= 0x40;
  if (packet.ip.flags.moreFragments) flagByte |= 0x20;
  bytes.push(flagByte | ((packet.ip.fragmentOffset >> 8) & 0x1f));
  bytes.push(packet.ip.fragmentOffset & 0xff);
  bytes.push(packet.ip.ttl);
  bytes.push(packet.ip.protocol);
  const cksum = parseInt(packet.ip.headerChecksum.replace("0x", ""), 16) || 0;
  bytes.push((cksum >> 8) & 0xff, cksum & 0xff);
  const srcParts = packet.ip.srcIp.split(".").map(Number);
  const dstParts = packet.ip.dstIp.split(".").map(Number);
  bytes.push(...srcParts, ...dstParts);
  regions.push({ start: ipStart, end: bytes.length, layer: "ip", label: "IP" });

  // TCP or UDP header
  const transportStart = bytes.length;
  if (packet.tcp) {
    const t = packet.tcp;
    bytes.push((t.srcPort >> 8) & 0xff, t.srcPort & 0xff);
    bytes.push((t.dstPort >> 8) & 0xff, t.dstPort & 0xff);
    bytes.push((t.sequenceNumber >> 24) & 0xff, (t.sequenceNumber >> 16) & 0xff, (t.sequenceNumber >> 8) & 0xff, t.sequenceNumber & 0xff);
    bytes.push((t.ackNumber >> 24) & 0xff, (t.ackNumber >> 16) & 0xff, (t.ackNumber >> 8) & 0xff, t.ackNumber & 0xff);
    let flagsByte = 0;
    if (t.flags.urg) flagsByte |= 0x20;
    if (t.flags.ack) flagsByte |= 0x10;
    if (t.flags.psh) flagsByte |= 0x08;
    if (t.flags.rst) flagsByte |= 0x04;
    if (t.flags.syn) flagsByte |= 0x02;
    if (t.flags.fin) flagsByte |= 0x01;
    bytes.push((t.dataOffset << 4) | (t.reserved & 0x0f));
    bytes.push(flagsByte);
    bytes.push((t.windowSize >> 8) & 0xff, t.windowSize & 0xff);
    const tcpCk = parseInt(t.checksum.replace("0x", ""), 16) || 0;
    bytes.push((tcpCk >> 8) & 0xff, tcpCk & 0xff);
    bytes.push((t.urgentPointer >> 8) & 0xff, t.urgentPointer & 0xff);
    regions.push({ start: transportStart, end: bytes.length, layer: "tcp", label: "TCP" });
  } else if (packet.udp) {
    const u = packet.udp;
    bytes.push((u.srcPort >> 8) & 0xff, u.srcPort & 0xff);
    bytes.push((u.dstPort >> 8) & 0xff, u.dstPort & 0xff);
    bytes.push((u.length >> 8) & 0xff, u.length & 0xff);
    const udpCk = parseInt(u.checksum.replace("0x", ""), 16) || 0;
    bytes.push((udpCk >> 8) & 0xff, udpCk & 0xff);
    regions.push({ start: transportStart, end: bytes.length, layer: "udp", label: "UDP" });
  }

  // Payload
  if (packet.payload.data) {
    const payloadStart = bytes.length;
    const hexStr = packet.payload.data.replace(/\s/g, "");
    for (let i = 0; i < hexStr.length - 1; i += 2) {
      bytes.push(parseInt(hexStr.substring(i, i + 2), 16) || 0);
    }
    if (bytes.length > payloadStart) {
      regions.push({ start: payloadStart, end: bytes.length, layer: "payload", label: "Payload" });
    }
  }

  return { bytes, regions };
}

function getLayerForByte(index: number, regions: ByteRegion[]): LayerKey | null {
  for (const r of regions) {
    if (index >= r.start && index < r.end) return r.layer;
  }
  return null;
}

const layerColors: Record<LayerKey, { bg: string; text: string }> = {
  ethernet: { bg: "rgba(255,214,0,0.12)", text: "#ffd600" },
  ip: { bg: "rgba(0,184,255,0.12)", text: "#00b8ff" },
  tcp: { bg: "rgba(0,255,159,0.12)", text: "#00ff9f" },
  udp: { bg: "rgba(255,214,0,0.12)", text: "#ffd600" },
  payload: { bg: "rgba(255,107,0,0.12)", text: "#ff6b00" },
};

export function HexViewer({ packet }: Props) {
  const [hoveredByte, setHoveredByte] = useState<number | null>(null);
  const [hoveredLayer, setHoveredLayer] = useState<LayerKey | null>(null);

  const { bytes, regions } = useMemo(() => hexFromPacket(packet), [packet]);

  const rows = useMemo(() => {
    const result: number[][] = [];
    for (let i = 0; i < bytes.length; i += BYTES_PER_ROW) {
      result.push(bytes.slice(i, i + BYTES_PER_ROW));
    }
    return result;
  }, [bytes]);

  return (
    <div
      style={{
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: "12px",
        fontWeight: 500,
        overflow: "auto",
      }}
    >
      {/* Layer legend */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "10px", flexWrap: "wrap" }}>
        {regions.map((r, i) => (
          <span
            key={i}
            onMouseEnter={() => setHoveredLayer(r.layer)}
            onMouseLeave={() => setHoveredLayer(null)}
            style={{
              padding: "2px 8px",
              borderRadius: "3px",
              backgroundColor: layerColors[r.layer].bg,
              color: layerColors[r.layer].text,
              fontSize: "10px",
              fontWeight: 600,
              cursor: "pointer",
              border: hoveredLayer === r.layer ? `1px solid ${layerColors[r.layer].text}` : "1px solid transparent",
            }}
          >
            {r.label} ({r.end - r.start}B)
          </span>
        ))}
      </div>

      {/* Hex + ASCII grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
        {rows.map((row, rowIdx) => {
          const offset = rowIdx * BYTES_PER_ROW;
          return (
            <div key={rowIdx} style={{ display: "flex", alignItems: "center" }}>
              {/* Offset */}
              <span style={{ width: "50px", color: "var(--text-faint)", flexShrink: 0, fontSize: "10px", fontWeight: 600 }}>
                {offset.toString(16).padStart(4, "0")}
              </span>

              {/* Hex bytes */}
              <div style={{ display: "flex", gap: "1px", flexShrink: 0 }}>
                {row.map((byte, i) => {
                  const globalIdx = offset + i;
                  const layer = getLayerForByte(globalIdx, regions);
                  const isHighlighted =
                    hoveredByte === globalIdx ||
                    (hoveredLayer !== null && layer === hoveredLayer);

                  return (
                    <span
                      key={i}
                      onMouseEnter={() => {
                        setHoveredByte(globalIdx);
                        if (layer) setHoveredLayer(layer);
                      }}
                      onMouseLeave={() => {
                        setHoveredByte(null);
                        setHoveredLayer(null);
                      }}
                      style={{
                        width: "22px",
                        textAlign: "center",
                        padding: "2px 0",
                        borderRadius: "2px",
                        backgroundColor: isHighlighted && layer
                          ? layerColors[layer].bg
                          : "transparent",
                        color: layer
                          ? layerColors[layer].text
                          : "var(--text-muted)",
                        cursor: "crosshair",
                        marginRight: i === 7 ? "6px" : "0",
                      }}
                    >
                      {byte.toString(16).padStart(2, "0")}
                    </span>
                  );
                })}
                {/* Pad if last row is short */}
                {row.length < BYTES_PER_ROW &&
                  Array.from({ length: BYTES_PER_ROW - row.length }).map((_, i) => (
                    <span key={`pad-${i}`} style={{ width: "22px", marginRight: (row.length + i) === 7 ? "6px" : "0" }} />
                  ))}
              </div>

              {/* Separator */}
              <span style={{ width: "16px", flexShrink: 0, color: "var(--text-faint)", textAlign: "center" }}>|</span>

              {/* ASCII */}
              <div style={{ display: "flex" }}>
                {row.map((byte, i) => {
                  const globalIdx = offset + i;
                  const layer = getLayerForByte(globalIdx, regions);
                  const isHighlighted =
                    hoveredByte === globalIdx ||
                    (hoveredLayer !== null && layer === hoveredLayer);
                  const ch = byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".";

                  return (
                    <span
                      key={i}
                      style={{
                        width: "9px",
                        textAlign: "center",
                        color: isHighlighted && layer ? layerColors[layer].text : "var(--text-dim)",
                        backgroundColor: isHighlighted && layer ? layerColors[layer].bg : "transparent",
                        borderRadius: "1px",
                      }}
                    >
                      {ch}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Byte info on hover */}
      {hoveredByte !== null && (
        <div style={{ marginTop: "8px", fontSize: "10px", fontWeight: 600, color: "var(--text-secondary)", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "6px" }}>
          Offset: 0x{hoveredByte.toString(16).padStart(4, "0")} | Byte: 0x{bytes[hoveredByte]?.toString(16).padStart(2, "0")} ({bytes[hoveredByte]}) | Layer: {getLayerForByte(hoveredByte, regions) || "unknown"}
        </div>
      )}
    </div>
  );
}
