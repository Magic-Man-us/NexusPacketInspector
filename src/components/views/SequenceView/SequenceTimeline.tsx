import React, { useMemo, useState, useEffect, useRef } from "react";
import { styles } from "../../../styles/components";
import { PROTOCOL_COLORS } from "../../../styles/theme";
import { usePacketStore } from "../../../hooks/usePacketStore";
import { EmptyState } from "../../shared/EmptyState";
import { formatTCPFlags } from "../../../lib/formatters";
import type { StreamData } from "../../../types/stream";
// Inject the keyframe animation once
const ANIM_STYLE_ID = "seq-flow-pulse-anim";
function ensureAnimStyles() {
  if (document.getElementById(ANIM_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = ANIM_STYLE_ID;
  style.textContent = `
    @keyframes flowPulseRight {
      0%   { offset-distance: 0%; opacity: 0; }
      10%  { opacity: 1; }
      90%  { opacity: 1; }
      100% { offset-distance: 100%; opacity: 0; }
    }
    @keyframes flowPulseLeft {
      0%   { offset-distance: 100%; opacity: 0; }
      10%  { opacity: 1; }
      90%  { opacity: 1; }
      100% { offset-distance: 0%; opacity: 0; }
    }
    @keyframes flowGlowRight {
      0%   { cx: 0; opacity: 0; }
      5%   { opacity: 0.8; }
      95%  { opacity: 0.8; }
      100% { cx: 100%; opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

export function SequenceTimeline() {
  const streams = usePacketStore((s) => s.streams);
  const setSelectedPacket = usePacketStore((s) => s.setSelectedPacket);
  const [selectedStream, setSelectedStream] = useState<string | null>(null);

  useEffect(() => { ensureAnimStyles(); }, []);

  const sortedStreams = useMemo(() => {
    return Object.entries(streams)
      .sort((a, b) => b[1].packets.length - a[1].packets.length)
      .slice(0, 20);
  }, [streams]);

  const streamData = selectedStream ? streams[selectedStream] : null;

  return (
    <div style={styles.sequenceContainer}>
      {/* Stream selector panel */}
      <div style={styles.sequenceStreamPanel}>
        <div style={styles.sequencePanelHeader}>
          &#x2195; SELECT STREAM
        </div>
        <div style={styles.sequenceStreamList}>
          {sortedStreams.map(([key, stream]) => (
            <div
              key={key}
              onClick={() => setSelectedStream(key)}
              style={{
                ...styles.sequenceStreamItem,
                borderLeftColor: stream.color,
                backgroundColor:
                  selectedStream === key
                    ? "rgba(0,255,159,0.1)"
                    : "transparent",
              }}
            >
              <span style={{ color: PROTOCOL_COLORS[stream.protocol] }}>
                {stream.protocol}
              </span>
              <span style={styles.sequenceStreamPkts}>
                {stream.packets.length}
              </span>
              <div style={styles.sequenceStreamIPs}>
                {stream.srcIP} &#x2194; {stream.dstIP}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main diagram area */}
      <div style={styles.sequenceMain}>
        {!streamData ? (
          <EmptyState
            icon="&#x2195;"
            message="Select a stream to view sequence"
          />
        ) : (
          <FlowDiagram stream={streamData} onSelectPacket={setSelectedPacket} />
        )}
      </div>
    </div>
  );
}

// ─── Flow Diagram ──────────────────────────────────────────────────────────

interface FlowDiagramProps {
  stream: StreamData;
  onSelectPacket: (packet: StreamData["packets"][number]) => void;
}

const ROW_HEIGHT = 52;
const LINE_X_SRC = 200;
const LINE_X_DST = 520;
const LINE_Y_OFFSET = ROW_HEIGHT / 2;
const SVG_WIDTH = 720;

function FlowDiagram({ stream, onSelectPacket }: FlowDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ w: SVG_WIDTH, h: 600 });

  // Responsive width
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setDimensions((prev) => ({ ...prev, w: e.contentRect.width }));
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const lineXSrc = Math.max(160, dimensions.w * 0.25);
  const lineXDst = Math.min(dimensions.w - 160, dimensions.w * 0.75);
  const svgHeight = stream.packets.length * ROW_HEIGHT + 80;

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        overflowX: "hidden",
        position: "relative",
      }}
    >
      {/* Sticky endpoint headers */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backgroundColor: "#0a0f0a",
          borderBottom: "1px solid rgba(0,255,159,0.15)",
          display: "flex",
          padding: "12px 0",
        }}
      >
        <div style={{ width: lineXSrc, textAlign: "center" }}>
          <div style={endpointBoxStyle(stream.color)}>
            {stream.srcIP}
            <span style={{ color: "#666", fontSize: "9px" }}>:{stream.srcPort}</span>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ width: dimensions.w - lineXDst, textAlign: "center" }}>
          <div style={endpointBoxStyle(stream.color)}>
            {stream.dstIP}
            <span style={{ color: "#666", fontSize: "9px" }}>:{stream.dstPort}</span>
          </div>
        </div>
      </div>

      {/* SVG flow lines + data rows */}
      <div style={{ position: "relative", minHeight: svgHeight }}>
        {/* Lifelines */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: lineXSrc,
            width: "2px",
            background: "rgba(255,255,255,0.06)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: lineXDst,
            width: "2px",
            background: "rgba(255,255,255,0.06)",
            pointerEvents: "none",
          }}
        />

        {/* SVG layer for flow lines + animated pulses */}
        <svg
          width={dimensions.w}
          height={svgHeight}
          style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
        >
          <defs>
            <linearGradient id="flowGradRight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={stream.color} stopOpacity="0.9" />
              <stop offset="100%" stopColor={stream.color} stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="flowGradLeft" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor={stream.color} stopOpacity="0.9" />
              <stop offset="100%" stopColor={stream.color} stopOpacity="0.2" />
            </linearGradient>
            <filter id="pulseGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {stream.packets.map((pkt, i) => {
            const isForward = pkt.ip.srcIp === stream.srcIP;
            const y = i * ROW_HEIGHT + LINE_Y_OFFSET;
            const x1 = isForward ? lineXSrc : lineXDst;
            const x2 = isForward ? lineXDst : lineXSrc;
            const arrowSize = 8;
            const arrowX = isForward ? x2 - arrowSize : x2 + arrowSize;
            const pathId = `flow-path-${i}`;

            return (
              <g key={i}>
                {/* The flow line */}
                <path
                  id={pathId}
                  d={`M ${x1} ${y} L ${x2} ${y}`}
                  stroke={isForward ? "url(#flowGradRight)" : "url(#flowGradLeft)"}
                  strokeWidth="2"
                  fill="none"
                />

                {/* Arrowhead */}
                {isForward ? (
                  <polygon
                    points={`${x2},${y} ${x2 - arrowSize},${y - 4} ${x2 - arrowSize},${y + 4}`}
                    fill={stream.color}
                    opacity="0.8"
                  />
                ) : (
                  <polygon
                    points={`${x2},${y} ${x2 + arrowSize},${y - 4} ${x2 + arrowSize},${y + 4}`}
                    fill={stream.color}
                    opacity="0.8"
                  />
                )}

                {/* Animated pulse traveling along the line */}
                <circle
                  r="4"
                  fill={stream.color}
                  filter="url(#pulseGlow)"
                  opacity="0"
                  style={{
                    offsetPath: `path("M ${x1} ${y} L ${x2} ${y}")`,
                    animation: `${isForward ? "flowPulseRight" : "flowPulseLeft"} 1.8s ease-in-out infinite`,
                    animationDelay: `${(i * 0.3) % 2}s`,
                  } as React.CSSProperties}
                />

                {/* Secondary trailing glow */}
                <circle
                  r="8"
                  fill={stream.color}
                  opacity="0"
                  style={{
                    offsetPath: `path("M ${x1} ${y} L ${x2} ${y}")`,
                    animation: `${isForward ? "flowPulseRight" : "flowPulseLeft"} 1.8s ease-in-out infinite`,
                    animationDelay: `${((i * 0.3) % 2) + 0.08}s`,
                    filter: "blur(6px)",
                  } as React.CSSProperties}
                />
              </g>
            );
          })}
        </svg>

        {/* Data rows overlaid on top of SVG */}
        {stream.packets.map((pkt, i) => {
          const isForward = pkt.ip.srcIp === stream.srcIP;
          const flags = pkt.tcp?.flags ? formatTCPFlags(pkt.tcp.flags) : "";
          const y = i * ROW_HEIGHT;
          const midX = (lineXSrc + lineXDst) / 2;

          return (
            <div
              key={i}
              onClick={() => onSelectPacket(pkt)}
              style={{
                position: "absolute",
                top: y,
                left: 0,
                right: 0,
                height: ROW_HEIGHT,
                display: "flex",
                alignItems: "center",
                borderBottom: "1px solid rgba(255,255,255,0.025)",
                cursor: "pointer",
              }}
            >
              {/* Time (far left) */}
              <div style={timeCellStyle}>
                {new Date(pkt.timestamp).toLocaleTimeString()}
              </div>

              {/* Label above the flow line (centered) */}
              <div
                style={{
                  position: "absolute",
                  left: lineXSrc + 8,
                  right: dimensions.w - lineXDst + 8,
                  top: 4,
                  display: "flex",
                  justifyContent: "center",
                  gap: "8px",
                  fontSize: "9px",
                  pointerEvents: "none",
                }}
              >
                {flags && (
                  <span style={{ color: "#ff6b00", fontWeight: "bold", fontFamily: "'Orbitron'" }}>
                    {flags}
                  </span>
                )}
                <span style={{ color: "#888" }}>{pkt.length}B</span>
                {isForward ? (
                  <span style={{ color: "#444", fontSize: "10px" }}>&rarr;</span>
                ) : (
                  <span style={{ color: "#444", fontSize: "10px" }}>&larr;</span>
                )}
              </div>

              {/* Info (far right) */}
              <div style={infoCellStyle}>
                {pkt.tcp && (
                  <span style={{ color: "#555" }}>
                    Seq {pkt.tcp.sequenceNumber % 10000}
                  </span>
                )}
                {pkt.tcp && pkt.tcp.ackNumber > 0 && (
                  <span style={{ color: "#444", marginLeft: "6px" }}>
                    Ack {pkt.tcp.ackNumber % 10000}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

function endpointBoxStyle(color: string): React.CSSProperties {
  return {
    display: "inline-block",
    padding: "8px 16px",
    border: `2px solid ${color}`,
    borderRadius: "4px",
    backgroundColor: "rgba(0,0,0,0.4)",
    textAlign: "center",
    fontSize: "11px",
    fontFamily: "monospace",
    color: "#e0e0e0",
  };
}

const timeCellStyle: React.CSSProperties = {
  position: "absolute",
  left: "8px",
  fontSize: "9px",
  color: "#666",
  fontFamily: "'Share Tech Mono', monospace",
  whiteSpace: "nowrap",
};

const infoCellStyle: React.CSSProperties = {
  position: "absolute",
  right: "8px",
  fontSize: "9px",
  fontFamily: "'Share Tech Mono', monospace",
  whiteSpace: "nowrap",
  textAlign: "right",
};
