import { useState } from "react";
import { usePacketStore, ViewId } from "../../../hooks/usePacketStore";

interface ToolCard {
  id: ViewId;
  icon: string;
  title: string;
  accent: string;
  description: string;
}

const toolCards: ToolCard[] = [
  {
    id: "packets",
    icon: "☰",
    title: "Packets",
    accent: "#00ff9f",
    description:
      "Browse captured packets in a sortable, filterable table. Inspect individual packet headers, payloads, and metadata at a glance.",
  },
  {
    id: "structure",
    icon: "⬢",
    title: "Structure",
    accent: "#00b8ff",
    description:
      "Drill into the layered structure of any selected packet. View protocol fields, flags, and raw hex side by side.",
  },
  {
    id: "livewire",
    icon: "↯",
    title: "Livewire",
    accent: "#ff6b00",
    description:
      "Watch packets arrive in real time with a streaming live view. Ideal for monitoring active captures as they happen.",
  },
  {
    id: "routetrace",
    icon: "⟿",
    title: "Route Trace",
    accent: "#00ffff",
    description:
      "Visualize the network path packets take between hosts. Trace hops, latency, and routing decisions on an interactive map.",
  },
  {
    id: "matrix",
    icon: "▦",
    title: "Matrix",
    accent: "#9d00ff",
    description:
      "See all host-to-host conversations in a dense matrix grid. Quickly identify the heaviest talkers and traffic patterns.",
  },
  {
    id: "sankey",
    icon: "⥤",
    title: "Sankey",
    accent: "#ffd600",
    description:
      "Explore traffic flow between sources, protocols, and destinations with an interactive Sankey diagram.",
  },
  {
    id: "sequence",
    icon: "↕",
    title: "Sequence",
    accent: "#ff3366",
    description:
      "Follow the chronological message exchange between endpoints. Perfect for debugging handshake and request-response flows.",
  },
  {
    id: "topology",
    icon: "◎",
    title: "Topology",
    accent: "#00ff9f",
    description:
      "Map the discovered network topology as a hierarchical graph. Visualize subnets, gateways, and device relationships.",
  },
  {
    id: "services",
    icon: "⚙",
    title: "Services",
    accent: "#00b8ff",
    description:
      "Identify running network services detected across all hosts. View port mappings, protocols, and service fingerprints.",
  },
  {
    id: "plugins",
    icon: "⚡",
    title: "Plugins",
    accent: "#ff6b00",
    description:
      "Extend NexusInspector with community and custom plugins. Manage, configure, and monitor active plugin modules.",
  },
  {
    id: "stats",
    icon: "◈",
    title: "Stats",
    accent: "#ffd600",
    description:
      "Deep-dive into capture statistics: protocol distribution, top talkers, TCP flags, anomaly detection, and throughput charts.",
  },
];

export function Dashboard() {
  const setActiveView = usePacketStore((s) => s.setActiveView);
  const [hoveredId, setHoveredId] = useState<ViewId | null>(null);

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
      {toolCards.map((card) => {
        const isHovered = hoveredId === card.id;
        return (
          <button
            key={card.id}
            onClick={() => setActiveView(card.id)}
            onMouseEnter={() => setHoveredId(card.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              background: "rgba(0,255,159,0.03)",
              borderStyle: "solid",
              borderColor: isHovered ? card.accent : "rgba(0,255,159,0.15)",
              borderWidth: "1px",
              borderTopColor: card.accent,
              borderTopWidth: "2px",
              borderRadius: "6px",
              padding: "20px",
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              transition: "all 0.25s ease",
              transform: isHovered ? "translateY(-4px)" : "none",
              boxShadow: isHovered
                ? `0 8px 24px ${card.accent}22, 0 0 12px ${card.accent}18`
                : "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span
                style={{
                  fontSize: "22px",
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
                  fontSize: "12px",
                  letterSpacing: "1.5px",
                  color: isHovered ? card.accent : "#ccc",
                  transition: "color 0.25s ease",
                }}
              >
                {card.title.toUpperCase()}
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                lineHeight: "1.5",
                color: "#777",
              }}
            >
              {card.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
