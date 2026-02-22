import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { styles } from "../../../styles/components";
import { PROTOCOL_COLORS } from "../../../styles/theme";
import { usePacketStore } from "../../../hooks/usePacketStore";
import { useContainerSize } from "../../../hooks/useContainerSize";
import { EmptyState } from "../../shared/EmptyState";
import { formatBytes, PORT_SERVICE_NAMES } from "../../../lib/formatters";

type GroupBy = "ip" | "protocol" | "port" | "service";

interface Flow {
  source: string;
  target: string;
  value: number;
}

export function SankeyDiagram() {
  const packets = usePacketStore((s) => s.packets);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>("ip");
  const { width: containerWidth, height: containerHeight } = useContainerSize(containerRef);

  const flowArray = useMemo(() => {
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
      } else if (groupBy === "service") {
        src = p.ip.srcIp;
        dst = PORT_SERVICE_NAMES[p.dstPort] || `Port ${p.dstPort}`;
      } else {
        src = p.protocol;
        dst = `:${p.dstPort}`;
      }
      const key = `${src}|${dst}`;
      if (!flows[key]) flows[key] = { source: src, target: dst, value: 0 };
      flows[key].value += p.length;
    });

    return Object.values(flows)
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);
  }, [packets, groupBy]);

  useEffect(() => {
    if (!svgRef.current || flowArray.length === 0 || containerWidth === 0 || containerHeight === 0)
      return;

    const width = containerWidth;
    const height = containerHeight;
    const margin = { top: 20, right: 150, bottom: 20, left: 150 };

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

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

    const tooltip = tooltipRef.current;

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
        .attr("stroke-width", w)
        .style("cursor", "pointer")
        .on("mouseover", function (event) {
          d3.select(this).attr("stroke-opacity", 0.9);
          if (tooltip) {
            tooltip.style.display = "block";
            tooltip.style.left = `${event.offsetX + 12}px`;
            tooltip.style.top = `${event.offsetY - 20}px`;
            tooltip.textContent = `${flow.source} → ${flow.target}: ${formatBytes(flow.value)}`;
          }
        })
        .on("mousemove", function (event) {
          if (tooltip) {
            tooltip.style.left = `${event.offsetX + 12}px`;
            tooltip.style.top = `${event.offsetY - 20}px`;
          }
        })
        .on("mouseout", function () {
          d3.select(this).attr("stroke-opacity", 0.5);
          if (tooltip) {
            tooltip.style.display = "none";
          }
        });
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
        .attr("fill", "var(--text-secondary)")
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
        .attr("fill", "var(--text-secondary)")
        .attr("font-size", "10px")
        .attr("font-family", "monospace")
        .text(name.length > 15 ? name.substring(0, 15) + "..." : name);
    });
    return () => {
      d3.select(svgRef.current).selectAll("*").remove();
      if (tooltipRef.current) {
        tooltipRef.current.style.display = "none";
      }
    };
  }, [flowArray, containerWidth, containerHeight]);

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
          <button
            onClick={() => setGroupBy("service")}
            style={{
              ...styles.sankeyBtn,
              ...(groupBy === "service" ? styles.sankeyBtnActive : {}),
            }}
          >
            IP &rarr; Service
          </button>
        </div>
      </div>
      <div ref={containerRef} style={{ ...styles.sankeyGraph, position: "relative" }}>
        {packets.length === 0 ? (
          <EmptyState icon="&#x2964;" message="No traffic flow data" />
        ) : (
          <>
            <svg ref={svgRef} />
            <div
              ref={tooltipRef}
              style={{
                display: "none",
                position: "absolute",
                padding: "6px 10px",
                backgroundColor: "rgba(10,15,10,0.95)",
                border: "1px solid rgba(0,255,159,0.4)",
                borderRadius: "4px",
                fontSize: "10px",
                color: "#00ff9f",
                fontFamily: "monospace",
                pointerEvents: "none",
                zIndex: 10,
                whiteSpace: "nowrap",
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
