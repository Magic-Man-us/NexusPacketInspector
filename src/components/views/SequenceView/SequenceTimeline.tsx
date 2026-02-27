import React, { useMemo, useState, useEffect, useRef } from "react";
import { styles } from "../../../styles/components";
import { PROTOCOL_COLORS } from "../../../styles/theme";
import { FONT } from "../../../styles/typography";
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
    @keyframes streamDashRight {
      from { stroke-dashoffset: 24; }
      to   { stroke-dashoffset: 0; }
    }
    @keyframes arrowFlow {
      0%   { offset-distance: 0%; opacity: 0; }
      5%   { opacity: 1; }
      95%  { opacity: 1; }
      100% { offset-distance: 100%; opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

let animRefCount = 0;

const MAX_VISIBLE_PACKETS = 100;

export function SequenceTimeline() {
  const streams = usePacketStore((s) => s.streams);
  const setSelectedPacket = usePacketStore((s) => s.setSelectedPacket);
  const sequenceFx = usePacketStore((s) => s.visualEffects.sequenceFx);
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [packetPage, setPacketPage] = useState(0);

  // Reset page when stream changes
  useEffect(() => {
    setPacketPage(0);
  }, [selectedStream]);

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
              <span style={{ color: PROTOCOL_COLORS[stream.protocol], fontSize: FONT.size.lg, fontWeight: FONT.weight.bold }}>
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
          <>
            {streamData.packets.length > MAX_VISIBLE_PACKETS && (() => {
              const totalPackets = streamData.packets.length;
              const totalPages = Math.ceil(totalPackets / MAX_VISIBLE_PACKETS);
              const startIdx = packetPage * MAX_VISIBLE_PACKETS;
              const endIdx = Math.min(startIdx + MAX_VISIBLE_PACKETS, totalPackets);
              return (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
                  padding: "6px 12px", borderBottom: "1px solid rgba(0,255,159,0.15)",
                  backgroundColor: "rgba(0,0,0,0.2)", fontSize: FONT.size.md, flexShrink: 0,
                }}>
                  <button
                    onClick={() => setPacketPage((p) => Math.max(0, p - 1))}
                    disabled={packetPage === 0}
                    style={{
                      background: "none", border: "1px solid rgba(0,255,159,0.3)", borderRadius: "3px",
                      color: packetPage === 0 ? "var(--text-faint)" : "#00ff9f", cursor: packetPage === 0 ? "default" : "pointer",
                      padding: "2px 8px", fontSize: FONT.size.sm, fontFamily: FONT.family.display,
                    }}
                  >
                    PREV
                  </button>
                  <span style={{ color: "var(--text-secondary)", fontFamily: "monospace" }}>
                    Packets {startIdx + 1}&ndash;{endIdx} of {totalPackets}
                  </span>
                  <button
                    onClick={() => setPacketPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={packetPage >= totalPages - 1}
                    style={{
                      background: "none", border: "1px solid rgba(0,255,159,0.3)", borderRadius: "3px",
                      color: packetPage >= totalPages - 1 ? "var(--text-faint)" : "#00ff9f",
                      cursor: packetPage >= totalPages - 1 ? "default" : "pointer",
                      padding: "2px 8px", fontSize: FONT.size.sm, fontFamily: FONT.family.display,
                    }}
                  >
                    NEXT
                  </button>
                </div>
              );
            })()}
            <FlowDiagram
              stream={{
                ...streamData,
                packets: streamData.packets.slice(
                  packetPage * MAX_VISIBLE_PACKETS,
                  (packetPage + 1) * MAX_VISIBLE_PACKETS
                ),
              }}
              onSelectPacket={setSelectedPacket}
              sequenceFx={sequenceFx}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Flow Diagram ──────────────────────────────────────────────────────────

interface FlowDiagramProps {
  stream: StreamData;
  onSelectPacket: (packet: StreamData["packets"][number]) => void;
  sequenceFx: "river" | "arrows";
}

const ROW_HEIGHT = 52;
const LINE_Y_OFFSET = ROW_HEIGHT / 2;
const SVG_WIDTH = 720;

function FlowDiagram({ stream, onSelectPacket, sequenceFx }: FlowDiagramProps) {
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
            <span style={{ color: "var(--text-muted)", fontSize: FONT.size.base }}>:{stream.srcPort}</span>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ width: dimensions.w - lineXDst, textAlign: "center" }}>
          <div style={endpointBoxStyle(stream.color)}>
            {stream.dstIP}
            <span style={{ color: "var(--text-muted)", fontSize: FONT.size.base }}>:{stream.dstPort}</span>
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
            const pathD = `M ${x1} ${y} L ${x2} ${y}`;
            const dashAnim = "streamDashRight";
            const pulseAnim = "flowPulseRight";
            const stagger = (i * 0.25) % 1.6;

            const sz = Math.max(40, Math.min(pkt.length, 1500));
            const scale = 0.4 + 0.6 * (Math.log(sz) - Math.log(40)) / (Math.log(1500) - Math.log(40));
            const arrowSize = 5 + 5 * scale;
            const arrowHalf = 3 + 4 * scale;

            if (sequenceFx === "arrows") {
              // ── Arrows mode: single glowing line + N flowing chevrons ──
              const lineOpacity = 0.3 + 0.4 * scale;
              const chevronCount = Math.max(1, Math.round(pkt.length / 200));
              const chevronSize = 5 + 3 * scale;
              const rowStagger = (i * 0.3) % 3;

              return (
                <g key={i}>
                  {/* Single glowing line */}
                  <line
                    x1={x1} y1={y} x2={x2} y2={y}
                    stroke={stream.color}
                    strokeOpacity={lineOpacity}
                    strokeWidth={1.5}
                    filter="url(#streamGlow)"
                  />

                  {/* Static arrowhead at destination */}
                  {isForward ? (
                    <polygon
                      points={`${x2},${y} ${x2 - arrowSize},${y - arrowHalf} ${x2 - arrowSize},${y + arrowHalf}`}
                      fill={stream.color}
                      opacity="0.85"
                      filter="url(#pulseGlow)"
                    />
                  ) : (
                    <polygon
                      points={`${x2},${y} ${x2 + arrowSize},${y - arrowHalf} ${x2 + arrowSize},${y + arrowHalf}`}
                      fill={stream.color}
                      opacity="0.85"
                      filter="url(#pulseGlow)"
                    />
                  )}

                  {/* N flowing chevron arrows */}
                  {Array.from({ length: chevronCount }, (_, j) => {
                    const delay = (j / chevronCount) * 3 + rowStagger;
                    const cs = chevronSize;
                    return (
                      <polygon
                        key={j}
                        points={`${-cs},${-cs * 0.5} 0,0 ${-cs},${cs * 0.5}`}
                        fill={stream.color}
                        filter="url(#pulseGlow)"
                        opacity="0"
                        style={{
                          offsetPath: `path("${pathD}")`,
                          animation: `arrowFlow 3s linear infinite`,
                          animationDelay: `${delay}s`,
                        } as React.CSSProperties}
                      />
                    );
                  })}
                </g>
              );
            }

            // ── River mode (default): full 9-element SVG ──
            const riverWidth = 1 + 2.5 * scale;
            const coreWidth = 0.5 + 1 * scale;
            const gradWidth = 1.5 + 2.5 * scale;
            const leadR = 2 + 3 * scale;
            const colorR = 1.5 + 3 * scale;
            const glowR = 5 + 10 * scale;
            const wave2LeadR = 1.5 + 2 * scale;
            const wave2ColorR = 1 + 2 * scale;
            const wave2GlowR = 3 + 8 * scale;

            return (
              <g key={i}>
                <line
                  x1={x1} y1={y} x2={x2} y2={y}
                  stroke={stream.color}
                  strokeOpacity="0.08"
                  strokeWidth="1"
                />
                <path
                  d={pathD}
                  stroke={stream.color}
                  strokeWidth={riverWidth}
                  strokeOpacity={0.2 + 0.25 * scale}
                  strokeDasharray="12 12"
                  fill="none"
                  filter="url(#streamGlow)"
                  style={{
                    animation: `${dashAnim} 0.6s linear infinite`,
                  } as React.CSSProperties}
                />
                <path
                  d={pathD}
                  stroke={stream.color}
                  strokeWidth={coreWidth}
                  strokeOpacity={0.3 + 0.4 * scale}
                  strokeDasharray="4 20"
                  fill="none"
                  style={{
                    animation: `${dashAnim} 0.4s linear infinite`,
                  } as React.CSSProperties}
                />
                <path
                  d={pathD}
                  stroke={isForward ? "url(#flowGradRight)" : "url(#flowGradLeft)"}
                  strokeWidth={gradWidth}
                  fill="none"
                  strokeOpacity="0.25"
                />
                {isForward ? (
                  <polygon
                    points={`${x2},${y} ${x2 - arrowSize},${y - arrowHalf} ${x2 - arrowSize},${y + arrowHalf}`}
                    fill={stream.color}
                    opacity="0.85"
                    filter="url(#pulseGlow)"
                  />
                ) : (
                  <polygon
                    points={`${x2},${y} ${x2 + arrowSize},${y - arrowHalf} ${x2 + arrowSize},${y + arrowHalf}`}
                    fill={stream.color}
                    opacity="0.85"
                    filter="url(#pulseGlow)"
                  />
                )}
                <circle
                  r={leadR}
                  fill="#fff"
                  filter="url(#leadGlow)"
                  opacity="0"
                  style={{
                    offsetPath: `path("${pathD}")`,
                    animation: `${pulseAnim} 1.6s ease-in-out infinite`,
                    animationDelay: `${stagger}s`,
                  } as React.CSSProperties}
                />
                <circle
                  r={colorR}
                  fill={stream.color}
                  filter="url(#pulseGlow)"
                  opacity="0"
                  style={{
                    offsetPath: `path("${pathD}")`,
                    animation: `${pulseAnim} 1.6s ease-in-out infinite`,
                    animationDelay: `${stagger + 0.04}s`,
                  } as React.CSSProperties}
                />
                <circle
                  r={glowR}
                  fill={stream.color}
                  opacity="0"
                  style={{
                    offsetPath: `path("${pathD}")`,
                    animation: `${pulseAnim} 1.6s ease-in-out infinite`,
                    animationDelay: `${stagger + 0.1}s`,
                    filter: "blur(8px)",
                  } as React.CSSProperties}
                />
                <circle
                  r={wave2LeadR}
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
                  r={wave2ColorR}
                  fill={stream.color}
                  opacity="0"
                  style={{
                    offsetPath: `path("${pathD}")`,
                    animation: `${pulseAnim} 1.6s ease-in-out infinite`,
                    animationDelay: `${stagger + 0.84}s`,
                  } as React.CSSProperties}
                />
                <circle
                  r={wave2GlowR}
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
                  gap: "10px",
                  fontSize: FONT.size.lg,
                  fontWeight: FONT.weight.bold,
                  pointerEvents: "none",
                  textShadow: seqTextShadow,
                }}
              >
                {flags && (
                  <span style={{ color: "var(--accent)", fontWeight: FONT.weight.black, fontFamily: FONT.family.display, letterSpacing: FONT.spacing.normal }}>
                    {flags}
                  </span>
                )}
                <span style={{ color: "var(--text-primary)", fontFamily: FONT.family.mono }}>{pkt.length}B</span>
                {isForward ? (
                  <span style={{ color: "var(--text-secondary)", fontSize: FONT.size.xl }}>&rarr;</span>
                ) : (
                  <span style={{ color: "var(--text-secondary)", fontSize: FONT.size.xl }}>&larr;</span>
                )}
              </div>

              {/* Info (far right) */}
              <div style={infoCellStyle}>
                {pkt.tcp && (
                  <span style={{ color: "var(--text-secondary)" }}>
                    Seq {pkt.tcp.sequenceNumber % 10000}
                  </span>
                )}
                {pkt.tcp && pkt.tcp.ackNumber > 0 && (
                  <span style={{ color: "var(--text-muted)", marginLeft: "8px" }}>
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
    backgroundColor: "var(--bg-surface)",
    textAlign: "center",
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    fontFamily: FONT.family.mono,
    color: "var(--text-primary)",
    textShadow: seqTextShadow,
  };
}

const seqTextShadow = "0 0 4px var(--bg-primary), 0 0 8px var(--bg-primary), 0 1px 2px var(--bg-primary)";

const timeCellStyle: React.CSSProperties = {
  position: "absolute",
  left: "8px",
  fontSize: FONT.size.base,
  fontWeight: FONT.weight.bold,
  color: "var(--text-secondary)",
  fontFamily: FONT.family.mono,
  whiteSpace: "nowrap",
  textShadow: seqTextShadow,
};

const infoCellStyle: React.CSSProperties = {
  position: "absolute",
  right: "8px",
  fontSize: FONT.size.base,
  fontWeight: FONT.weight.bold,
  fontFamily: FONT.family.mono,
  whiteSpace: "nowrap",
  textAlign: "right",
  textShadow: seqTextShadow,
};
