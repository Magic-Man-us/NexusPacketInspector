import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { usePacketStore } from "../../hooks/usePacketStore";
import { PROTOCOL_COLORS } from "../../styles/theme";
import { HexViewer } from "./HexViewer";

type SidebarTab = "packets" | "hexdump";
type SnapCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const SNAP_MARGIN = 16;
const SNAP_THRESHOLD = 80;
const DETACHED_WIDTH = 380;
const DETACHED_HEIGHT_VH = 50;

function getCornerPos(corner: SnapCorner, panelW: number, panelH: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  switch (corner) {
    case "top-left":
      return { x: SNAP_MARGIN, y: SNAP_MARGIN };
    case "top-right":
      return { x: vw - panelW - SNAP_MARGIN, y: SNAP_MARGIN };
    case "bottom-left":
      return { x: SNAP_MARGIN, y: vh - panelH - SNAP_MARGIN };
    case "bottom-right":
      return { x: vw - panelW - SNAP_MARGIN, y: vh - panelH - SNAP_MARGIN };
  }
}

function findNearestCorner(
  x: number,
  y: number,
  panelW: number,
  panelH: number
): SnapCorner | null {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const corners: { corner: SnapCorner; cx: number; cy: number }[] = [
    { corner: "top-left", cx: SNAP_MARGIN, cy: SNAP_MARGIN },
    { corner: "top-right", cx: vw - panelW - SNAP_MARGIN, cy: SNAP_MARGIN },
    { corner: "bottom-left", cx: SNAP_MARGIN, cy: vh - panelH - SNAP_MARGIN },
    { corner: "bottom-right", cx: vw - panelW - SNAP_MARGIN, cy: vh - panelH - SNAP_MARGIN },
  ];
  for (const c of corners) {
    if (Math.sqrt((x - c.cx) ** 2 + (y - c.cy) ** 2) < SNAP_THRESHOLD) return c.corner;
  }
  return null;
}

export function PacketSidebar() {
  const packets = usePacketStore((s) => s.packets);
  const selectedPacket = usePacketStore((s) => s.selectedPacket);
  const setSelectedPacket = usePacketStore((s) => s.setSelectedPacket);
  const activeView = usePacketStore((s) => s.activeView);
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>("packets");
  const [splitView, setSplitView] = useState(false);
  const [detached, setDetached] = useState(false);
  const [edgeExpanded, setEdgeExpanded] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const recentPackets = useMemo(() => packets.slice(-100), [packets]);

  // Don't show on plugins
  if (activeView === "plugins") return null;

  const hexPacket = selectedPacket || (packets.length > 0 ? packets[packets.length - 1] : null);

  // --- Edge hover handlers ---
  const handleEdgeEnter = () => {
    if (collapsed && !detached) {
      setCollapsed(false);
      setEdgeExpanded(true);
    }
  };

  const handleSidebarLeave = () => {
    if (edgeExpanded && !detached) {
      setCollapsed(true);
      setEdgeExpanded(false);
    }
  };

  const handleManualToggle = () => {
    setEdgeExpanded(false);
    setCollapsed(!collapsed);
  };

  // --- Detach / dock ---
  const handleDetach = () => {
    setDetached(true);
    setCollapsed(false);
    setEdgeExpanded(false);
    // Default to bottom-left
    const panelH = window.innerHeight * (DETACHED_HEIGHT_VH / 100);
    setPos(getCornerPos("bottom-left", DETACHED_WIDTH, panelH));
  };

  const handleDock = () => {
    setDetached(false);
    setPos(null);
  };

  // --- Drag logic (viewport-based fixed positioning) ---
  const onDragStart = useCallback((e: React.MouseEvent) => {
    if (!panelRef.current) return;
    e.preventDefault();
    const rect = panelRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragging(true);

    const panelW = rect.width;
    const panelH = rect.height;

    const onMove = (ev: MouseEvent) => {
      const newX = ev.clientX - dragOffset.current.x;
      const newY = ev.clientY - dragOffset.current.y;
      setPos({
        x: Math.max(0, Math.min(newX, window.innerWidth - panelW)),
        y: Math.max(0, Math.min(newY, window.innerHeight - panelH)),
      });
    };

    const onUp = (ev: MouseEvent) => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setDragging(false);

      const finalX = ev.clientX - dragOffset.current.x;
      const finalY = ev.clientY - dragOffset.current.y;
      const snap = findNearestCorner(finalX, finalY, panelW, panelH);
      if (snap) {
        setPos(getCornerPos(snap, panelW, panelH));
      }
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  // --- Shared content ---
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

  const tabBar = (
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
  );

  const contentArea = (
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
  );

  // ==================== DETACHED MODE ====================
  if (detached) {
    const panelH = window.innerHeight * (DETACHED_HEIGHT_VH / 100);
    return (
      <>
        {/* Placeholder so layout doesn't shift */}
        <div style={{ width: 0, flexShrink: 0 }} />

        {/* Fixed floating panel */}
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            left: pos?.x ?? SNAP_MARGIN,
            top: pos?.y ?? (window.innerHeight - panelH - SNAP_MARGIN),
            width: DETACHED_WIDTH,
            height: `${DETACHED_HEIGHT_VH}vh`,
            backgroundColor: "rgba(10,15,10,0.95)",
            border: "1px solid rgba(0,255,159,0.25)",
            borderRadius: "8px",
            zIndex: 9000,
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            backdropFilter: "blur(12px)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            userSelect: dragging ? "none" : "auto",
          }}
        >
          {/* Title bar / drag handle */}
          <div
            onMouseDown={onDragStart}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 10px",
              borderBottom: "1px solid rgba(0,255,159,0.15)",
              cursor: dragging ? "grabbing" : "grab",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: "'Orbitron'",
                fontSize: "9px",
                color: "#00ff9f",
                letterSpacing: "1px",
              }}
            >
              SIDEBAR
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handleDock(); }}
              title="Dock sidebar"
              style={titleBarBtnStyle}
            >
              &#8690;
            </button>
          </div>

          {/* Tabs */}
          {tabBar}

          {/* Content */}
          {contentArea}
        </div>
      </>
    );
  }

  // ==================== NORMAL (DOCKED) MODE ====================
  return (
    <>
      {/* Edge trigger zone — only when collapsed */}
      {collapsed && (
        <div
          onMouseEnter={handleEdgeEnter}
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: "8px",
            height: "100vh",
            zIndex: 100,
          }}
        />
      )}

      <div
        onMouseLeave={handleSidebarLeave}
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
        {/* Title bar with toggle + detach */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            borderBottom: "1px solid rgba(0,255,159,0.1)",
          }}
        >
          <button
            onClick={handleManualToggle}
            style={{
              flex: 1,
              padding: "10px",
              border: "none",
              background: "transparent",
              color: "#00ff9f",
              fontFamily: "'Orbitron'",
              fontSize: "10px",
              cursor: "pointer",
              textAlign: "left",
              whiteSpace: "nowrap",
            }}
          >
            {collapsed ? "\u25B6" : "\u25C0 SIDEBAR"}
          </button>
          {!collapsed && (
            <button
              onClick={handleDetach}
              title="Detach sidebar"
              style={{
                ...titleBarBtnStyle,
                marginRight: "8px",
              }}
            >
              &#8689;
            </button>
          )}
        </div>

        {/* Tab bar */}
        {!collapsed && tabBar}

        {/* Content */}
        {!collapsed && contentArea}
      </div>
    </>
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

const titleBarBtnStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid rgba(0,255,159,0.2)",
  borderRadius: "3px",
  color: "#00ff9f",
  fontSize: "12px",
  cursor: "pointer",
  padding: "2px 6px",
  lineHeight: 1,
  opacity: 0.7,
};
