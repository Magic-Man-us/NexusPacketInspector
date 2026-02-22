import { useState, useMemo } from "react";
import { usePacketStore } from "../../hooks/usePacketStore";
import { PROTOCOL_COLORS } from "../../styles/theme";

export function PacketSidebar() {
  const packets = usePacketStore((s) => s.packets);
  const selectedPacket = usePacketStore((s) => s.selectedPacket);
  const setSelectedPacket = usePacketStore((s) => s.setSelectedPacket);
  const activeView = usePacketStore((s) => s.activeView);
  const [collapsed, setCollapsed] = useState(false);
  const recentPackets = useMemo(() => packets.slice(-100), [packets]);

  // Don't show on plugins
  if (activeView === "plugins") return null;

  return (
    <div
      style={{
        width: collapsed ? "36px" : "260px",
        borderRight: "1px solid rgba(0,255,159,0.1)",
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
        {collapsed ? "\u25B6" : "\u25C0 PACKETS"}
      </button>

      {/* Mini packet list */}
      {!collapsed && (
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {recentPackets.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedPacket(p)}
              style={{
                padding: "5px 8px",
                borderBottom: "1px solid rgba(255,255,255,0.02)",
                cursor: "pointer",
                backgroundColor:
                  selectedPacket?.id === p.id
                    ? "rgba(0,255,159,0.1)"
                    : "transparent",
                display: "flex",
                gap: "6px",
                alignItems: "center",
                fontSize: "9px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: PROTOCOL_COLORS[p.protocol] || "#666",
                  flexShrink: 0,
                }}
              />
              <span style={{ color: "#888", width: "28px", flexShrink: 0 }}>
                #{p.id}
              </span>
              <span
                style={{
                  color: PROTOCOL_COLORS[p.protocol] || "#666",
                  width: "36px",
                  flexShrink: 0,
                }}
              >
                {p.protocol}
              </span>
              <span
                style={{
                  color: "#555",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontFamily: "'Share Tech Mono', monospace",
                }}
              >
                {p.ip.srcIp} \u2192 {p.ip.dstIp}
              </span>
            </div>
          ))}
          {recentPackets.length === 0 && (
            <div
              style={{
                padding: "16px",
                textAlign: "center",
                color: "#444",
                fontSize: "10px",
              }}
            >
              No packets
            </div>
          )}
        </div>
      )}
    </div>
  );
}
