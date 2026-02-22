import { useState } from "react";
import { usePacketStore, ViewId } from "../../../hooks/usePacketStore";

interface ToolCard {
  id: ViewId | "settings";
  icon: string;
  title: string;
  accent: string;
  description: string;
  detail: string;
}

const toolCards: ToolCard[] = [
  {
    id: "packets",
    icon: "☰",
    title: "Packets",
    accent: "#00ff9f",
    description:
      "Browse captured packets in a sortable, filterable table.",
    detail:
      "Inspect individual packet headers, payloads, and metadata at a glance. Sort by time, protocol, source, destination, or length. Apply display filters to isolate specific traffic flows.",
  },
  {
    id: "structure",
    icon: "⬢",
    title: "Structure",
    accent: "#00b8ff",
    description:
      "Drill into the layered structure of any selected packet.",
    detail:
      "View protocol fields, flags, and raw hex side by side. Expand each protocol layer to see decoded values, field offsets, and bit-level flag breakdowns with the field encyclopedia.",
  },
  {
    id: "livewire",
    icon: "↯",
    title: "Livewire",
    accent: "#ff6b00",
    description:
      "Watch packets arrive in real time with a streaming live view.",
    detail:
      "Ideal for monitoring active captures as they happen. Packets scroll in automatically with color-coded protocols. Pause the stream at any time to inspect a specific burst of traffic.",
  },
  {
    id: "routetrace",
    icon: "⟿",
    title: "Route Trace",
    accent: "#00ffff",
    description:
      "Visualize the network path packets take between hosts.",
    detail:
      "Trace hops, latency, and routing decisions on an interactive map. Identify bottlenecks, asymmetric routes, and unexpected intermediaries in the forwarding path.",
  },
  {
    id: "matrix",
    icon: "▦",
    title: "Matrix",
    accent: "#9d00ff",
    description:
      "See all host-to-host conversations in a dense matrix grid.",
    detail:
      "Quickly identify the heaviest talkers and traffic patterns. Cell intensity maps to volume, letting you spot anomalies, port scans, or unusual lateral movement at a glance.",
  },
  {
    id: "sankey",
    icon: "⥤",
    title: "Sankey",
    accent: "#ffd600",
    description:
      "Explore traffic flow between sources, protocols, and destinations.",
    detail:
      "Interactive Sankey diagram shows bandwidth proportionally. Drag nodes, highlight flows, and drill into specific protocol or host pairs to understand where your traffic goes.",
  },
  {
    id: "sequence",
    icon: "↕",
    title: "Sequence",
    accent: "#ff3366",
    description:
      "Follow the chronological message exchange between endpoints.",
    detail:
      "Perfect for debugging handshake and request-response flows. See TCP SYN/ACK sequences, HTTP transactions, and DNS lookups laid out as a clear timeline diagram.",
  },
  {
    id: "topology",
    icon: "◎",
    title: "Topology",
    accent: "#00ff9f",
    description:
      "Map the discovered network topology as a hierarchical graph.",
    detail:
      "Visualize subnets, gateways, and device relationships. Nodes are grouped by network segment with edges showing observed communication paths and traffic volume.",
  },
  {
    id: "services",
    icon: "⚙",
    title: "Services",
    accent: "#00b8ff",
    description:
      "Identify running network services detected across all hosts.",
    detail:
      "View port mappings, protocols, and service fingerprints. Discover open services, TLS versions, and server banners extracted from captured handshake traffic.",
  },
  {
    id: "plugins",
    icon: "⚡",
    title: "Plugins",
    accent: "#ff6b00",
    description:
      "Extend NexusInspector with community and custom plugins.",
    detail:
      "Manage, configure, and monitor active plugin modules. Load custom dissectors, protocol analyzers, and visualization extensions to tailor the tool to your workflow.",
  },
  {
    id: "stats",
    icon: "◈",
    title: "Stats",
    accent: "#ffd600",
    description:
      "Deep-dive into capture statistics and protocol distribution.",
    detail:
      "Top talkers, TCP flags, anomaly detection, and throughput charts. Analyze bandwidth over time, compare protocol ratios, and export summary reports.",
  },
  {
    id: "settings",
    icon: "⛭",
    title: "Settings",
    accent: "#8a9bb2",
    description:
      "Configure color schemes, themes, and application preferences.",
    detail:
      "Switch between Nexus, Dark, and Light color schemes. Toggle grid overlays, adjust opacity levels, and other visual parameters to customize your workspace.",
  },
];

export function Dashboard() {
  const setActiveView = usePacketStore((s) => s.setActiveView);
  const setShowSettings = usePacketStore((s) => s.setShowSettings);
  const [hoveredId, setHoveredId] = useState<ToolCard["id"] | null>(null);

  const handleClick = (card: ToolCard) => {
    if (card.id === "settings") {
      setShowSettings(true);
    } else {
      setActiveView(card.id);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        padding: "20px",
        overflow: "auto",
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "14px",
        alignContent: "start",
      }}
    >
      {toolCards.map((card) => {
        const isHovered = hoveredId === card.id;
        return (
          <button
            key={card.id}
            onClick={() => handleClick(card)}
            onMouseEnter={() => setHoveredId(card.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              background: isHovered
                ? `linear-gradient(135deg, ${card.accent}0a 0%, ${card.accent}03 100%)`
                : "var(--bg-surface)",
              borderWidth: "2px 1px 1px 1px",
              borderStyle: "solid",
              borderTopColor: card.accent,
              borderRightColor: isHovered ? card.accent : "var(--border-strong)",
              borderBottomColor: isHovered ? card.accent : "var(--border-strong)",
              borderLeftColor: isHovered ? card.accent : "var(--border-strong)",
              borderRadius: "6px",
              padding: "24px",
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              transition: "all 0.25s ease",
              transform: isHovered ? "translateY(-4px)" : "none",
              boxShadow: isHovered
                ? `0 8px 24px ${card.accent}22, 0 0 12px ${card.accent}18`
                : "none",
              minHeight: isHovered ? "160px" : "120px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <span
                style={{
                  fontSize: "24px",
                  lineHeight: 1,
                  color: card.accent,
                  filter: isHovered ? `drop-shadow(0 0 6px ${card.accent})` : "none",
                  transition: "filter 0.25s ease",
                }}
              >
                {card.icon}
              </span>
              <span
                style={{
                  fontFamily: "'Orbitron'",
                  fontSize: "13px",
                  fontWeight: 800,
                  letterSpacing: "1.5px",
                  color: isHovered ? card.accent : "var(--text-primary)",
                  transition: "color 0.25s ease",
                }}
              >
                {card.title.toUpperCase()}
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                fontWeight: 500,
                lineHeight: "1.6",
                color: isHovered ? "var(--text-primary)" : "var(--text-secondary)",
                transition: "color 0.25s ease",
              }}
            >
              {card.description}
            </p>
            {isHovered && (
              <p
                style={{
                  margin: 0,
                  fontSize: "11px",
                  fontWeight: 500,
                  lineHeight: "1.6",
                  color: "var(--text-muted)",
                  borderTop: `1px solid ${card.accent}22`,
                  paddingTop: "10px",
                }}
              >
                {card.detail}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
