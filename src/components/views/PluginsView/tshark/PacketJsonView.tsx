import { useState, useCallback } from "react";
import { LAYER_COLORS } from "../../../../styles/theme";

interface Props {
  data: unknown;
}

const LAYER_KEYS: Record<string, keyof typeof LAYER_COLORS> = {
  eth: "ethernet",
  ip: "ip",
  tcp: "tcp",
  udp: "udp",
  data: "payload",
  frame: "ethernet",
};

export function PacketJsonView({ data }: Props) {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <div style={{ color: "var(--text-faint)", fontSize: "11px", textAlign: "center", padding: "20px" }}>
        No packet data
      </div>
    );
  }

  const packets = Array.isArray(data) ? data : [data];

  return (
    <div>
      <div
        style={{
          fontFamily: "'Orbitron'",
          fontSize: "10px",
          color: "var(--accent)",
          marginBottom: "12px",
          letterSpacing: "0.5px",
        }}
      >
        PACKET JSON ({packets.length} packets)
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {packets.slice(0, 50).map((pkt, i) => (
          <PacketItem key={i} index={i} data={pkt} />
        ))}
        {packets.length > 50 && (
          <div style={{ color: "var(--text-muted)", fontSize: "10px", textAlign: "center", padding: "8px" }}>
            Showing first 50 of {packets.length} packets
          </div>
        )}
      </div>
    </div>
  );
}

function PacketItem({ index, data }: { index: number; data: unknown }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "4px",
        overflow: "hidden",
      }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "6px 10px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          backgroundColor: "var(--bg-surface)",
          fontSize: "10px",
        }}
      >
        <span style={{ color: "var(--text-dim)" }}>{expanded ? "\u25BC" : "\u25B6"}</span>
        <span style={{ color: "var(--text-muted)", fontFamily: "'Share Tech Mono', monospace" }}>
          Packet #{index + 1}
        </span>
      </div>
      {expanded && (
        <div style={{ padding: "8px 12px" }}>
          <JsonTree value={data} depth={0} keyPath="" />
        </div>
      )}
    </div>
  );
}

function JsonTree({ value, depth, keyPath }: { value: unknown; depth: number; keyPath: string }) {
  const [collapsed, setCollapsed] = useState(depth > 2);

  const getLayerColor = useCallback((key: string) => {
    const parts = key.toLowerCase().split(".");
    for (const part of parts) {
      const layerKey = LAYER_KEYS[part];
      if (layerKey && LAYER_COLORS[layerKey]) return LAYER_COLORS[layerKey].text;
    }
    return null;
  }, []);

  if (value === null || value === undefined) {
    return <span style={{ color: "var(--text-dim)" }}>null</span>;
  }

  if (typeof value === "string") {
    return (
      <span style={{ color: "#ffd600", fontSize: "10px", fontFamily: "'Share Tech Mono', monospace" }}>
        &quot;{value.length > 200 ? value.slice(0, 200) + "..." : value}&quot;
      </span>
    );
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return (
      <span style={{ color: "#00b8ff", fontSize: "10px", fontFamily: "'Share Tech Mono', monospace" }}>
        {String(value)}
      </span>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span style={{ color: "var(--text-dim)" }}>[]</span>;

    return (
      <div style={{ paddingLeft: depth > 0 ? "16px" : "0" }}>
        <span
          onClick={() => setCollapsed(!collapsed)}
          style={{ cursor: "pointer", color: "var(--text-dim)", fontSize: "10px" }}
        >
          {collapsed ? "\u25B6" : "\u25BC"} [{value.length} items]
        </span>
        {!collapsed &&
          value.slice(0, 20).map((item, i) => (
            <div key={i} style={{ paddingLeft: "16px", marginTop: "2px" }}>
              <span style={{ color: "var(--text-dim)", fontSize: "9px" }}>{i}: </span>
              <JsonTree value={item} depth={depth + 1} keyPath={`${keyPath}[${i}]`} />
            </div>
          ))}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span style={{ color: "var(--text-dim)" }}>{"{}"}</span>;

    return (
      <div style={{ paddingLeft: depth > 0 ? "16px" : "0" }}>
        <span
          onClick={() => setCollapsed(!collapsed)}
          style={{ cursor: "pointer", color: "var(--text-dim)", fontSize: "10px" }}
        >
          {collapsed ? "\u25B6" : "\u25BC"} {"{"}
          {entries.length}
          {"}"}
        </span>
        {!collapsed &&
          entries.map(([key, val]) => {
            const layerColor = getLayerColor(key);
            return (
              <div key={key} style={{ paddingLeft: "16px", marginTop: "2px" }}>
                <span
                  style={{
                    color: layerColor || "#ff6b00",
                    fontSize: "10px",
                    fontFamily: "'Share Tech Mono', monospace",
                    fontWeight: layerColor ? "bold" : "normal",
                  }}
                >
                  {key}
                </span>
                <span style={{ color: "var(--text-dim)" }}>: </span>
                <JsonTree value={val} depth={depth + 1} keyPath={`${keyPath}.${key}`} />
              </div>
            );
          })}
      </div>
    );
  }

  return <span style={{ color: "var(--text-dim)" }}>{String(value)}</span>;
}
