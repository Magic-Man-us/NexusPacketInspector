import { useState, useRef, useCallback, useEffect } from "react";
import { usePacketStore } from "../../../hooks/usePacketStore";
import { styles } from "../../../styles/components";
import { PROTOCOL_COLORS, LAYER_COLORS } from "../../../styles/theme";
import { FONT } from "../../../styles/typography";
import { FieldEncyclopediaPanel } from "./FieldEncyclopediaPanel";
import { getFieldByteRange } from "../../../lib/fieldByteOffsets";

interface FieldDef {
  name: string;
  value: string | number;
  bits: number;
  desc: string;
  isFlag?: boolean;
  active?: boolean;
}

export interface ActiveField extends FieldDef {
  layer: string;
}

export interface PopoverAnchor {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export function PacketStructure() {
  const packet = usePacketStore((s) => s.selectedPacket);
  const setHighlightedByteRange = usePacketStore((s) => s.setHighlightedByteRange);
  const [hoveredField, setHoveredField] = useState<ActiveField | null>(null);
  const [anchor, setAnchor] = useState<PopoverAnchor | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      setHoveredField(null);
      setAnchor(null);
      setHighlightedByteRange(null);
    }, 100);
  }, [cancelClose, setHighlightedByteRange]);

  const handleFieldHover = useCallback((field: FieldDef, layer: string, fieldIndex: number, e: React.MouseEvent) => {
    cancelClose();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setAnchor({ top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height });
    setHoveredField({ ...field, layer });

    const hasTcp = !!packet?.tcp;
    const range = getFieldByteRange(layer, fieldIndex, hasTcp);
    if (range) {
      setHighlightedByteRange({ start: range.byteStart, end: range.byteEnd });
    } else {
      setHighlightedByteRange(null);
    }
  }, [cancelClose, packet, setHighlightedByteRange]);

  const handlePopoverEnter = useCallback(() => {
    cancelClose();
  }, [cancelClose]);

  const handlePopoverLeave = useCallback(() => {
    scheduleClose();
  }, [scheduleClose]);

  if (!packet) {
    return (
      <div style={styles.structureContainer}>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>{"\u2B22"}</div>
          <div>Select a packet to view structure</div>
          <div style={styles.emptySubtext}>Click any packet in the list</div>
        </div>
      </div>
    );
  }

  const ethernetFields: FieldDef[] = [
    { name: "Dest MAC", value: packet.ethernet.destMac, bits: 48, desc: "Destination MAC address" },
    { name: "Src MAC", value: packet.ethernet.srcMac, bits: 48, desc: "Source MAC address" },
    { name: "EtherType", value: `0x${packet.ethernet.etherType}`, bits: 16, desc: "Protocol type (0x0800 = IPv4)" },
  ];

  const ipFields: FieldDef[] = [
    { name: "Ver", value: packet.ip.version, bits: 4, desc: "IP Version (4 = IPv4)" },
    { name: "IHL", value: packet.ip.ihl, bits: 4, desc: "Internet Header Length (in 32-bit words)" },
    { name: "DSCP", value: packet.ip.dscp, bits: 6, desc: "Differentiated Services Code Point" },
    { name: "ECN", value: packet.ip.ecn, bits: 2, desc: "Explicit Congestion Notification" },
    { name: "Total Length", value: packet.ip.totalLength, bits: 16, desc: "Total packet length in bytes" },
    { name: "Identification", value: `0x${packet.ip.identification}`, bits: 16, desc: "Fragment identification" },
    {
      name: "Flags",
      value: `${packet.ip.flags.dontFragment ? "DF" : ""} ${packet.ip.flags.moreFragments ? "MF" : ""}`.trim() || "-",
      bits: 3,
      desc: "DF=Don't Fragment, MF=More Fragments",
    },
    { name: "Frag Offset", value: packet.ip.fragmentOffset, bits: 13, desc: "Fragment offset (in 8-byte units)" },
    { name: "TTL", value: packet.ip.ttl, bits: 8, desc: "Time To Live (hop limit)" },
    { name: "Protocol", value: packet.ip.protocol, bits: 8, desc: "Next protocol (6=TCP, 17=UDP)" },
    { name: "Checksum", value: `0x${packet.ip.headerChecksum}`, bits: 16, desc: "Header checksum" },
    { name: "Source IP", value: packet.ip.srcIp, bits: 32, desc: "Source IP address" },
    { name: "Dest IP", value: packet.ip.dstIp, bits: 32, desc: "Destination IP address" },
  ];

  const tcpFields: FieldDef[] = packet.tcp
    ? [
        { name: "Src Port", value: packet.tcp.srcPort, bits: 16, desc: "Source port number" },
        { name: "Dst Port", value: packet.tcp.dstPort, bits: 16, desc: "Destination port number" },
        { name: "Sequence", value: packet.tcp.sequenceNumber, bits: 32, desc: "Sequence number" },
        { name: "ACK Number", value: packet.tcp.ackNumber, bits: 32, desc: "Acknowledgment number" },
        { name: "Offset", value: packet.tcp.dataOffset, bits: 4, desc: "Data offset (header length in 32-bit words)" },
        { name: "Reserved", value: packet.tcp.reserved, bits: 3, desc: "Reserved bits" },
        { name: "URG", value: packet.tcp.flags.urg ? "1" : "0", bits: 1, desc: "Urgent pointer valid", isFlag: true, active: packet.tcp.flags.urg },
        { name: "ACK", value: packet.tcp.flags.ack ? "1" : "0", bits: 1, desc: "Acknowledgment valid", isFlag: true, active: packet.tcp.flags.ack },
        { name: "PSH", value: packet.tcp.flags.psh ? "1" : "0", bits: 1, desc: "Push function", isFlag: true, active: packet.tcp.flags.psh },
        { name: "RST", value: packet.tcp.flags.rst ? "1" : "0", bits: 1, desc: "Reset connection", isFlag: true, active: packet.tcp.flags.rst },
        { name: "SYN", value: packet.tcp.flags.syn ? "1" : "0", bits: 1, desc: "Synchronize sequence numbers", isFlag: true, active: packet.tcp.flags.syn },
        { name: "FIN", value: packet.tcp.flags.fin ? "1" : "0", bits: 1, desc: "No more data", isFlag: true, active: packet.tcp.flags.fin },
        { name: "Window", value: packet.tcp.windowSize, bits: 16, desc: "Receive window size" },
        { name: "Checksum", value: `0x${packet.tcp.checksum}`, bits: 16, desc: "TCP checksum" },
        { name: "Urg Ptr", value: packet.tcp.urgentPointer, bits: 16, desc: "Urgent pointer offset" },
      ]
    : [];

  const udpFields: FieldDef[] = packet.udp
    ? [
        { name: "Src Port", value: packet.udp.srcPort, bits: 16, desc: "Source port number" },
        { name: "Dst Port", value: packet.udp.dstPort, bits: 16, desc: "Destination port number" },
        { name: "Length", value: packet.udp.length, bits: 16, desc: "Total UDP length (header + data)" },
        { name: "Checksum", value: `0x${packet.udp.checksum}`, bits: 16, desc: "UDP checksum" },
      ]
    : [];

  const payloadFields: FieldDef[] = [
    { name: "Data", value: `${packet.payload.length} bytes`, bits: packet.payload.length * 8, desc: packet.payload.preview },
  ];

  const renderFieldBlock = (field: FieldDef, layer: string, index: number) => {
    const colors = LAYER_COLORS[layer as keyof typeof LAYER_COLORS];
    const minWidth = Math.max(60, (field.bits / 32) * 280);
    const isHovered = hoveredField?.name === field.name && hoveredField?.layer === layer;

    return (
      <div
        key={`${layer}-${index}`}
        onMouseEnter={(e) => handleFieldHover(field, layer, index, e)}
        onMouseLeave={scheduleClose}
        style={{
          minWidth: `${minWidth}px`,
          flex: field.bits >= 32 ? "1 1 100%" : `0 0 ${minWidth}px`,
          padding: "8px 10px",
          backgroundColor: isHovered ? colors.border : colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: "4px",
          cursor: "pointer",
          transition: "all 0.15s ease",
          transform: isHovered ? "translateY(-2px)" : "none",
          boxShadow: isHovered ? `0 4px 12px ${colors.border}40` : "none",
          position: "relative" as const,
          overflow: "hidden" as const,
        }}
      >
        {field.isFlag && (
          <div
            style={{
              position: "absolute" as const,
              top: 0,
              right: 0,
              width: "8px",
              height: "8px",
              backgroundColor: field.active ? "#00ff9f" : "var(--bg-secondary)",
              borderRadius: "0 4px 0 4px",
            }}
          />
        )}
        <div
          style={{
            fontSize: FONT.size.xs,
            color: isHovered ? "#000" : colors.text,
            fontFamily: FONT.family.display,
            fontWeight: FONT.weight.bold,
            marginBottom: "4px",
            textTransform: "uppercase" as const,
            letterSpacing: FONT.spacing.normal,
          }}
        >
          {field.name}
        </div>
        <div
          style={{
            fontSize: FONT.size.base,
            color: isHovered ? "#000" : "#fff",
            fontFamily: "'JetBrains Mono', monospace",
            wordBreak: "break-all" as const,
          }}
        >
          {String(field.value)}
        </div>
        <div
          style={{
            fontSize: FONT.size.xxs,
            color: isHovered ? "var(--text-faint)" : "var(--text-dim)",
            marginTop: "4px",
          }}
        >
          {field.bits} bits
        </div>
      </div>
    );
  };

  const renderLayer = (name: string, fields: FieldDef[], layer: string, icon: string) => {
    const colors = LAYER_COLORS[layer as keyof typeof LAYER_COLORS];
    return (
      <div
        style={{
          marginBottom: "16px",
          border: `1px solid ${colors.border}30`,
          borderRadius: "8px",
          overflow: "hidden" as const,
        }}
      >
        <div
          style={{
            padding: "10px 14px",
            backgroundColor: colors.bg,
            borderBottom: `1px solid ${colors.border}30`,
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span style={{ fontSize: FONT.size["2xl"] }}>{icon}</span>
          <span
            style={{
              fontFamily: FONT.family.display,
              fontSize: FONT.size.base,
              fontWeight: FONT.weight.bold,
              color: colors.text,
              letterSpacing: FONT.spacing.wide,
            }}
          >
            {name}
          </span>
          <span
            style={{
              fontSize: FONT.size.sm,
              color: "var(--text-muted)",
              marginLeft: "auto",
            }}
          >
            {fields.reduce((sum, f) => sum + f.bits, 0)} bits
          </span>
        </div>
        <div
          style={{
            padding: "10px",
            display: "flex",
            flexWrap: "wrap" as const,
            gap: "6px",
          }}
        >
          {fields.map((field, i) => renderFieldBlock(field, layer, i))}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.structureContainer}>
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Main structure view */}
        <div style={{ flex: 1, overflowY: "auto" as const, padding: "20px" }}>
          {/* Packet summary */}
          <div
            style={{
              marginBottom: "20px",
              padding: "14px",
              backgroundColor: "rgba(0,255,159,0.05)",
              border: "1px solid rgba(0,255,159,0.2)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "20px",
            }}
          >
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: FONT.size.md }}>PACKET </span>
              <span
                style={{
                  color: "#00ff9f",
                  fontFamily: FONT.family.display,
                  fontWeight: FONT.weight.bold,
                }}
              >
                #{packet.id}
              </span>
            </div>
            <div style={{ width: "1px", height: "24px", backgroundColor: "rgba(255,255,255,0.1)" }} />
            <div>
              <span style={{ color: PROTOCOL_COLORS[packet.protocol], fontWeight: FONT.weight.bold }}>
                {packet.protocol}
              </span>
            </div>
            <div style={{ width: "1px", height: "24px", backgroundColor: "rgba(255,255,255,0.1)" }} />
            <div style={{ fontFamily: FONT.family.mono, fontSize: FONT.size.base, color: "var(--text-secondary)" }}>
              {packet.ip.srcIp}:{packet.srcPort} {"\u2192"} {packet.ip.dstIp}:{packet.dstPort}
            </div>
            <div style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: FONT.size.base }}>
              {packet.length} bytes
            </div>
          </div>

          {/* Layer visualizations */}
          {renderLayer("ETHERNET FRAME (Layer 2)", ethernetFields, "ethernet", "\u2B21")}
          {renderLayer("IP HEADER (Layer 3)", ipFields, "ip", "\u25C8")}
          {packet.tcp && renderLayer("TCP HEADER (Layer 4)", tcpFields, "tcp", "\u2B22")}
          {packet.udp && renderLayer("UDP HEADER (Layer 4)", udpFields, "udp", "\u2B21")}
          {renderLayer("PAYLOAD (Layer 5-7)", payloadFields, "payload", "\u25A3")}
        </div>
      </div>

      <FieldEncyclopediaPanel
        field={hoveredField}
        anchor={anchor}
        onMouseEnter={handlePopoverEnter}
        onMouseLeave={handlePopoverLeave}
      />
    </div>
  );
}
