import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { styles } from "../../../styles/components";
import { PROTOCOL_COLORS } from "../../../styles/theme";
import { usePacketStore } from "../../../hooks/usePacketStore";
import { EmptyState } from "../../shared/EmptyState";

type GroupBy = "ip" | "protocol" | "port";

interface Flow {
  source: string;
  target: string;
  value: number;
}

export function SankeyDiagram() {
  const packets = usePacketStore((s) => s.packets);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>("ip");

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || packets.length === 0)
      return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = { top: 20, right: 150, bottom: 20, left: 150 };

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const flows: Record<string, Flow> = {};
    packets.forEach((p) => {
      let src: string;
      let dst: string;
      if (groupBy === "ip") {
        src = p.ip.srcIp;
        dst = p.ip.dstIp;
      } else if (groupBy === "protocol") {
        src = p.ip.srcIp.split(".").slice(0, 2).join(".") + ".*";
        dst = p.protocol;
      } else {
        src = p.protocol;
        dst = `:${p.dstPort}`;
      }
      const key = `${src}|${dst}`;
      if (!flows[key]) flows[key] = { source: src, target: dst, value: 0 };
      flows[key].value += p.length;
    });

    const flowArray = Object.values(flows)
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);
    const sourceNodes = [...new Set(flowArray.map((f) => f.source))];
    const targetNodes = [...new Set(flowArray.map((f) => f.target))];

    const innerHeight = height - margin.top - margin.bottom;
    const sourceY = d3
      .scaleBand()
      .domain(sourceNodes)
      .range([0, innerHeight])
      .padding(0.1);
    const targetY = d3
      .scaleBand()
      .domain(targetNodes)
      .range([0, innerHeight])
      .padding(0.1);

    const maxValue = Math.max(...flowArray.map((f) => f.value));
    const linkWidth = d3.scaleLinear().domain([0, maxValue]).range([2, 30]);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    flowArray.forEach((flow) => {
      const y1 = (sourceY(flow.source) ?? 0) + sourceY.bandwidth() / 2;
      const y2 = (targetY(flow.target) ?? 0) + targetY.bandwidth() / 2;
      const w = linkWidth(flow.value);

      const path = d3.path();
      path.moveTo(0, y1);
      path.bezierCurveTo(
        (width - margin.left - margin.right) / 3,
        y1,
        ((width - margin.left - margin.right) * 2) / 3,
        y2,
        width - margin.left - margin.right,
        y2
      );

      g.append("path")
        .attr("d", path.toString())
        .attr("fill", "none")
        .attr(
          "stroke",
          PROTOCOL_COLORS[flow.source] ||
            PROTOCOL_COLORS[flow.target] ||
            "#00ff9f"
        )
        .attr("stroke-opacity", 0.5)
        .attr("stroke-width", w);
    });

    sourceNodes.forEach((name) => {
      const y = sourceY(name) ?? 0;
      g.append("rect")
        .attr("x", -10)
        .attr("y", y)
        .attr("width", 10)
        .attr("height", sourceY.bandwidth())
        .attr("fill", PROTOCOL_COLORS[name] || "#00ff9f");
      g.append("text")
        .attr("x", -15)
        .attr("y", y + sourceY.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .attr("fill", "#888")
        .attr("font-size", "10px")
        .attr("font-family", "monospace")
        .text(name.length > 15 ? name.substring(0, 15) + "..." : name);
    });

    targetNodes.forEach((name) => {
      const y = targetY(name) ?? 0;
      const x = width - margin.left - margin.right;
      g.append("rect")
        .attr("x", x)
        .attr("y", y)
        .attr("width", 10)
        .attr("height", targetY.bandwidth())
        .attr("fill", PROTOCOL_COLORS[name] || "#00b8ff");
      g.append("text")
        .attr("x", x + 15)
        .attr("y", y + targetY.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("fill", "#888")
        .attr("font-size", "10px")
        .attr("font-family", "monospace")
        .text(name.length > 15 ? name.substring(0, 15) + "..." : name);
    });
  }, [packets, groupBy]);

  return (
    <div style={styles.sankeyContainer}>
      <div style={styles.sankeyHeader}>
        <span style={styles.sankeyTitle}>&#x2964; TRAFFIC FLOW</span>
        <div style={styles.sankeyControls}>
          <button
            onClick={() => setGroupBy("ip")}
            style={{
              ...styles.sankeyBtn,
              ...(groupBy === "ip" ? styles.sankeyBtnActive : {}),
            }}
          >
            IP &rarr; IP
          </button>
          <button
            onClick={() => setGroupBy("protocol")}
            style={{
              ...styles.sankeyBtn,
              ...(groupBy === "protocol" ? styles.sankeyBtnActive : {}),
            }}
          >
            Subnet &rarr; Protocol
          </button>
          <button
            onClick={() => setGroupBy("port")}
            style={{
              ...styles.sankeyBtn,
              ...(groupBy === "port" ? styles.sankeyBtnActive : {}),
            }}
          >
            Protocol &rarr; Port
          </button>
        </div>
      </div>
      <div ref={containerRef} style={styles.sankeyGraph}>
        {packets.length === 0 ? (
          <EmptyState icon="&#x2964;" message="No traffic flow data" />
        ) : (
          <svg ref={svgRef} />
        )}
      </div>
    </div>
  );
}
