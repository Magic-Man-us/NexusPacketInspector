import { usePacketStore } from "../../../hooks/usePacketStore";
import { HexViewer } from "../../shared/HexViewer";
import { EmptyState } from "../../shared/EmptyState";

export function HexDumpView() {
  const selectedPacket = usePacketStore((s) => s.selectedPacket);
  const packets = usePacketStore((s) => s.packets);
  const setSelectedPacket = usePacketStore((s) => s.setSelectedPacket);

  // Use the selected packet, or the latest one
  const packet = selectedPacket || (packets.length > 0 ? packets[packets.length - 1] : null);

  if (!packet) {
    return (
      <EmptyState
        icon="&#x2B21;"
        message="No packet data to display"
        subtext="Start capture or select a packet to view hex dump"
      />
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      {/* Header with packet selector */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid rgba(0,255,159,0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              fontFamily: "'Orbitron'",
              fontSize: "12px",
              color: "#00ff9f",
              letterSpacing: "1px",
            }}
          >
            HEX DUMP
          </span>
          <span style={{ fontSize: "10px", color: "#666" }}>
            Packet #{packet.id} | {packet.protocol} | {packet.length} bytes
          </span>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            onClick={() => {
              const idx = packets.findIndex((p) => p.id === packet.id);
              if (idx > 0) setSelectedPacket(packets[idx - 1]);
            }}
            style={{
              padding: "4px 10px",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "3px",
              background: "transparent",
              color: "#666",
              fontSize: "9px",
              cursor: "pointer",
            }}
          >
            PREV
          </button>
          <button
            onClick={() => {
              const idx = packets.findIndex((p) => p.id === packet.id);
              if (idx < packets.length - 1) setSelectedPacket(packets[idx + 1]);
            }}
            style={{
              padding: "4px 10px",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "3px",
              background: "transparent",
              color: "#666",
              fontSize: "9px",
              cursor: "pointer",
            }}
          >
            NEXT
          </button>
          <button
            onClick={() => {
              if (packets.length > 0) setSelectedPacket(packets[packets.length - 1]);
            }}
            style={{
              padding: "4px 10px",
              border: "1px solid rgba(0,255,159,0.3)",
              borderRadius: "3px",
              background: "rgba(0,255,159,0.05)",
              color: "#00ff9f",
              fontSize: "9px",
              cursor: "pointer",
            }}
          >
            LATEST
          </button>
        </div>
      </div>

      {/* Packet info bar */}
      <div
        style={{
          padding: "8px 16px",
          backgroundColor: "rgba(0,0,0,0.2)",
          borderBottom: "1px solid rgba(0,255,159,0.05)",
          display: "flex",
          gap: "20px",
          fontSize: "10px",
          fontFamily: "monospace",
          flexShrink: 0,
        }}
      >
        <span>
          <span style={{ color: "#666" }}>SRC: </span>
          <span style={{ color: "#00b8ff" }}>{packet.ip.srcIp}:{packet.srcPort}</span>
        </span>
        <span style={{ color: "#444" }}>&rarr;</span>
        <span>
          <span style={{ color: "#666" }}>DST: </span>
          <span style={{ color: "#ff6b00" }}>{packet.ip.dstIp}:{packet.dstPort}</span>
        </span>
        <span>
          <span style={{ color: "#666" }}>TTL: </span>
          <span style={{ color: "#888" }}>{packet.ip.ttl}</span>
        </span>
        <span>
          <span style={{ color: "#666" }}>TIME: </span>
          <span style={{ color: "#888" }}>{new Date(packet.timestamp).toLocaleTimeString()}</span>
        </span>
      </div>

      {/* Full-size hex viewer */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "16px",
          minHeight: 0,
        }}
      >
        <div style={{ transform: "scale(1.2)", transformOrigin: "top left", width: "83%" }}>
          <HexViewer packet={packet} />
        </div>
      </div>
    </div>
  );
}
