import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { styles } from "../../../styles/components";
import { PROTOCOL_COLORS } from "../../../styles/theme";
import { usePacketStore } from "../../../hooks/usePacketStore";
import { EmptyState } from "../../shared/EmptyState";
import { DraggablePanel } from "../../shared/DraggablePanel";
import type { StreamData, RouteHop } from "../../../types/stream";

interface TopologyNode {
  id: string;
  type: string;
  hostname?: string;
  avgRtt?: number;
  packets: number;
  streams: string[];
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface TopologyLink {
  source: string | TopologyNode;
  target: string | TopologyNode;
  count: number;
  streams: string[];
}

type ViewMode = "graph" | "hierarchical" | "list";

const NODE_COLORS: Record<string, string> = {
  endpoint: "#00ff9f",
  gateway: "#ffd600",
  isp: "#00b8ff",
  transit: "#ff6b00",
  "dest-gateway": "#ff00ff",
};

export function RouteTrace() {
  const packets = usePacketStore((s) => s.packets);
  const streams = usePacketStore((s) => s.streams);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<TopologyNode, TopologyLink> | null>(null);
  const linkSelRef = useRef<d3.Selection<SVGLineElement, TopologyLink, SVGGElement, unknown> | null>(null);
  const nodeSelRef = useRef<d3.Selection<SVGGElement, TopologyNode, SVGGElement, unknown> | null>(null);
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("graph");

  const sortedStreams = useMemo(() => {
    return Object.entries(streams)
      .filter(([_, s]) => s.route && s.route.length > 0)
      .sort((a, b) => b[1].packets.length - a[1].packets.length)
      .slice(0, 30);
  }, [streams]);

  const topology = useMemo(() => {
    const nodes = new Map<string, TopologyNode>();
    const links = new Map<string, TopologyLink>();

    Object.entries(streams).forEach(([streamKey, stream]) => {
      if (!stream.route) return;

      if (!nodes.has(stream.srcIP)) {
        nodes.set(stream.srcIP, {
          id: stream.srcIP,
          type: "endpoint",
          packets: 0,
          streams: [],
        });
      }
      nodes.get(stream.srcIP)!.packets += stream.packets.length;
      nodes.get(stream.srcIP)!.streams.push(streamKey);

      let prevIP = stream.srcIP;
      stream.route.forEach((hop) => {
        if (!nodes.has(hop.ip)) {
          nodes.set(hop.ip, {
            id: hop.ip,
            type: hop.type,
            hostname: hop.hostname,
            avgRtt: hop.rtt,
            packets: 0,
            streams: [],
          });
        }
        nodes.get(hop.ip)!.packets += stream.packets.length;
        nodes.get(hop.ip)!.streams.push(streamKey);

        const linkKey = `${prevIP}->${hop.ip}`;
        if (!links.has(linkKey)) {
          links.set(linkKey, {
            source: prevIP,
            target: hop.ip,
            count: 0,
            streams: [],
          });
        }
        links.get(linkKey)!.count += stream.packets.length;
        links.get(linkKey)!.streams.push(streamKey);

        prevIP = hop.ip;
      });

      if (!nodes.has(stream.dstIP)) {
        nodes.set(stream.dstIP, {
          id: stream.dstIP,
          type: "endpoint",
          packets: 0,
          streams: [],
        });
      }
      nodes.get(stream.dstIP)!.packets += stream.packets.length;
      nodes.get(stream.dstIP)!.streams.push(streamKey);

      const lastHop = stream.route[stream.route.length - 1];
      if (lastHop) {
        const linkKey = `${lastHop.ip}->${stream.dstIP}`;
        if (!links.has(linkKey)) {
          links.set(linkKey, {
            source: lastHop.ip,
            target: stream.dstIP,
            count: 0,
            streams: [],
          });
        }
        links.get(linkKey)!.count += stream.packets.length;
        links.get(linkKey)!.streams.push(streamKey);
      }
    });

    return {
      nodes: Array.from(nodes.values()),
      links: Array.from(links.values()),
    };
  }, [streams]);

  // Stable topology fingerprint — only changes when nodes/links structurally change
  const topologyKey = useMemo(() => {
    const nk = topology.nodes.map((n) => n.id).sort().join(",");
    const lk = topology.links
      .map((l) => {
        const src = typeof l.source === "string" ? l.source : l.source.id;
        const tgt = typeof l.target === "string" ? l.target : l.target.id;
        return `${src}->${tgt}`;
      })
      .sort()
      .join(",");
    return `${nk}|${lk}`;
  }, [topology]);

  // Init effect — rebuilds only when graph structure changes
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || viewMode !== "graph") return;
    if (topology.nodes.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);

    const defs = g.append("defs");

    const filter = defs.append("filter").attr("id", "glow");
    filter
      .append("feGaussianBlur")
      .attr("stdDeviation", "3")
      .attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    defs
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#00ff9f")
      .attr("d", "M0,-5L10,0L0,5");

    const simNodes = topology.nodes.map((d) => ({ ...d }));
    const simLinks = topology.links.map((d) => ({ ...d }));

    const simulation = d3
      .forceSimulation<TopologyNode>(simNodes)
      .force(
        "link",
        d3
          .forceLink<TopologyNode, TopologyLink>(simLinks)
          .id((d) => d.id)
          .distance(100)
      )
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(50));

    simulationRef.current = simulation;

    const link = g
      .append("g")
      .selectAll<SVGLineElement, TopologyLink>("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", "#00ff9f")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", (d) => Math.max(1, Math.min(d.count / 10, 5)))
      .attr("marker-end", "url(#arrow)");

    linkSelRef.current = link as any;

    const node = g
      .append("g")
      .selectAll<SVGGElement, TopologyNode>("g")
      .data(simNodes)
      .join("g")
      .call(
        d3
          .drag<SVGGElement, TopologyNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    nodeSelRef.current = node as any;

    node.each(function (d) {
      const el = d3.select(this);
      const color = NODE_COLORS[d.type] || "#00ff9f";

      if (d.type === "endpoint") {
        el.append("rect")
          .attr("x", -15)
          .attr("y", -15)
          .attr("width", 30)
          .attr("height", 30)
          .attr("fill", "#0a0f0a")
          .attr("stroke", color)
          .attr("stroke-width", 2)
          .style("filter", "url(#glow)");
      } else if (d.type === "gateway" || d.type === "dest-gateway") {
        el.append("polygon")
          .attr("points", "0,-18 18,0 0,18 -18,0")
          .attr("fill", "#0a0f0a")
          .attr("stroke", color)
          .attr("stroke-width", 2)
          .style("filter", "url(#glow)");
      } else {
        el.append("circle")
          .attr("r", 15)
          .attr("fill", "#0a0f0a")
          .attr("stroke", color)
          .attr("stroke-width", 2)
          .style("filter", "url(#glow)");
      }

      el.append("text")
        .attr("dy", 30)
        .attr("text-anchor", "middle")
        .attr("fill", color)
        .attr("font-size", "9px")
        .attr("font-family", "monospace")
        .text(d.id);

      if (d.hostname) {
        el.append("text")
          .attr("dy", 42)
          .attr("text-anchor", "middle")
          .attr("fill", "var(--text-muted)")
          .attr("font-size", "8px")
          .text(d.hostname.substring(0, 20));
      }
    });

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    const fitTimer = setTimeout(() => {
      const gNode = g.node();
      if (!gNode) return;
      const bounds = gNode.getBBox();
      const scale =
        0.8 / Math.max(bounds.width / width, bounds.height / height);
      svg
        .transition()
        .duration(500)
        .call(
          zoom.transform,
          d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(Math.min(scale, 1))
            .translate(
              -bounds.x - bounds.width / 2,
              -bounds.y - bounds.height / 2
            )
        );
    }, 300);

    return () => {
      clearTimeout(fitTimer);
      simulation.stop();
      simulationRef.current = null;
      linkSelRef.current = null;
      nodeSelRef.current = null;
    };
  }, [topologyKey, viewMode]);

  // Hierarchical layout effect
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || viewMode !== "hierarchical") return;
    if (topology.nodes.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = { top: 40, right: 60, bottom: 40, left: 60 };

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);

    const defs = g.append("defs");
    const filter = defs.append("filter").attr("id", "glow-h");
    filter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    defs
      .append("marker")
      .attr("id", "arrow-h")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#00ff9f")
      .attr("d", "M0,-5L10,0L0,5");

    // BFS to assign layers
    const adjMap = new Map<string, string[]>();
    topology.nodes.forEach((n) => adjMap.set(n.id, []));
    topology.links.forEach((l) => {
      const src = typeof l.source === "string" ? l.source : l.source.id;
      const tgt = typeof l.target === "string" ? l.target : l.target.id;
      if (adjMap.has(src)) adjMap.get(src)!.push(tgt);
    });

    // Find source endpoints (nodes with type "endpoint" that appear as srcIP)
    const sourceEndpoints = topology.nodes.filter((n) => n.type === "endpoint" && adjMap.get(n.id)!.length > 0);
    const layerMap = new Map<string, number>();
    const queue: string[] = [];

    if (sourceEndpoints.length > 0) {
      sourceEndpoints.forEach((n) => {
        layerMap.set(n.id, 0);
        queue.push(n.id);
      });
    } else if (topology.nodes.length > 0) {
      layerMap.set(topology.nodes[0].id, 0);
      queue.push(topology.nodes[0].id);
    }

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const currLayer = layerMap.get(curr)!;
      const neighbors = adjMap.get(curr) || [];
      for (const nb of neighbors) {
        if (!layerMap.has(nb)) {
          layerMap.set(nb, currLayer + 1);
          queue.push(nb);
        }
      }
    }

    // Assign unvisited nodes
    topology.nodes.forEach((n) => {
      if (!layerMap.has(n.id)) layerMap.set(n.id, 0);
    });

    const maxLayer = Math.max(...Array.from(layerMap.values()), 0);
    const layerGroups = new Map<number, TopologyNode[]>();
    topology.nodes.forEach((n) => {
      const layer = layerMap.get(n.id)!;
      if (!layerGroups.has(layer)) layerGroups.set(layer, []);
      layerGroups.get(layer)!.push(n);
    });

    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const positionedNodes = topology.nodes.map((n) => {
      const layer = layerMap.get(n.id)!;
      const nodesInLayer = layerGroups.get(layer)!;
      const idx = nodesInLayer.indexOf(n);
      const x = maxLayer > 0 ? margin.left + (layer / maxLayer) * innerW : width / 2;
      const y = nodesInLayer.length > 1
        ? margin.top + (idx / (nodesInLayer.length - 1)) * innerH
        : height / 2;
      return { ...n, x, y };
    });

    const nodeMap = new Map(positionedNodes.map((n) => [n.id, n]));

    // Draw curved links
    const linkGen = d3.linkHorizontal<any, any>()
      .x((d: any) => d.x)
      .y((d: any) => d.y);

    g.append("g")
      .selectAll("path")
      .data(topology.links)
      .join("path")
      .attr("d", (l) => {
        const src = typeof l.source === "string" ? l.source : l.source.id;
        const tgt = typeof l.target === "string" ? l.target : l.target.id;
        const sn = nodeMap.get(src);
        const tn = nodeMap.get(tgt);
        if (!sn || !tn) return "";
        return linkGen({ source: sn, target: tn });
      })
      .attr("fill", "none")
      .attr("stroke", (l) => {
        return selectedStream && l.streams.includes(selectedStream) ? "#fff" : "#00ff9f";
      })
      .attr("stroke-opacity", (l) =>
        selectedStream ? (l.streams.includes(selectedStream) ? 1 : 0.1) : 0.4
      )
      .attr("stroke-width", (l) => Math.max(1, Math.min(l.count / 10, 5)))
      .attr("marker-end", "url(#arrow-h)");

    // Draw nodes
    const nodeG = g
      .append("g")
      .selectAll<SVGGElement, typeof positionedNodes[0]>("g")
      .data(positionedNodes)
      .join("g")
      .attr("transform", (d) => `translate(${d.x},${d.y})`);

    nodeG.each(function (d) {
      const el = d3.select(this);
      const color = NODE_COLORS[d.type] || "#00ff9f";
      const isHighlighted = selectedStream && d.streams.includes(selectedStream);
      const opacity = selectedStream ? (isHighlighted ? 1 : 0.2) : 1;

      if (d.type === "endpoint") {
        el.append("rect")
          .attr("x", -15).attr("y", -15).attr("width", 30).attr("height", 30)
          .attr("fill", "#0a0f0a").attr("stroke", color).attr("stroke-width", 2)
          .attr("opacity", opacity).style("filter", "url(#glow-h)");
      } else if (d.type === "gateway" || d.type === "dest-gateway") {
        el.append("polygon")
          .attr("points", "0,-18 18,0 0,18 -18,0")
          .attr("fill", "#0a0f0a").attr("stroke", color).attr("stroke-width", 2)
          .attr("opacity", opacity).style("filter", "url(#glow-h)");
      } else {
        el.append("circle")
          .attr("r", 15).attr("fill", "#0a0f0a").attr("stroke", color).attr("stroke-width", 2)
          .attr("opacity", opacity).style("filter", "url(#glow-h)");
      }

      el.append("text")
        .attr("dy", 30).attr("text-anchor", "middle")
        .attr("fill", color).attr("font-size", "9px").attr("font-family", "monospace")
        .attr("opacity", opacity).text(d.id);

      if (d.hostname) {
        el.append("text")
          .attr("dy", 42).attr("text-anchor", "middle")
          .attr("fill", "var(--text-muted)").attr("font-size", "8px").attr("opacity", opacity)
          .text(d.hostname.substring(0, 20));
      }
    });

    // Auto-fit
    const fitTimer = setTimeout(() => {
      const gNode = g.node();
      if (!gNode) return;
      const bounds = gNode.getBBox();
      const scale = 0.8 / Math.max(bounds.width / width, bounds.height / height);
      svg.transition().duration(500).call(
        zoom.transform,
        d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(Math.min(scale, 1))
          .translate(-bounds.x - bounds.width / 2, -bounds.y - bounds.height / 2)
      );
    }, 100);

    return () => {
      clearTimeout(fitTimer);
    };
  }, [topologyKey, viewMode, selectedStream]);

  // Highlight effect — updates existing D3 selections without rebuilding
  useEffect(() => {
    if (viewMode !== "graph") return;
    if (!linkSelRef.current || !nodeSelRef.current) return;

    linkSelRef.current
      .attr("stroke", (d: any) =>
        selectedStream && d.streams.includes(selectedStream) ? "#fff" : "#00ff9f"
      )
      .attr("stroke-opacity", (d: any) =>
        selectedStream ? (d.streams.includes(selectedStream) ? 1 : 0.1) : 0.4
      );

    nodeSelRef.current.each(function (d: any) {
      const el = d3.select(this);
      const isHighlighted = selectedStream && d.streams.includes(selectedStream);
      const opacity = selectedStream ? (isHighlighted ? 1 : 0.2) : 1;
      el.selectAll("rect, circle, polygon").attr("opacity", opacity);
      el.selectAll("text").attr("opacity", opacity);
    });
  }, [selectedStream, viewMode]);

  const selectedStreamData = selectedStream ? streams[selectedStream] : null;

  return (
    <div style={styles.routeTraceContainer}>
      <div style={styles.routeStreamPanel}>
        <div style={styles.routePanelHeader}>
          <span style={styles.routePanelTitle}>&#x27FF; ROUTE TRACES</span>
          <div style={styles.viewModeToggle}>
            <button
              onClick={() => setViewMode("graph")}
              style={{
                ...styles.viewModeBtn,
                ...(viewMode === "graph" ? styles.viewModeBtnActive : {}),
              }}
            >
              GRAPH
            </button>
            <button
              onClick={() => setViewMode("hierarchical")}
              style={{
                ...styles.viewModeBtn,
                ...(viewMode === "hierarchical" ? styles.viewModeBtnActive : {}),
              }}
            >
              STRUCTURED
            </button>
            <button
              onClick={() => setViewMode("list")}
              style={{
                ...styles.viewModeBtn,
                ...(viewMode === "list" ? styles.viewModeBtnActive : {}),
              }}
            >
              LIST
            </button>
          </div>
        </div>

        <div style={styles.routeStreamList}>
          {sortedStreams.length === 0 ? (
            <div style={styles.routeEmpty}>No routes captured yet</div>
          ) : (
            sortedStreams.map(([key, stream]) => (
              <div
                key={key}
                onClick={() =>
                  setSelectedStream(selectedStream === key ? null : key)
                }
                style={{
                  ...styles.routeStreamItem,
                  borderLeftColor: stream.color,
                  backgroundColor:
                    selectedStream === key
                      ? "rgba(0,255,159,0.1)"
                      : "transparent",
                }}
              >
                <div style={styles.routeStreamHeader}>
                  <span style={{ color: PROTOCOL_COLORS[stream.protocol] }}>
                    {stream.protocol}
                  </span>
                  <span style={styles.routeHopCount}>
                    {stream.route?.length || 0} hops
                  </span>
                </div>
                <div style={styles.routeStreamPath}>
                  {stream.srcIP} &rarr; {stream.dstIP}
                </div>
              </div>
            ))
          )}
        </div>

        {selectedStreamData && (
          <div style={styles.routeDetailPanel}>
            <div
              style={{
                ...styles.routeDetailTitle,
                color: selectedStreamData.color,
              }}
            >
              ROUTE DETAILS
            </div>
            <div style={styles.routeHopList}>
              <div style={styles.routeHopItem}>
                <span style={styles.hopNumber}>SRC</span>
                <span style={styles.hopIP}>{selectedStreamData.srcIP}</span>
                <span style={styles.hopType}>endpoint</span>
              </div>
              {selectedStreamData.route?.map((hop, i) => (
                <div key={i} style={styles.routeHopItem}>
                  <span style={styles.hopNumber}>{hop.hop}</span>
                  <span style={styles.hopIP}>{hop.ip}</span>
                  <span style={styles.hopRtt}>{hop.rtt.toFixed(1)}ms</span>
                  <span style={styles.hopType}>{hop.type}</span>
                </div>
              ))}
              <div style={styles.routeHopItem}>
                <span style={styles.hopNumber}>DST</span>
                <span style={styles.hopIP}>{selectedStreamData.dstIP}</span>
                <span style={styles.hopType}>endpoint</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div ref={containerRef} style={styles.routeGraphContainer}>
        {viewMode === "graph" || viewMode === "hierarchical" ? (
          topology.nodes.length === 0 ? (
            <EmptyState
              icon="&#x27FF;"
              message="No routes to visualize"
              subtext="Start capture to trace packet routes"
            />
          ) : (
            <svg ref={svgRef} style={styles.routeSvg} />
          )
        ) : (
          <div style={styles.routeListView}>
            {sortedStreams.map(([key, stream]) => (
              <div key={key} style={styles.routeListItem}>
                <div style={styles.routeListHeader}>
                  <span style={{ color: stream.color }}>&#x25CF;</span>
                  <span style={{ color: PROTOCOL_COLORS[stream.protocol] }}>
                    {stream.protocol}
                  </span>
                  <span>
                    {stream.srcIP}:{stream.srcPort} &rarr; {stream.dstIP}:
                    {stream.dstPort}
                  </span>
                </div>
                <div style={styles.routeListHops}>
                  <span style={styles.routeListEndpoint}>{stream.srcIP}</span>
                  {stream.route?.map((hop, i) => (
                    <React.Fragment key={i}>
                      <span style={styles.routeListArrow}>&rarr;</span>
                      <span style={styles.routeListHop} title={hop.hostname}>
                        {hop.ip}
                        <span style={styles.routeListRtt}>
                          {hop.rtt.toFixed(0)}ms
                        </span>
                      </span>
                    </React.Fragment>
                  ))}
                  <span style={styles.routeListArrow}>&rarr;</span>
                  <span style={styles.routeListEndpoint}>{stream.dstIP}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DraggablePanel title="NODE TYPES" defaultCorner="bottom-left" width={160}>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendShape, background: "#00ff9f" }}>
            &#x25A0;
          </span>{" "}
          Endpoint
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendShape, background: "#ffd600" }}>
            &#x25C6;
          </span>{" "}
          Gateway
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendShape, background: "#00b8ff" }}>
            &#x25CF;
          </span>{" "}
          ISP Router
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendShape, background: "#ff6b00" }}>
            &#x25CF;
          </span>{" "}
          Transit
        </div>
      </DraggablePanel>
    </div>
  );
}
