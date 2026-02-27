import { useState } from "react";
import { usePacketStore } from "../../hooks/usePacketStore";
import { HexViewer } from "./HexViewer";
import { PROTOCOL_COLORS } from "../../styles/theme";
import { FONT } from "../../styles/typography";

const MIN_HEIGHT = 120;
const DEFAULT_HEIGHT = 180;
const MAX_HEIGHT = 400;

export function HexStrip() {
  const packets = usePacketStore((s) => s.packets);
  const selectedPackets = usePacketStore((s) => s.selectedPackets);
  const highlightedByteRange = usePacketStore((s) => s.highlightedByteRange);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [dragging, setDragging] = useState(false);

  const onResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = height;
    setDragging(true);

    const onMove = (ev: MouseEvent) => {
      const delta = startY - ev.clientY;
      setHeight(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startH + delta)));
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setDragging(false);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const displayPackets =
    selectedPackets.length > 0
      ? selectedPackets
      : packets.length > 0
      ? [packets[packets.length - 1]]
      : [];

  const multiMode = displayPackets.length > 1;

  return (
    <div
      style={{
        height,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderTop: "1px solid var(--border-strong)",
        backgroundColor: "var(--bg-console)",
        userSelect: dragging ? "none" : "auto",
      }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={onResizeStart}
        style={{
          height: "6px",
          cursor: "ns-resize",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "40px",
            height: "2px",
            borderRadius: "1px",
            backgroundColor: "var(--border-strong)",
          }}
        />
      </div>

      {/* Header */}
      <div
        style={{
          padding: "4px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span
          style={{
            fontFamily: FONT.family.display,
            fontSize: FONT.size.sm,
            fontWeight: FONT.weight.heavy,
            color: "var(--accent)",
            letterSpacing: FONT.spacing.wide,
          }}
        >
          HEX DUMP{multiMode ? ` (${displayPackets.length})` : ""}
        </span>
        {!multiMode && displayPackets.length === 1 && (
          <div style={{ display: "flex", gap: "10px", fontSize: FONT.size.md, fontFamily: FONT.family.mono }}>
            <span style={{ color: "var(--accent)" }}>#{displayPackets[0].id} {displayPackets[0].protocol}</span>
            <span style={{ color: "var(--text-secondary)" }}>{displayPackets[0].length} B</span>
            <span style={{ color: "var(--text-muted)" }}>
              {displayPackets[0].ip.srcIp} → {displayPackets[0].ip.dstIp}
            </span>
          </div>
        )}
        {multiMode && (
          <span style={{ fontSize: FONT.size.xs, color: "var(--text-muted)", fontFamily: FONT.family.display }}>
            Ctrl+Click to select multiple
          </span>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {displayPackets.length === 0 ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-faint)", fontSize: FONT.size.base }}>
            No packets
          </div>
        ) : (
          displayPackets.map((pkt, idx) => {
            const protoColor = PROTOCOL_COLORS[pkt.protocol] || "#666";
            return (
              <div
                key={pkt.id}
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  borderLeft: idx > 0 ? `2px solid ${protoColor}40` : "none",
                  overflow: "hidden",
                }}
              >
                {multiMode && (
                  <div
                    style={{
                      padding: "3px 8px",
                      borderBottom: "1px solid rgba(var(--accent-rgb),0.08)",
                      fontSize: FONT.size.sm,
                      fontFamily: FONT.family.mono,
                      display: "flex",
                      gap: "8px",
                      flexShrink: 0,
                      backgroundColor: `${protoColor}08`,
                    }}
                  >
                    <span style={{ color: protoColor, fontWeight: FONT.weight.bold }}>#{pkt.id} {pkt.protocol}</span>
                    <span style={{ color: "var(--text-secondary)" }}>{pkt.length} B</span>
                    <span style={{ color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {pkt.ip.srcIp} → {pkt.ip.dstIp}
                    </span>
                  </div>
                )}
                <div style={{ flex: 1, overflow: "auto", padding: "4px 8px", minHeight: 0 }}>
                  <HexViewer
                    packet={pkt}
                    highlightedByteRange={
                      selectedPackets.length <= 1 ? highlightedByteRange : undefined
                    }
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
