import { useState, useMemo } from "react";
import { usePacketStore } from "../../hooks/usePacketStore";
import { PROTOCOL_COLORS } from "../../styles/theme";
import { HexViewer } from "./HexViewer";

type SidebarTab = "packets" | "hexdump";

export function PacketSidebar() {
  const packets = usePacketStore((s) => s.packets);
  const selectedPacket = usePacketStore((s) => s.selectedPacket);
  const setSelectedPacket = usePacketStore((s) => s.setSelectedPacket);
  const activeView = usePacketStore((s) => s.activeView);
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>("packets");
  const [splitView, setSplitView] = useState(false);
  const recentPackets = useMemo(() => packets.slice(-100), [packets]);

  // Don't show on plugins
  if (activeView === "plugins") return null;

  // Use selected packet, or fall back to latest
  const hexPacket = selectedPacket || (packets.length > 0 ? packets[packets.length - 1] : null);

  const packetListContent = (
    <div style={{ flex: splitView ? "0 0 40%" : 1, overflowY: "auto", minHeight: 0 }}>
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
            {p.ip.srcIp} → {p.ip.dstIp}
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
  );

  const hexDumpContent = (
    <div style={{ flex: splitView ? "0 0 60%" : 1, display: "flex", flexDirection: "column" as const, minHeight: 0, overflow: "hidden" }}>
      {hexPacket ? (
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
              <span style={{ color: "#00ff9f" }}>#{hexPacket.id} {hexPacket.protocol}</span>
              <span style={{ color: "#666" }}>{hexPacket.length} B</span>
            </div>
            <div>
              <span style={{ color: "#00b8ff" }}>{hexPacket.ip.srcIp}</span>
              <span style={{ color: "#444" }}> → </span>
              <span style={{ color: "#ff6b00" }}>{hexPacket.ip.dstIp}</span>
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
                const idx = packets.findIndex((p) => p.id === hexPacket.id);
                if (idx > 0) setSelectedPacket(packets[idx - 1]);
              }}
              style={navBtnStyle}
            >
              PREV
            </button>
            <button
              onClick={() => {
                const idx = packets.findIndex((p) => p.id === hexPacket.id);
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
            <HexViewer packet={hexPacket} />
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
  );

  return (
    <div
      style={{
        width: collapsed ? "36px" : "360px",
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
        {collapsed ? "▶" : "◀ SIDEBAR"}
      </button>

      {/* Tab bar */}
      {!collapsed && (
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid rgba(0,255,159,0.1)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => { setActiveTab("packets"); setSplitView(false); }}
            style={{
              ...tabBtnStyle,
              borderBottom: !splitView && activeTab === "packets" ? "2px solid #00ff9f" : "2px solid transparent",
              color: !splitView && activeTab === "packets" ? "#00ff9f" : "#555",
            }}
          >
            PACKETS
          </button>
          <button
            onClick={() => { setActiveTab("hexdump"); setSplitView(false); }}
            style={{
              ...tabBtnStyle,
              borderBottom: !splitView && activeTab === "hexdump" ? "2px solid #00ff9f" : "2px solid transparent",
              color: !splitView && activeTab === "hexdump" ? "#00ff9f" : "#555",
            }}
          >
            HEX DUMP
          </button>
          <button
            onClick={() => setSplitView(!splitView)}
            style={{
              ...tabBtnStyle,
              borderBottom: splitView ? "2px solid #00ff9f" : "2px solid transparent",
              color: splitView ? "#00ff9f" : "#555",
              marginLeft: "auto",
              fontSize: "8px",
            }}
          >
            SPLIT
          </button>
        </div>
      )}

      {/* Content */}
      {!collapsed && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          {splitView ? (
            <>
              {packetListContent}
              <div style={{ height: "1px", backgroundColor: "rgba(0,255,159,0.15)", flexShrink: 0 }} />
              {hexDumpContent}
            </>
          ) : activeTab === "packets" ? (
            packetListContent
          ) : (
            hexDumpContent
          )}
        </div>
      )}
    </div>
  );
}

const tabBtnStyle: React.CSSProperties = {
  padding: "8px 12px",
  border: "none",
  background: "transparent",
  fontFamily: "'Orbitron'",
  fontSize: "9px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

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
