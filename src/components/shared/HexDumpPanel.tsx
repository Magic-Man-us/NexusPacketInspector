import { useState } from "react";
import { usePacketStore } from "../../hooks/usePacketStore";
import { HexViewer } from "./HexViewer";

export function HexDumpPanel() {
  const packets = usePacketStore((s) => s.packets);
  const selectedPacket = usePacketStore((s) => s.selectedPacket);
  const setSelectedPacket = usePacketStore((s) => s.setSelectedPacket);
  const activeView = usePacketStore((s) => s.activeView);
  const [collapsed, setCollapsed] = useState(true);

  // Don't show on plugins
  if (activeView === "plugins") return null;

  // Use selected packet, or fall back to latest
  const packet = selectedPacket || (packets.length > 0 ? packets[packets.length - 1] : null);

  return (
    <div
      style={{
        width: collapsed ? "36px" : "360px",
        borderLeft: "1px solid rgba(0,255,159,0.1)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        transition: "width 0.2s ease",
        overflow: "hidden",
        backgroundColor: "rgba(0,0,0,0.15)",
      }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          padding: "10px",
          border: "none",
          borderBottom: "1px solid rgba(0,255,159,0.1)",
          background: "transparent",
          color: "#00ff9f",
          fontFamily: "'Orbitron'",
          fontSize: "10px",
          cursor: "pointer",
          textAlign: "left",
          whiteSpace: "nowrap",
        }}
      >
        {collapsed ? "\u25C0" : "\u25B6 HEX DUMP"}
      </button>

      {/* Panel content */}
      {!collapsed && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {packet ? (
            <>
              {/* Packet info bar */}
              <div
                style={{
                  padding: "8px 12px",
                  backgroundColor: "rgba(0,0,0,0.2)",
                  borderBottom: "1px solid rgba(0,255,159,0.05)",
                  fontSize: "9px",
                  fontFamily: "monospace",
                  display: "flex",
                  flexDirection: "column",
                  gap: "3px",
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#00ff9f" }}>#{packet.id} {packet.protocol}</span>
                  <span style={{ color: "#666" }}>{packet.length} B</span>
                </div>
                <div>
                  <span style={{ color: "#00b8ff" }}>{packet.ip.srcIp}</span>
                  <span style={{ color: "#444" }}> → </span>
                  <span style={{ color: "#ff6b00" }}>{packet.ip.dstIp}</span>
                </div>
              </div>

              {/* Nav buttons */}
              <div
                style={{
                  padding: "6px 12px",
                  borderBottom: "1px solid rgba(0,255,159,0.05)",
                  display: "flex",
                  gap: "4px",
                  flexShrink: 0,
                }}
              >
                <button
                  onClick={() => {
                    const idx = packets.findIndex((p) => p.id === packet.id);
                    if (idx > 0) setSelectedPacket(packets[idx - 1]);
                  }}
                  style={navBtnStyle}
                >
                  PREV
                </button>
                <button
                  onClick={() => {
                    const idx = packets.findIndex((p) => p.id === packet.id);
                    if (idx < packets.length - 1) setSelectedPacket(packets[idx + 1]);
                  }}
                  style={navBtnStyle}
                >
                  NEXT
                </button>
                <button
                  onClick={() => {
                    if (packets.length > 0) setSelectedPacket(packets[packets.length - 1]);
                  }}
                  style={{
                    ...navBtnStyle,
                    border: "1px solid rgba(0,255,159,0.3)",
                    background: "rgba(0,255,159,0.05)",
                    color: "#00ff9f",
                  }}
                >
                  LATEST
                </button>
              </div>

              {/* Hex viewer */}
              <div style={{ flex: 1, overflow: "auto", padding: "8px", minHeight: 0 }}>
                <HexViewer packet={packet} />
              </div>
            </>
          ) : (
            <div
              style={{
                padding: "16px",
                textAlign: "center",
                color: "#444",
                fontSize: "10px",
              }}
            >
              No packet selected
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  padding: "3px 8px",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "3px",
  background: "transparent",
  color: "#666",
  fontSize: "9px",
  cursor: "pointer",
  fontFamily: "'Orbitron'",
};
