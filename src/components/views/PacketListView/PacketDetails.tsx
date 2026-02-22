import { useState } from "react";
import { usePacketStore } from "../../../hooks/usePacketStore";
import { styles } from "../../../styles/components";
import { PROTOCOL_COLORS } from "../../../styles/theme";
import { formatTCPFlags } from "../../../lib/formatters";
import { HexViewer } from "../../shared/HexViewer";

export function PacketDetails() {
  const packet = usePacketStore((s) => s.selectedPacket);
  const [showHex, setShowHex] = useState(false);

  if (!packet) {
    return (
      <div style={styles.packetDetails}>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>{"\u2B21"}</div>
          <div>Select packet</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.packetDetails}>
      <div style={styles.detailsHeader}>
        <span style={{ color: PROTOCOL_COLORS[packet.protocol] }}>{"\u25CF"}</span> PACKET #
        {packet.id}
      </div>
      <div style={styles.detailsSection}>
        <div style={styles.sectionTitle}>{"\u2B21"} IP</div>
        <div style={styles.detailRow}>
          <span>Source</span>
          <span>{packet.ip.srcIp}</span>
        </div>
        <div style={styles.detailRow}>
          <span>Dest</span>
          <span>{packet.ip.dstIp}</span>
        </div>
        <div style={styles.detailRow}>
          <span>TTL</span>
          <span>{packet.ip.ttl}</span>
        </div>
      </div>
      <div style={styles.detailsSection}>
        <div style={styles.sectionTitle}>{"\u2B21"} {packet.tcp ? "TCP" : "UDP"}</div>
        <div style={styles.detailRow}>
          <span>Src Port</span>
          <span>{packet.srcPort}</span>
        </div>
        <div style={styles.detailRow}>
          <span>Dst Port</span>
          <span>{packet.dstPort}</span>
        </div>
        {packet.tcp && (
          <div style={styles.detailRow}>
            <span>Flags</span>
            <span style={styles.flag}>{formatTCPFlags(packet.tcp.flags)}</span>
          </div>
        )}
      </div>

      {/* Hex viewer toggle */}
      <button
        onClick={() => setShowHex(!showHex)}
        style={{
          width: "100%",
          padding: "6px",
          border: "1px solid rgba(0,255,159,0.2)",
          borderRadius: "4px",
          background: showHex ? "rgba(0,255,159,0.1)" : "transparent",
          color: showHex ? "#00ff9f" : "#666",
          fontFamily: "'Orbitron'",
          fontSize: "9px",
          cursor: "pointer",
          marginBottom: "8px",
        }}
      >
        {showHex ? "HIDE" : "SHOW"} HEX DUMP
      </button>
      {showHex && (
        <div style={{ ...styles.detailsSection, overflow: "auto" }}>
          <HexViewer packet={packet} />
        </div>
      )}
    </div>
  );
}
