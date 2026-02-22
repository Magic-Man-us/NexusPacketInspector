import { useState, useRef, useCallback, useEffect, ReactNode } from "react";

type SnapCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

interface Props {
  children: ReactNode;
  defaultCorner?: SnapCorner;
  title?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  width?: number;
}

const SNAP_MARGIN = 16;
const SNAP_THRESHOLD = 80;

function getCornerPosition(
  corner: SnapCorner,
  container: DOMRect,
  panelW: number,
  panelH: number
) {
  switch (corner) {
    case "top-left":
      return { x: SNAP_MARGIN, y: SNAP_MARGIN };
    case "top-right":
      return { x: container.width - panelW - SNAP_MARGIN, y: SNAP_MARGIN };
    case "bottom-left":
      return {
        x: SNAP_MARGIN,
        y: container.height - panelH - SNAP_MARGIN,
      };
    case "bottom-right":
      return {
        x: container.width - panelW - SNAP_MARGIN,
        y: container.height - panelH - SNAP_MARGIN,
      };
  }
}

function findNearestCorner(
  x: number,
  y: number,
  container: DOMRect,
  panelW: number,
  panelH: number
): SnapCorner | null {
  const corners: { corner: SnapCorner; cx: number; cy: number }[] = [
    { corner: "top-left", cx: SNAP_MARGIN, cy: SNAP_MARGIN },
    {
      corner: "top-right",
      cx: container.width - panelW - SNAP_MARGIN,
      cy: SNAP_MARGIN,
    },
    {
      corner: "bottom-left",
      cx: SNAP_MARGIN,
      cy: container.height - panelH - SNAP_MARGIN,
    },
    {
      corner: "bottom-right",
      cx: container.width - panelW - SNAP_MARGIN,
      cy: container.height - panelH - SNAP_MARGIN,
    },
  ];

  for (const c of corners) {
    const dist = Math.sqrt((x - c.cx) ** 2 + (y - c.cy) ** 2);
    if (dist < SNAP_THRESHOLD) return c.corner;
  }
  return null;
}

export function DraggablePanel({
  children,
  defaultCorner = "bottom-left",
  title,
  collapsible = true,
  defaultCollapsed = false,
  width = 180,
}: Props) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Initialize position once mounted
  useEffect(() => {
    if (!panelRef.current) return;
    const parent = panelRef.current.parentElement;
    if (!parent) return;
    const container = parent.getBoundingClientRect();
    const rect = panelRef.current.getBoundingClientRect();
    const p = getCornerPosition(defaultCorner, container, rect.width, rect.height);
    setPos(p);
  }, [defaultCorner]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!panelRef.current) return;
      e.preventDefault();
      const rect = panelRef.current.getBoundingClientRect();
      const parent = panelRef.current.parentElement!.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      setDragging(true);

      const onMove = (ev: MouseEvent) => {
        const newX = ev.clientX - parent.left - dragOffset.current.x;
        const newY = ev.clientY - parent.top - dragOffset.current.y;
        setPos({
          x: Math.max(0, Math.min(newX, parent.width - rect.width)),
          y: Math.max(0, Math.min(newY, parent.height - rect.height)),
        });
      };

      const onUp = (ev: MouseEvent) => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        setDragging(false);

        if (!panelRef.current) return;
        const panelRect = panelRef.current.getBoundingClientRect();
        const parentRect =
          panelRef.current.parentElement!.getBoundingClientRect();
        const finalX = ev.clientX - parentRect.left - dragOffset.current.x;
        const finalY = ev.clientY - parentRect.top - dragOffset.current.y;

        const snap = findNearestCorner(
          finalX,
          finalY,
          parentRect,
          panelRect.width,
          panelRect.height
        );
        if (snap) {
          const p = getCornerPosition(
            snap,
            parentRect,
            panelRect.width,
            panelRect.height
          );
          setPos(p);
        }
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    []
  );

  return (
    <div
      ref={panelRef}
      style={{
        position: "absolute",
        left: pos?.x ?? 0,
        top: pos?.y ?? 0,
        width: collapsed ? "auto" : width,
        backgroundColor: "var(--header-bg)",
        border: "1px solid rgba(var(--accent-rgb),0.2)",
        borderRadius: "6px",
        zIndex: 50,
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        cursor: dragging ? "grabbing" : "default",
        userSelect: "none",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Drag handle / title bar */}
      <div
        onMouseDown={onMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 10px",
          borderBottom: collapsed
            ? "none"
            : "1px solid rgba(var(--accent-rgb),0.15)",
          cursor: dragging ? "grabbing" : "grab",
        }}
      >
        <span
          style={{
            fontFamily: "'Orbitron'",
            fontSize: "8px",
            color: "var(--accent)",
            letterSpacing: "1px",
          }}
        >
          {title || "PANEL"}
        </span>
        {collapsible && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(!collapsed);
            }}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              fontSize: "10px",
              cursor: "pointer",
              padding: "0 4px",
              lineHeight: 1,
            }}
          >
            {collapsed ? "+" : "\u2212"}
          </button>
        )}
      </div>

      {/* Content */}
      {!collapsed && (
        <div style={{ padding: "8px 10px" }}>{children}</div>
      )}
    </div>
  );
}
