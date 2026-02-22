import React, { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import { usePacketStore } from "../../../hooks/usePacketStore";
import { PROTOCOL_COLORS } from "../../../styles/theme";
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
  fontFamily: "'Orbitron'",
  fontSize: "10px",
  color: "#00ff9f",
  marginBottom: "12px",
  letterSpacing: "1px",
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
      .attr("fill", (d) => PROTOCOL_COLORS[d.data[0]] || "#444")
      .attr("stroke", "#0a0f0a")
      .attr("stroke-width", 1.5);

    const total = data.reduce((a, b) => a + b[1], 0);
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-4px")
      .attr("fill", "#00ff9f")
      .attr("font-family", "'Orbitron'")
      .attr("font-size", "16px")
      .text(total.toLocaleString());
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "12px")
      .attr("fill", "#666")
      .attr("font-size", "8px")
      .text("PACKETS");
  }, [data]);

  return (
    <div style={widgetStyle}>
      <div style={widgetTitle}>PROTOCOL DISTRIBUTION</div>
      <div style={{ display: "flex", gap: "12px", flex: 1, alignItems: "center" }}>
        <svg ref={svgRef} />
        <div style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "9px" }}>
          {data.map(([name, count]) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "2px", backgroundColor: PROTOCOL_COLORS[name] || "#444", flexShrink: 0 }} />
              <span style={{ color: "#888" }}>{name}</span>
              <span style={{ color: "#555", marginLeft: "auto" }}>{count}</span>
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
            <span style={{ width: "60px", fontSize: "8px", color: "#555", textAlign: "right", fontFamily: "monospace" }}>
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
            <span style={{ width: "30px", fontSize: "9px", color: "#666", textAlign: "right" }}>{bin.count}</span>
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
    if (!svgRef.current || !containerRef.current || ppsData.length === 0) return;
    const w = containerRef.current.clientWidth;
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
  }, [ppsData]);

  const currentPps = ppsData.length > 0 ? ppsData[ppsData.length - 1] : 0;

  return (
    <div style={widgetStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={widgetTitle}>PACKETS / SECOND</div>
        <span style={{ fontFamily: "'Orbitron'", fontSize: "18px", color: "#00ff9f" }}>
          {currentPps}
        </span>
      </div>
      <div ref={containerRef} style={{ flex: 1, minHeight: 0 }}>
        <svg ref={svgRef} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", color: "#444" }}>
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
            <span style={{ width: "100px", fontSize: "9px", color: "#888", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis" }}>
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
            <span style={{ width: "30px", fontSize: "9px", color: "#666", textAlign: "right" }}>{count}</span>
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
            <span style={{ width: "80px", fontSize: "9px", color: "#888", fontFamily: "monospace" }}>
              {item.service}
            </span>
            <span style={{ width: "40px", fontSize: "8px", color: "#555" }}>:{item.port}</span>
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
            <span style={{ width: "30px", fontSize: "9px", color: "#666", textAlign: "right" }}>{item.count}</span>
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
            <div style={{ fontSize: "20px", fontFamily: "'Orbitron'", color: item.color }}>
              {item.value}
            </div>
            <div style={{ fontSize: "8px", color: "#666", marginTop: "2px" }}>{item.label}</div>
            <div
              style={{
                marginTop: "4px",
                fontSize: "8px",
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
          <div style={{ fontSize: "16px", fontFamily: "'Orbitron'", color: "#00b8ff" }}>
            {formatBytes(totalBytes)}
          </div>
          <div style={{ fontSize: "8px", color: "#666", marginTop: "2px" }}>TOTAL TRAFFIC</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Root
// ─────────────────────────────────────────────────────────────────────────────
export function Dashboard() {
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
    </div>
  );
}
