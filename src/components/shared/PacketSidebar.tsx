import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { usePacketStore } from "../../hooks/usePacketStore";
import { PROTOCOL_COLORS } from "../../styles/theme";
import { FONT } from "../../styles/typography";

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
  const selectedPackets = usePacketStore((s) => s.selectedPackets);
  const setSelectedPacket = usePacketStore((s) => s.setSelectedPacket);
  const toggleSelectedPacket = usePacketStore((s) => s.toggleSelectedPacket);
  const activeView = usePacketStore((s) => s.activeView);
  const [collapsed, setCollapsed] = useState(false);
  const [detached, setDetached] = useState(false);
  const [edgeExpanded, setEdgeExpanded] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const recentPackets = useMemo(() => packets.slice(-100), [packets]);

  useEffect(() => {
    return () => { dragCleanupRef.current?.(); };
  }, []);

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

    const cleanup = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      dragCleanupRef.current = null;
    };

    const onUp = (ev: MouseEvent) => {
      cleanup();
      setDragging(false);

      const finalX = ev.clientX - dragOffset.current.x;
      const finalY = ev.clientY - dragOffset.current.y;
      const snap = findNearestCorner(finalX, finalY, panelW, panelH);
      if (snap) {
        setPos(getCornerPos(snap, panelW, panelH));
      }
    };

    dragCleanupRef.current = cleanup;
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  if (activeView === "plugins") return null;

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

  const handleDetach = () => {
    setDetached(true);
    setCollapsed(false);
    setEdgeExpanded(false);
    const panelH = window.innerHeight * (DETACHED_HEIGHT_VH / 100);
    setPos(getCornerPos("bottom-left", DETACHED_WIDTH, panelH));
  };

  const handleDock = () => {
    setDetached(false);
    setPos(null);
  };

  const packetListContent = (
    <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
      {recentPackets.map((p) => {
        const isMultiSelected = selectedPackets.some((sp) => sp.id === p.id);
        const isSingleSelected = selectedPacket?.id === p.id && selectedPackets.length <= 1;
        return (
        <div
          key={p.id}
          onClick={(e) => {
            if (e.ctrlKey || e.metaKey) {
              toggleSelectedPacket(p);
            } else {
              setSelectedPacket(p);
            }
          }}
          style={{
            padding: "5px 8px",
            borderBottom: "1px solid rgba(255,255,255,0.02)",
            cursor: "pointer",
            backgroundColor:
              isMultiSelected
                ? "rgba(var(--accent-rgb),0.15)"
                : isSingleSelected
                ? "rgba(var(--accent-rgb),0.1)"
                : "transparent",
            display: "flex",
            gap: "6px",
            alignItems: "center",
            fontSize: FONT.size.sm,
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
          <span style={{ color: "var(--text-secondary)", width: "28px", flexShrink: 0 }}>
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
              color: "var(--text-dim)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontFamily: FONT.family.mono,
            }}
          >
            {p.ip.srcIp} → {p.ip.dstIp}
          </span>
        </div>
        );
      })}
      {recentPackets.length === 0 && (
        <div
          style={{
            padding: "16px",
            textAlign: "center",
            color: "var(--text-faint)",
            fontSize: FONT.size.base,
          }}
        >
          No packets
        </div>
      )}
    </div>
  );

  // ==================== DETACHED MODE ====================
  if (detached) {
    const panelH = window.innerHeight * (DETACHED_HEIGHT_VH / 100);
    return (
      <>
        <div style={{ width: 0, flexShrink: 0 }} />

        <div
          ref={panelRef}
          style={{
            position: "fixed",
            left: pos?.x ?? SNAP_MARGIN,
            top: pos?.y ?? (window.innerHeight - panelH - SNAP_MARGIN),
            width: DETACHED_WIDTH,
            height: `${DETACHED_HEIGHT_VH}vh`,
            backgroundColor: "var(--header-bg)",
            border: "1px solid rgba(var(--accent-rgb),0.25)",
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
          <div
            onMouseDown={onDragStart}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 10px",
              borderBottom: "1px solid rgba(var(--accent-rgb),0.15)",
              cursor: dragging ? "grabbing" : "grab",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: FONT.family.display,
                fontSize: FONT.size.sm,
                color: "var(--accent)",
                letterSpacing: FONT.spacing.wide,
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

          {packetListContent}
        </div>
      </>
    );
  }

  // ==================== NORMAL (DOCKED) MODE ====================
  return (
    <>
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
          borderRight: "1px solid rgba(var(--accent-rgb),0.1)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          transition: "width 0.2s ease",
          overflow: "hidden",
          backgroundColor: "var(--bg-secondary)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            borderBottom: "1px solid rgba(var(--accent-rgb),0.1)",
          }}
        >
          <button
            onClick={handleManualToggle}
            style={{
              flex: 1,
              padding: "10px",
              border: "none",
              background: "transparent",
              color: "var(--accent)",
              fontFamily: FONT.family.display,
              fontSize: FONT.size.md,
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

        {!collapsed && packetListContent}
      </div>
    </>
  );
}

const titleBarBtnStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid rgba(var(--accent-rgb),0.2)",
  borderRadius: "3px",
  color: "var(--accent)",
  fontSize: FONT.size.lg,
  cursor: "pointer",
  padding: "2px 6px",
  lineHeight: 1,
  opacity: 0.7,
};
