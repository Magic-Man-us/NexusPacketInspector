import React, { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import { usePacketStore } from "../../../hooks/usePacketStore";
import { useContainerSize } from "../../../hooks/useContainerSize";
import { PROTOCOL_COLORS } from "../../../styles/theme";
import { FONT } from "../../../styles/typography";
import { formatBytes, PORT_SERVICE_NAMES } from "../../../lib/formatters";

const widgetStyle: React.CSSProperties = {
  backgroundColor: "rgba(0,255,159,0.03)",
  border: "1px solid rgba(0,255,159,0.15)",
  borderRadius: "6px",
  padding: "14px",
  minHeight: "200px",
  display: "flex",
  flexDirection: "column",
};

const widgetTitle: React.CSSProperties = {
  fontFamily: FONT.family.display,
  fontSize: FONT.size.md,
  color: "#00ff9f",
  marginBottom: "12px",
  letterSpacing: FONT.spacing.wide,
};

// ─────────────────────────────────────────────────────────────────────────────
// Widget 1: Protocol Distribution Donut
// ─────────────────────────────────────────────────────────────────────────────
function ProtocolDonut() {
  const protocols = usePacketStore((s) => s.stats.protocols);
  const svgRef = useRef<SVGSVGElement>(null);

  const data = useMemo(() => {
    return Object.entries(protocols)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [protocols]);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;
    const size = 160;
    const radius = size / 2;
    const inner = radius * 0.55;

    d3.select(svgRef.current).selectAll("*").remove();
    const svg = d3
      .select(svgRef.current)
      .attr("width", size)
      .attr("height", size);
    const g = svg.append("g").attr("transform", `translate(${radius},${radius})`);

    const pie = d3.pie<[string, number]>().value((d) => d[1]).sort(null);
    const arc = d3.arc<d3.PieArcDatum<[string, number]>>().innerRadius(inner).outerRadius(radius - 4);

    g.selectAll("path")
      .data(pie(data))
      .join("path")
      .attr("d", arc)
      .attr("fill", (d) => PROTOCOL_COLORS[d.data[0]] || "var(--text-faint)")
      .attr("stroke", "#0a0f0a")
      .attr("stroke-width", 1.5);

    const total = data.reduce((a, b) => a + b[1], 0);
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-4px")
      .attr("fill", "#00ff9f")
      .attr("font-family", FONT.family.display)
      .attr("font-size", FONT.size["2xl"])
      .text(total.toLocaleString());
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "12px")
      .attr("fill", "var(--text-muted)")
      .attr("font-size", FONT.size.xs)
      .text("PACKETS");
  }, [data]);

  return (
    <div style={widgetStyle}>
      <div style={widgetTitle}>PROTOCOL DISTRIBUTION</div>
      <div style={{ display: "flex", gap: "12px", flex: 1, alignItems: "center" }}>
        <svg ref={svgRef} />
        <div style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: FONT.size.sm }}>
          {data.map(([name, count]) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "2px", backgroundColor: PROTOCOL_COLORS[name] || "var(--text-faint)", flexShrink: 0 }} />
              <span style={{ color: "var(--text-secondary)" }}>{name}</span>
              <span style={{ color: "var(--text-dim)", marginLeft: "auto" }}>{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Widget 2: Packet Size Histogram
// ─────────────────────────────────────────────────────────────────────────────
function SizeHistogram() {
  const packetSizes = usePacketStore((s) => s.dashboardStats.packetSizes);

  const bins = useMemo(() => {
    const maxSize = 1500;
    const binCount = 10;
    const binSize = maxSize / binCount;
    const counts = new Array(binCount).fill(0);
    packetSizes.forEach((s) => {
      const idx = Math.min(Math.floor(s / binSize), binCount - 1);
      counts[idx]++;
    });
    const max = Math.max(...counts, 1);
    return counts.map((c, i) => ({
      label: `${i * (maxSize / binCount)}-${(i + 1) * (maxSize / binCount)}`,
      count: c,
      pct: c / max,
    }));
  }, [packetSizes]);

  return (
    <div style={widgetStyle}>
      <div style={widgetTitle}>PACKET SIZE DISTRIBUTION</div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: "2px" }}>
        {bins.map((bin, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "60px", fontSize: FONT.size.xs, color: "var(--text-dim)", textAlign: "right", fontFamily: FONT.family.mono }}>
              {bin.label}
            </span>
            <div style={{ flex: 1, height: "12px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "2px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${bin.pct * 100}%`,
                  height: "100%",
                  backgroundColor: "#00ff9f",
                  borderRadius: "2px",
                  transition: "width 0.3s",
                }}
              />
            </div>
            <span style={{ width: "30px", fontSize: FONT.size.sm, color: "var(--text-muted)", textAlign: "right" }}>{bin.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Widget 3: Packets/Second Timeline Sparkline
// ─────────────────────────────────────────────────────────────────────────────
function PacketsTimeline() {
  const timestamps = usePacketStore((s) => s.dashboardStats.timestamps);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { width: containerWidth } = useContainerSize(containerRef);

  const ppsData = useMemo(() => {
    if (timestamps.length < 2) return [];
    const now = timestamps[timestamps.length - 1];
    const buckets = new Array(30).fill(0);
    timestamps.forEach((t) => {
      const secAgo = Math.floor((now - t) / 1000);
      if (secAgo >= 0 && secAgo < 30) {
        buckets[29 - secAgo]++;
      }
    });
    return buckets;
  }, [timestamps]);

  useEffect(() => {
    if (!svgRef.current || containerWidth === 0 || ppsData.length === 0) return;
    const w = containerWidth;
    const h = 120;

    d3.select(svgRef.current).selectAll("*").remove();
    const svg = d3.select(svgRef.current).attr("width", w).attr("height", h);

    const xScale = d3.scaleLinear().domain([0, ppsData.length - 1]).range([0, w]);
    const yScale = d3.scaleLinear().domain([0, Math.max(...ppsData, 1)]).range([h - 10, 10]);

    const area = d3.area<number>()
      .x((_, i) => xScale(i))
      .y0(h - 10)
      .y1((d) => yScale(d))
      .curve(d3.curveMonotoneX);

    const line = d3.line<number>()
      .x((_, i) => xScale(i))
      .y((d) => yScale(d))
      .curve(d3.curveMonotoneX);

    svg.append("path")
      .datum(ppsData)
      .attr("d", area)
      .attr("fill", "rgba(0,255,159,0.1)");

    svg.append("path")
      .datum(ppsData)
      .attr("d", line)
      .attr("fill", "none")
      .attr("stroke", "#00ff9f")
      .attr("stroke-width", 1.5);
  }, [ppsData, containerWidth]);

  const currentPps = ppsData.length > 0 ? ppsData[ppsData.length - 1] : 0;

  return (
    <div style={widgetStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={widgetTitle}>PACKETS / SECOND</div>
        <span style={{ fontFamily: FONT.family.display, fontSize: FONT.size["3xl"], color: "#00ff9f" }}>
          {currentPps}
        </span>
      </div>
      <div ref={containerRef} style={{ flex: 1, minHeight: 0 }}>
        <svg ref={svgRef} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: FONT.size.xs, color: "var(--text-faint)" }}>
        <span>-30s</span>
        <span>now</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Widget 4: Top Talkers
// ─────────────────────────────────────────────────────────────────────────────
function TopTalkers() {
  const ips = usePacketStore((s) => s.stats.ips);

  const top = useMemo(() => {
    return Object.entries(ips)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [ips]);

  const maxVal = top.length > 0 ? top[0][1] : 1;

  return (
    <div style={widgetStyle}>
      <div style={widgetTitle}>TOP TALKERS</div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}>
        {top.map(([ip, count]) => (
          <div key={ip} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "100px", fontSize: FONT.size.sm, color: "var(--text-secondary)", fontFamily: FONT.family.mono, overflow: "hidden", textOverflow: "ellipsis" }}>
              {ip}
            </span>
            <div style={{ flex: 1, height: "10px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "2px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${(count / maxVal) * 100}%`,
                  height: "100%",
                  backgroundColor: "#00b8ff",
                  borderRadius: "2px",
                  transition: "width 0.3s",
                }}
              />
            </div>
            <span style={{ width: "30px", fontSize: FONT.size.sm, color: "var(--text-muted)", textAlign: "right" }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Widget 5: Port Distribution
// ─────────────────────────────────────────────────────────────────────────────
function PortDistribution() {
  const ports = usePacketStore((s) => s.stats.ports);

  const top = useMemo(() => {
    return Object.entries(ports)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([port, count]) => ({
        port: Number(port),
        service: PORT_SERVICE_NAMES[Number(port)] || `Port ${port}`,
        count,
      }));
  }, [ports]);

  const maxVal = top.length > 0 ? top[0].count : 1;

  return (
    <div style={widgetStyle}>
      <div style={widgetTitle}>PORT DISTRIBUTION</div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}>
        {top.map((item) => (
          <div key={item.port} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "80px", fontSize: FONT.size.sm, color: "var(--text-secondary)", fontFamily: FONT.family.mono }}>
              {item.service}
            </span>
            <span style={{ width: "40px", fontSize: FONT.size.xs, color: "var(--text-dim)" }}>:{item.port}</span>
            <div style={{ flex: 1, height: "10px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "2px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${(item.count / maxVal) * 100}%`,
                  height: "100%",
                  backgroundColor: "#ffd600",
                  borderRadius: "2px",
                  transition: "width 0.3s",
                }}
              />
            </div>
            <span style={{ width: "30px", fontSize: FONT.size.sm, color: "var(--text-muted)", textAlign: "right" }}>{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Widget 6: Anomaly Detection
// ─────────────────────────────────────────────────────────────────────────────
function AnomalyDetection() {
  const anomalies = usePacketStore((s) => s.dashboardStats.anomalies);

  function severity(count: number, thresholds: [number, number]): { color: string; level: string } {
    if (count >= thresholds[1]) return { color: "#ff3366", level: "HIGH" };
    if (count >= thresholds[0]) return { color: "#ffd600", level: "MED" };
    return { color: "#00ff9f", level: "LOW" };
  }

  const items = [
    { label: "RST Flags", value: anomalies.rstCount, ...severity(anomalies.rstCount, [5, 20]) },
    { label: "Oversized (>1500B)", value: anomalies.oversizedCount, ...severity(anomalies.oversizedCount, [3, 10]) },
    { label: "Unusual Ports", value: anomalies.unusualPortCount, ...severity(anomalies.unusualPortCount, [10, 30]) },
  ];

  const totalBytes = usePacketStore((s) => {
    const bpp = s.dashboardStats.bytesPerProtocol;
    return Object.values(bpp).reduce((a, b) => a + b, 0);
  });

  return (
    <div style={widgetStyle}>
      <div style={widgetTitle}>ANOMALY DETECTION</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", flex: 1 }}>
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              backgroundColor: "rgba(0,0,0,0.2)",
              border: `1px solid ${item.color}33`,
              borderRadius: "4px",
              padding: "10px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: FONT.size["3xl"], fontFamily: FONT.family.display, color: item.color }}>
              {item.value}
            </div>
            <div style={{ fontSize: FONT.size.xs, color: "var(--text-muted)", marginTop: "2px" }}>{item.label}</div>
            <div
              style={{
                marginTop: "4px",
                fontSize: FONT.size.xs,
                padding: "1px 6px",
                borderRadius: "3px",
                display: "inline-block",
                backgroundColor: `${item.color}22`,
                color: item.color,
              }}
            >
              {item.level}
            </div>
          </div>
        ))}
        <div
          style={{
            backgroundColor: "rgba(0,0,0,0.2)",
            border: "1px solid rgba(0,184,255,0.3)",
            borderRadius: "4px",
            padding: "10px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: FONT.size["2xl"], fontFamily: FONT.family.display, color: "#00b8ff" }}>
            {formatBytes(totalBytes)}
          </div>
          <div style={{ fontSize: FONT.size.xs, color: "var(--text-muted)", marginTop: "2px" }}>TOTAL TRAFFIC</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Statistics Section (merged from StatisticsView)
// ─────────────────────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  backgroundColor: "rgba(0,255,159,0.03)",
  border: "1px solid rgba(0,255,159,0.1)",
  borderRadius: "6px",
  padding: "14px",
};
const cardTitle: React.CSSProperties = {
  fontFamily: FONT.family.display,
  fontSize: FONT.size.md,
  color: "#00ff9f",
  marginBottom: "12px",
  letterSpacing: FONT.spacing.wide,
};
const statRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "4px 0",
  borderBottom: "1px solid rgba(255,255,255,0.03)",
  fontSize: FONT.size.md,
};

function StatisticsSection() {
  const stats = usePacketStore((s) => s.stats);
  const streams = usePacketStore((s) => s.streams);
  const dashboardStats = usePacketStore((s) => s.dashboardStats);

  const computed = useMemo(() => {
    const totalBytes = stats.totalBytes;
    const avgSize = stats.total > 0 ? totalBytes / stats.total : 0;
    const minSize = stats.minSize === Infinity ? 0 : stats.minSize;
    const maxSize = stats.maxSize;

    // Approximate median from last 200 packet sizes
    const sizes = dashboardStats.packetSizes;
    const medianSize = sizes.length > 0
      ? [...sizes].sort((a, b) => a - b)[Math.floor(sizes.length / 2)]
      : 0;

    const durationMs = stats.firstTimestamp > 0 && stats.lastTimestamp > stats.firstTimestamp
      ? stats.lastTimestamp - stats.firstTimestamp
      : 0;
    const durationSec = durationMs / 1000;
    const throughputBps = durationSec > 0 ? totalBytes / durationSec : 0;
    const pps = durationSec > 0 ? stats.total / durationSec : 0;

    const topSrcIps = Object.entries(stats.srcIps).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const topDstIps = Object.entries(stats.dstIps).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const topConversations = Object.entries(stats.conversations)
      .sort((a, b) => b[1].bytes - a[1].bytes)
      .slice(0, 8);
    const topPorts = Object.entries(stats.ports)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const streamEntries = Object.values(streams);
    const avgStreamDuration = streamEntries.length > 0
      ? streamEntries.reduce((a, s) => a + (s.lastTime - s.startTime), 0) / streamEntries.length / 1000
      : 0;
    const avgStreamPackets = streamEntries.length > 0
      ? streamEntries.reduce((a, s) => a + s.packets.length, 0) / streamEntries.length
      : 0;

    return {
      totalBytes, avgSize, minSize, maxSize, medianSize,
      throughputBps, pps, durationSec,
      topSrcIps, topDstIps, topConversations, topPorts,
      avgStreamDuration, avgStreamPackets,
    };
  }, [stats, streams, dashboardStats]);

  const protocolData = Object.entries(stats.protocols)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
  const maxProto = Math.max(...protocolData.map((d) => d[1]), 1);

  const summaryCardStyle: React.CSSProperties = {
    backgroundColor: "rgba(0,255,159,0.03)",
    border: "1px solid rgba(0,255,159,0.1)",
    borderRadius: "6px",
    padding: "14px",
    textAlign: "center",
  };

  return (
    <>
      {/* Summary strip */}
      <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "10px" }}>
        {[
          { value: stats.total.toLocaleString(), label: "TOTAL PACKETS" },
          { value: formatBytes(stats.totalBytes), label: "TOTAL BYTES" },
          { value: `${formatBytes(computed.throughputBps)}/s`, label: "THROUGHPUT" },
          { value: computed.pps.toFixed(1), label: "PACKETS/SEC" },
          { value: Object.keys(streams).length.toString(), label: "STREAMS" },
          { value: `${computed.durationSec.toFixed(1)}s`, label: "DURATION" },
        ].map((item) => (
          <div key={item.label} style={summaryCardStyle}>
            <div style={{ fontFamily: FONT.family.display, fontSize: FONT.size["3xl"], color: "#00ff9f" }}>{item.value}</div>
            <div style={{ fontSize: FONT.size.sm, color: "var(--text-muted)", marginTop: "4px" }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Row: Packet Size Stats + Transport Layer + TCP Flags */}
      <div style={cardStyle}>
        <div style={cardTitle}>PACKET SIZE STATISTICS</div>
        {[
          { label: "Average", value: `${computed.avgSize.toFixed(0)} B` },
          { label: "Median", value: `${computed.medianSize} B` },
          { label: "Minimum", value: `${computed.minSize} B` },
          { label: "Maximum", value: `${computed.maxSize} B` },
          { label: "Std Dev", value: `${dashboardStats.packetSizes.length > 1 ? Math.sqrt(dashboardStats.packetSizes.reduce((a, sz) => a + (sz - computed.avgSize) ** 2, 0) / dashboardStats.packetSizes.length).toFixed(0) : 0} B` },
        ].map((row) => (
          <div key={row.label} style={statRow}>
            <span style={{ color: "var(--text-secondary)" }}>{row.label}</span>
            <span style={{ color: "#fff", fontFamily: FONT.family.mono }}>{row.value}</span>
          </div>
        ))}
      </div>

      <div style={cardStyle}>
        <div style={cardTitle}>TRANSPORT LAYER</div>
        {[
          { label: "TCP Packets", value: stats.tcpCount.toLocaleString(), color: "#00ff9f" },
          { label: "UDP Packets", value: stats.udpCount.toLocaleString(), color: "#00b8ff" },
          { label: "TCP Bytes", value: formatBytes(stats.tcpBytes), color: "#00ff9f" },
          { label: "UDP Bytes", value: formatBytes(stats.udpBytes), color: "#00b8ff" },
          { label: "TCP Ratio", value: `${stats.total > 0 ? ((stats.tcpCount / stats.total) * 100).toFixed(1) : 0}%`, color: "var(--text-secondary)" },
        ].map((row) => (
          <div key={row.label} style={statRow}>
            <span style={{ color: "var(--text-secondary)" }}>{row.label}</span>
            <span style={{ color: row.color, fontFamily: FONT.family.mono }}>{row.value}</span>
          </div>
        ))}
        <div style={{ marginTop: "8px", height: "8px", borderRadius: "4px", overflow: "hidden", display: "flex", backgroundColor: "rgba(0,0,0,0.3)" }}>
          <div style={{ width: `${stats.total > 0 ? (stats.tcpCount / stats.total) * 100 : 50}%`, backgroundColor: "#00ff9f", transition: "width 0.3s" }} />
          <div style={{ flex: 1, backgroundColor: "#00b8ff" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: FONT.size.xs, color: "var(--text-dim)", marginTop: "2px" }}>
          <span>TCP</span>
          <span>UDP</span>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={cardTitle}>TCP FLAGS</div>
        {[
          { label: "SYN", value: stats.synCount, color: "#00ff9f" },
          { label: "ACK", value: stats.ackCount, color: "#00b8ff" },
          { label: "FIN", value: stats.finCount, color: "#ffd600" },
          { label: "RST", value: stats.rstCount, color: "#ff3366" },
          { label: "PSH", value: stats.pshCount, color: "#ff6b00" },
          { label: "Est. Retransmit", value: stats.retransmissions, color: "#ff00ff" },
        ].map((row) => {
          const max = Math.max(stats.synCount, stats.ackCount, stats.finCount, stats.rstCount, stats.pshCount, stats.retransmissions, 1);
          return (
            <div key={row.label} style={{ ...statRow, alignItems: "center" }}>
              <span style={{ color: row.color, width: "90px" }}>{row.label}</span>
              <div style={{ flex: 1, height: "6px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "3px", overflow: "hidden", margin: "0 8px" }}>
                <div style={{ width: `${(row.value / max) * 100}%`, height: "100%", backgroundColor: row.color, borderRadius: "3px" }} />
              </div>
              <span style={{ color: "var(--text-secondary)", fontFamily: FONT.family.mono, width: "40px", textAlign: "right" }}>{row.value}</span>
            </div>
          );
        })}
      </div>

      {/* Row: Protocols + Top Conversations + Stream Stats */}
      <div style={cardStyle}>
        <div style={cardTitle}>PROTOCOL DISTRIBUTION</div>
        {protocolData.map(([proto, count]) => (
          <div key={proto} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{ width: 50, color: PROTOCOL_COLORS[proto], fontSize: FONT.size.md }}>{proto}</span>
            <div style={{ flex: 1, height: "14px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "3px", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  borderRadius: "3px",
                  width: `${(count / maxProto) * 100}%`,
                  backgroundColor: PROTOCOL_COLORS[proto],
                }}
              />
            </div>
            <span style={{ width: 40, textAlign: "right" as const, color: "var(--text-secondary)", fontSize: FONT.size.md }}>
              {count}
            </span>
            <span style={{ width: 40, textAlign: "right" as const, color: "var(--text-dim)", fontSize: FONT.size.sm }}>
              {stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : 0}%
            </span>
          </div>
        ))}
      </div>

      <div style={cardStyle}>
        <div style={cardTitle}>TOP CONVERSATIONS</div>
        {computed.topConversations.map(([conv, data]) => {
          const maxConvBytes = computed.topConversations[0]?.[1].bytes || 1;
          return (
            <div key={conv} style={{ marginBottom: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: FONT.size.sm }}>
                <span style={{ color: "var(--text-secondary)", fontFamily: FONT.family.mono, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}>{conv}</span>
                <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{formatBytes(data.bytes)}</span>
              </div>
              <div style={{ height: "4px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "2px", overflow: "hidden", marginTop: "2px" }}>
                <div style={{ width: `${(data.bytes / maxConvBytes) * 100}%`, height: "100%", backgroundColor: "#9d00ff", borderRadius: "2px" }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={cardStyle}>
        <div style={cardTitle}>STREAM STATISTICS</div>
        {[
          { label: "Total Streams", value: Object.keys(streams).length.toString() },
          { label: "Active IPs", value: Object.keys(stats.ips).length.toString() },
          { label: "Unique Ports", value: Object.keys(stats.ports).length.toString() },
          { label: "Avg Stream Duration", value: `${computed.avgStreamDuration.toFixed(1)}s` },
          { label: "Avg Pkts/Stream", value: computed.avgStreamPackets.toFixed(1) },
          { label: "Bytes/Protocol (top)", value: (() => {
            const top = Object.entries(dashboardStats.bytesPerProtocol).sort((a, b) => b[1] - a[1])[0];
            return top ? `${top[0]}: ${formatBytes(top[1])}` : "-";
          })() },
        ].map((row) => (
          <div key={row.label} style={statRow}>
            <span style={{ color: "var(--text-secondary)" }}>{row.label}</span>
            <span style={{ color: "#fff", fontFamily: FONT.family.mono }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* Row: Src IPs + Dst IPs + Port Distribution */}
      <div style={cardStyle}>
        <div style={cardTitle}>TOP SOURCE IPs</div>
        {computed.topSrcIps.map(([ip, count]) => {
          const max = computed.topSrcIps[0]?.[1] || 1;
          return (
            <div key={ip} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <span style={{ width: "100px", fontSize: FONT.size.sm, color: "var(--text-secondary)", fontFamily: FONT.family.mono, overflow: "hidden", textOverflow: "ellipsis" }}>{ip}</span>
              <div style={{ flex: 1, height: "8px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ width: `${(count / max) * 100}%`, height: "100%", backgroundColor: "#00b8ff", borderRadius: "3px" }} />
              </div>
              <span style={{ width: "30px", fontSize: FONT.size.sm, color: "var(--text-muted)", textAlign: "right" }}>{count}</span>
            </div>
          );
        })}
      </div>

      <div style={cardStyle}>
        <div style={cardTitle}>TOP DESTINATION IPs</div>
        {computed.topDstIps.map(([ip, count]) => {
          const max = computed.topDstIps[0]?.[1] || 1;
          return (
            <div key={ip} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <span style={{ width: "100px", fontSize: FONT.size.sm, color: "var(--text-secondary)", fontFamily: FONT.family.mono, overflow: "hidden", textOverflow: "ellipsis" }}>{ip}</span>
              <div style={{ flex: 1, height: "8px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ width: `${(count / max) * 100}%`, height: "100%", backgroundColor: "#ff6b00", borderRadius: "3px" }} />
              </div>
              <span style={{ width: "30px", fontSize: FONT.size.sm, color: "var(--text-muted)", textAlign: "right" }}>{count}</span>
            </div>
          );
        })}
      </div>

      <div style={cardStyle}>
        <div style={cardTitle}>PORT DISTRIBUTION</div>
        {computed.topPorts.map(([port, count]) => {
          const max = computed.topPorts[0]?.[1] || 1;
          const service = PORT_SERVICE_NAMES[Number(port)] || `Port ${port}`;
          return (
            <div key={port} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <span style={{ width: "70px", fontSize: FONT.size.sm, color: "var(--text-secondary)" }}>{service}</span>
              <span style={{ width: "36px", fontSize: FONT.size.xs, color: "var(--text-dim)", fontFamily: FONT.family.mono }}>:{port}</span>
              <div style={{ flex: 1, height: "8px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ width: `${(count / max) * 100}%`, height: "100%", backgroundColor: "#ffd600", borderRadius: "3px" }} />
              </div>
              <span style={{ width: "30px", fontSize: FONT.size.sm, color: "var(--text-muted)", textAlign: "right" }}>{count}</span>
            </div>
          );
        })}
      </div>

      {/* Row: TTL + Anomaly + Bytes per Protocol */}
      <div style={cardStyle}>
        <div style={cardTitle}>TTL DISTRIBUTION</div>
        {(() => {
          const ttlMax = Math.max(...Object.values(stats.ttlBuckets), 1);
          return Object.entries(stats.ttlBuckets)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .map(([bucket, count]) => (
              <div key={bucket} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                <span style={{ width: "50px", fontSize: FONT.size.sm, color: "var(--text-secondary)", fontFamily: FONT.family.mono }}>{bucket}</span>
                <div style={{ flex: 1, height: "8px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ width: `${(count / ttlMax) * 100}%`, height: "100%", backgroundColor: "#00ffff", borderRadius: "3px" }} />
                </div>
                <span style={{ width: "30px", fontSize: FONT.size.sm, color: "var(--text-muted)", textAlign: "right" }}>{count}</span>
              </div>
            ));
        })()}
      </div>

      <div style={cardStyle}>
        <div style={cardTitle}>ANOMALY SUMMARY</div>
        {[
          { label: "RST Flags Detected", value: dashboardStats.anomalies.rstCount, color: dashboardStats.anomalies.rstCount > 20 ? "#ff3366" : dashboardStats.anomalies.rstCount > 5 ? "#ffd600" : "#00ff9f" },
          { label: "Oversized Packets (>1500B)", value: dashboardStats.anomalies.oversizedCount, color: dashboardStats.anomalies.oversizedCount > 10 ? "#ff3366" : dashboardStats.anomalies.oversizedCount > 3 ? "#ffd600" : "#00ff9f" },
          { label: "Unusual Ports", value: dashboardStats.anomalies.unusualPortCount, color: dashboardStats.anomalies.unusualPortCount > 30 ? "#ff3366" : dashboardStats.anomalies.unusualPortCount > 10 ? "#ffd600" : "#00ff9f" },
          { label: "Est. Retransmissions", value: stats.retransmissions, color: stats.retransmissions > 20 ? "#ff3366" : stats.retransmissions > 5 ? "#ffd600" : "#00ff9f" },
        ].map((row) => (
          <div key={row.label} style={{ ...statRow, alignItems: "center" }}>
            <span style={{ color: "var(--text-secondary)", flex: 1 }}>{row.label}</span>
            <span style={{ fontFamily: FONT.family.display, fontSize: FONT.size.xl, color: row.color }}>{row.value}</span>
          </div>
        ))}
      </div>

      <div style={cardStyle}>
        <div style={cardTitle}>BYTES PER PROTOCOL</div>
        {Object.entries(dashboardStats.bytesPerProtocol)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([proto, bytes]) => {
            const max = Object.values(dashboardStats.bytesPerProtocol).reduce((a, b) => Math.max(a, b), 1);
            return (
              <div key={proto} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <span style={{ width: "50px", fontSize: FONT.size.sm, color: PROTOCOL_COLORS[proto] || "var(--text-secondary)" }}>{proto}</span>
                <div style={{ flex: 1, height: "8px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ width: `${(bytes / max) * 100}%`, height: "100%", backgroundColor: PROTOCOL_COLORS[proto] || "#00ff9f", borderRadius: "3px" }} />
                </div>
                <span style={{ width: "50px", fontSize: FONT.size.sm, color: "var(--text-muted)", textAlign: "right" }}>{formatBytes(bytes)}</span>
              </div>
            );
          })}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats Root
// ─────────────────────────────────────────────────────────────────────────────
export function Stats() {
  return (
    <div
      style={{
        flex: 1,
        padding: "16px",
        overflow: "auto",
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "12px",
        alignContent: "start",
      }}
    >
      <ProtocolDonut />
      <SizeHistogram />
      <PacketsTimeline />
      <TopTalkers />
      <PortDistribution />
      <AnomalyDetection />
      <StatisticsSection />
    </div>
  );
}
