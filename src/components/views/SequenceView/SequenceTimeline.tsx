import React, { useMemo, useState, useEffect, useRef } from "react";
import { styles } from "../../../styles/components";
import { PROTOCOL_COLORS } from "../../../styles/theme";
import { usePacketStore } from "../../../hooks/usePacketStore";
import { EmptyState } from "../../shared/EmptyState";
import { formatTCPFlags } from "../../../lib/formatters";
import type { StreamData } from "../../../types/stream";
// Inject keyframe animations once
const ANIM_STYLE_ID = "seq-flow-pulse-anim";
function ensureAnimStyles() {
  if (document.getElementById(ANIM_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = ANIM_STYLE_ID;
  style.textContent = `
    @keyframes flowPulseRight {
      0%   { offset-distance: 0%; opacity: 0; }
      8%   { opacity: 1; }
      92%  { opacity: 1; }
      100% { offset-distance: 100%; opacity: 0; }
    }
    @keyframes flowPulseLeft {
      0%   { offset-distance: 100%; opacity: 0; }
      8%   { opacity: 1; }
      92%  { opacity: 1; }
      100% { offset-distance: 0%; opacity: 0; }
    }
    @keyframes streamDashRight {
      from { stroke-dashoffset: 24; }
      to   { stroke-dashoffset: 0; }
    }
    @keyframes streamDashLeft {
      from { stroke-dashoffset: 0; }
      to   { stroke-dashoffset: 24; }
    }
  `;
  document.head.appendChild(style);
}

let animRefCount = 0;

export function SequenceTimeline() {
  const streams = usePacketStore((s) => s.streams);
  const setSelectedPacket = usePacketStore((s) => s.setSelectedPacket);
  const [selectedStream, setSelectedStream] = useState<string | null>(null);

  useEffect(() => {
    animRefCount++;
    ensureAnimStyles();
    return () => {
      animRefCount--;
      if (animRefCount === 0) {
        document.getElementById(ANIM_STYLE_ID)?.remove();
      }
    };
  }, []);

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
          backgroundColor: "var(--bg-primary)",
          borderBottom: "1px solid rgba(0,255,159,0.15)",
          display: "flex",
          padding: "12px 0",
        }}
      >
        <div style={{ width: lineXSrc, textAlign: "center" }}>
          <div style={endpointBoxStyle(stream.color)}>
            {stream.srcIP}
            <span style={{ color: "var(--text-muted)", fontSize: "9px" }}>:{stream.srcPort}</span>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ width: dimensions.w - lineXDst, textAlign: "center" }}>
          <div style={endpointBoxStyle(stream.color)}>
            {stream.dstIP}
            <span style={{ color: "var(--text-muted)", fontSize: "9px" }}>:{stream.dstPort}</span>
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
            {/* Gradient for forward (left→right) lines */}
            <linearGradient id="flowGradRight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={stream.color} stopOpacity="0.8" />
              <stop offset="50%" stopColor={stream.color} stopOpacity="0.5" />
              <stop offset="100%" stopColor={stream.color} stopOpacity="0.15" />
            </linearGradient>
            {/* Gradient for reverse (right→left) lines */}
            <linearGradient id="flowGradLeft" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor={stream.color} stopOpacity="0.8" />
              <stop offset="50%" stopColor={stream.color} stopOpacity="0.5" />
              <stop offset="100%" stopColor={stream.color} stopOpacity="0.15" />
            </linearGradient>
            {/* Tight glow for bright pulse particles */}
            <filter id="pulseGlow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Wide soft glow for the stream trail */}
            <filter id="streamGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Extra-wide halo for lead pulses */}
            <filter id="leadGlow">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="blur" in2="blur" operator="over" />
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
            const pathD = `M ${x1} ${y} L ${x2} ${y}`;
            const dashAnim = isForward ? "streamDashRight" : "streamDashLeft";
            const pulseAnim = isForward ? "flowPulseRight" : "flowPulseLeft";
            // Stagger each row so streams feel organic
            const stagger = (i * 0.25) % 1.6;

            return (
              <g key={i}>
                {/* 1) Dim base line — always visible */}
                <line
                  x1={x1} y1={y} x2={x2} y2={y}
                  stroke={stream.color}
                  strokeOpacity="0.08"
                  strokeWidth="1"
                />

                {/* 2) Glowing streaming "river" — animated dashes flowing in direction */}
                <path
                  d={pathD}
                  stroke={stream.color}
                  strokeWidth="2"
                  strokeOpacity="0.35"
                  strokeDasharray="12 12"
                  fill="none"
                  filter="url(#streamGlow)"
                  style={{
                    animation: `${dashAnim} 0.6s linear infinite`,
                  } as React.CSSProperties}
                />

                {/* 3) Brighter thin core stream — tighter dashes, faster */}
                <path
                  d={pathD}
                  stroke={stream.color}
                  strokeWidth="1"
                  strokeOpacity="0.6"
                  strokeDasharray="4 20"
                  fill="none"
                  style={{
                    animation: `${dashAnim} 0.4s linear infinite`,
                  } as React.CSSProperties}
                />

                {/* 4) Gradient overlay line for directionality fade */}
                <path
                  d={pathD}
                  stroke={isForward ? "url(#flowGradRight)" : "url(#flowGradLeft)"}
                  strokeWidth="2.5"
                  fill="none"
                  strokeOpacity="0.25"
                />

                {/* 5) Arrowhead */}
                {isForward ? (
                  <polygon
                    points={`${x2},${y} ${x2 - arrowSize},${y - 5} ${x2 - arrowSize},${y + 5}`}
                    fill={stream.color}
                    opacity="0.85"
                    filter="url(#pulseGlow)"
                  />
                ) : (
                  <polygon
                    points={`${x2},${y} ${x2 + arrowSize},${y - 5} ${x2 + arrowSize},${y + 5}`}
                    fill={stream.color}
                    opacity="0.85"
                    filter="url(#pulseGlow)"
                  />
                )}

                {/* 6) Lead pulse — bright dot traveling the line */}
                <circle
                  r="3.5"
                  fill="#fff"
                  filter="url(#leadGlow)"
                  opacity="0"
                  style={{
                    offsetPath: `path("${pathD}")`,
                    animation: `${pulseAnim} 1.6s ease-in-out infinite`,
                    animationDelay: `${stagger}s`,
                  } as React.CSSProperties}
                />

                {/* 7) Core colored pulse — slightly behind the white lead */}
                <circle
                  r="3"
                  fill={stream.color}
                  filter="url(#pulseGlow)"
                  opacity="0"
                  style={{
                    offsetPath: `path("${pathD}")`,
                    animation: `${pulseAnim} 1.6s ease-in-out infinite`,
                    animationDelay: `${stagger + 0.04}s`,
                  } as React.CSSProperties}
                />

                {/* 8) Wide trailing glow behind the pulse */}
                <circle
                  r="10"
                  fill={stream.color}
                  opacity="0"
                  style={{
                    offsetPath: `path("${pathD}")`,
                    animation: `${pulseAnim} 1.6s ease-in-out infinite`,
                    animationDelay: `${stagger + 0.1}s`,
                    filter: "blur(8px)",
                  } as React.CSSProperties}
                />

                {/* 9) Second pulse wave — offset by half period for continuous stream feel */}
                <circle
                  r="2.5"
                  fill="#fff"
                  filter="url(#pulseGlow)"
                  opacity="0"
                  style={{
                    offsetPath: `path("${pathD}")`,
                    animation: `${pulseAnim} 1.6s ease-in-out infinite`,
                    animationDelay: `${stagger + 0.8}s`,
                  } as React.CSSProperties}
                />
                <circle
                  r="2"
                  fill={stream.color}
                  opacity="0"
                  style={{
                    offsetPath: `path("${pathD}")`,
                    animation: `${pulseAnim} 1.6s ease-in-out infinite`,
                    animationDelay: `${stagger + 0.84}s`,
                  } as React.CSSProperties}
                />
                <circle
                  r="7"
                  fill={stream.color}
                  opacity="0"
                  style={{
                    offsetPath: `path("${pathD}")`,
                    animation: `${pulseAnim} 1.6s ease-in-out infinite`,
                    animationDelay: `${stagger + 0.9}s`,
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
                <span style={{ color: "var(--text-secondary)" }}>{pkt.length}B</span>
                {isForward ? (
                  <span style={{ color: "var(--text-faint)", fontSize: "10px" }}>&rarr;</span>
                ) : (
                  <span style={{ color: "var(--text-faint)", fontSize: "10px" }}>&larr;</span>
                )}
              </div>

              {/* Info (far right) */}
              <div style={infoCellStyle}>
                {pkt.tcp && (
                  <span style={{ color: "var(--text-dim)" }}>
                    Seq {pkt.tcp.sequenceNumber % 10000}
                  </span>
                )}
                {pkt.tcp && pkt.tcp.ackNumber > 0 && (
                  <span style={{ color: "var(--text-faint)", marginLeft: "6px" }}>
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
  color: "var(--text-muted)",
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
