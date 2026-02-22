import React, { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import { styles } from "../../../styles/components";
import { usePacketStore } from "../../../hooks/usePacketStore";
import { EmptyState } from "../../shared/EmptyState";
import { DraggablePanel } from "../../shared/DraggablePanel";

interface HierarchyNode {
  name: string;
  children?: HierarchyNode[];
  value?: number;
}

interface SubnetInfo {
  name: string;
  isLocal: boolean;
  hosts: Record<string, { name: string; packets: number }>;
  totalPackets: number;
}

export function HierarchicalTopology() {
  const packets = usePacketStore((s) => s.packets);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hierarchy = useMemo<HierarchyNode>(() => {
    const subnets: Record<string, SubnetInfo> = {};
    packets.forEach((p) => {
      [p.ip.srcIp, p.ip.dstIp].forEach((ip) => {
        const parts = ip.split(".");
        const subnet = `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
        const isLocal =
          parts[0] === "192" || parts[0] === "10" || parts[0] === "172";
        if (!subnets[subnet])
          subnets[subnet] = {
            name: subnet,
            isLocal,
            hosts: {},
            totalPackets: 0,
          };
        if (!subnets[subnet].hosts[ip])
          subnets[subnet].hosts[ip] = { name: ip, packets: 0 };
        subnets[subnet].hosts[ip].packets++;
        subnets[subnet].totalPackets++;
      });
    });

    const localSubnets = Object.values(subnets).filter((s) => s.isLocal);
    const remoteSubnets = Object.values(subnets).filter((s) => !s.isLocal);

    return {
      name: "Network",
      children: [
        {
          name: "Local",
          children: localSubnets.slice(0, 5).map((s) => ({
            name: s.name,
            children: Object.values(s.hosts)
              .slice(0, 8)
              .map((h) => ({ name: h.name, value: h.packets })),
          })),
        },
        {
          name: "Remote",
          children: remoteSubnets.slice(0, 5).map((s) => ({
            name: s.name,
            children: Object.values(s.hosts)
              .slice(0, 8)
              .map((h) => ({ name: h.name, value: h.packets })),
          })),
        },
      ],
    };
  }, [packets]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || packets.length === 0)
      return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);
    const g = svg.append("g").attr("transform", `translate(80, 20)`);

    const treeLayout = d3.tree<HierarchyNode>().size([height - 40, width - 200]);
    const root = d3.hierarchy(hierarchy);
    treeLayout(root);

    g.selectAll(".link")
      .data(root.links())
      .join("path")
      .attr("class", "link")
      .attr(
        "d",
        d3
          .linkHorizontal<
            d3.HierarchyPointLink<HierarchyNode>,
            d3.HierarchyPointNode<HierarchyNode>
          >()
          .x((d) => d.y)
          .y((d) => d.x) as any
      )
      .attr("fill", "none")
      .attr("stroke", "#00ff9f")
      .attr("stroke-opacity", 0.3)
      .attr("stroke-width", 1);

    const node = g
      .selectAll(".node")
      .data(root.descendants())
      .join("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.y},${d.x})`);

    node
      .append("circle")
      .attr("r", (d) => (d.children ? 8 : 5))
      .attr("fill", (d) =>
        d.depth === 0
          ? "#ffd600"
          : d.depth === 1
            ? "#00b8ff"
            : d.children
              ? "#00ff9f"
              : "#ff6b00"
      )
      .attr("stroke", "#0a0f0a")
      .attr("stroke-width", 2);

    node
      .append("text")
      .attr("dy", 3)
      .attr("x", (d) => (d.children ? -12 : 10))
      .attr("text-anchor", (d) => (d.children ? "end" : "start"))
      .attr("fill", "#888")
      .attr("font-size", "10px")
      .attr("font-family", "monospace")
      .text((d) =>
        d.data.name.length > 20
          ? d.data.name.substring(0, 20) + "..."
          : d.data.name
      );
  }, [hierarchy, packets]);

  return (
    <div style={styles.topologyContainer}>
      <div style={styles.topologyHeader}>
        <span style={styles.topologyTitle}>&#x25CE; NETWORK HIERARCHY</span>
      </div>
      <div ref={containerRef} style={styles.topologyGraph}>
        {packets.length === 0 ? (
          <EmptyState icon="&#x25CE;" message="No topology data" />
        ) : (
          <svg ref={svgRef} />
        )}
      </div>
      <DraggablePanel title="LEGEND" defaultCorner="bottom-left" width={140}>
        <div style={{ fontSize: "9px", color: "#888", display: "flex", flexDirection: "column", gap: "4px" }}>
          <div><span style={{ color: "#ffd600" }}>&#x25CF;</span> Root</div>
          <div><span style={{ color: "#00b8ff" }}>&#x25CF;</span> Category</div>
          <div><span style={{ color: "#00ff9f" }}>&#x25CF;</span> Subnet</div>
          <div><span style={{ color: "#ff6b00" }}>&#x25CF;</span> Host</div>
        </div>
      </DraggablePanel>
    </div>
  );
}
