import { useMemo } from "react";
import { usePluginStore } from "../../../hooks/usePluginStore";
import { PluginCategory, PluginInfo } from "../../../types/plugin";

interface Props {
  selected: string | null;
  onSelect: (name: string) => void;
}

const CATEGORY_META: Record<PluginCategory, { label: string; icon: string }> = {
  networkScanning: { label: "NETWORK SCANNING", icon: "\u25C9" },
  packetAnalysis: { label: "PACKET ANALYSIS", icon: "\u25A3" },
  trafficMonitoring: { label: "TRAFFIC MONITORING", icon: "\u25B6" },
  intrusionDetection: { label: "INTRUSION DETECTION", icon: "\u25C6" },
};

const CATEGORY_ORDER: PluginCategory[] = [
  "networkScanning",
  "packetAnalysis",
  "trafficMonitoring",
  "intrusionDetection",
];

export function PluginSelector({ selected, onSelect }: Props) {
  const plugins = usePluginStore((s) => s.plugins);
  const runningPlugin = usePluginStore((s) => s.runningPlugin);

  const grouped = useMemo(() => {
    const map = new Map<PluginCategory, PluginInfo[]>();
    for (const p of plugins) {
      const cat = p.category || "networkScanning";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return map;
  }, [plugins]);

  return (
    <div
      style={{
        width: "240px",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid var(--border)",
          fontFamily: "'Orbitron'",
          fontSize: "11px",
          color: "var(--accent)",
          letterSpacing: "1px",
        }}
      >
        PLUGINS
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {CATEGORY_ORDER.map((cat) => {
          const items = grouped.get(cat);
          if (!items || items.length === 0) return null;
          const meta = CATEGORY_META[cat];

          return (
            <div key={cat}>
              <div
                style={{
                  padding: "10px 14px 4px",
                  fontSize: "8px",
                  fontFamily: "'Orbitron'",
                  color: "var(--text-muted)",
                  letterSpacing: "1.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>{meta.icon}</span>
                {meta.label}
              </div>

              {items.map((plugin) => {
                const isSelected = selected === plugin.name;
                const isRunning = runningPlugin === plugin.name;

                return (
                  <div
                    key={plugin.name}
                    onClick={() => onSelect(plugin.name)}
                    style={{
                      padding: "10px 14px",
                      borderBottom: "1px solid rgba(255,255,255,0.02)",
                      cursor: "pointer",
                      backgroundColor: isSelected
                        ? "rgba(var(--accent-rgb),0.08)"
                        : "transparent",
                      borderLeft: isSelected
                        ? "3px solid var(--accent)"
                        : "3px solid transparent",
                      transition: "background-color 0.15s",
                      ...(isRunning
                        ? { boxShadow: "inset 0 0 12px rgba(0,255,255,0.06)" }
                        : {}),
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.backgroundColor = "var(--bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "4px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "bold",
                          color: isSelected ? "var(--accent)" : "var(--text-primary)",
                          textTransform: "uppercase",
                        }}
                      >
                        {plugin.name}
                      </span>
                      <span
                        style={{
                          width: "7px",
                          height: "7px",
                          borderRadius: "50%",
                          backgroundColor: isRunning
                            ? "#00ffff"
                            : plugin.available
                            ? "#00ff9f"
                            : "#ff3366",
                          boxShadow: isRunning ? "0 0 6px #00ffff" : "none",
                          animation: isRunning
                            ? "pluginPulse 1.5s ease-in-out infinite"
                            : "none",
                        }}
                      />
                    </div>
                    <div style={{ fontSize: "9px", color: "var(--text-muted)", lineHeight: "1.3" }}>
                      {plugin.description}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "3px",
                        flexWrap: "wrap",
                        marginTop: "6px",
                      }}
                    >
                      {plugin.capabilities.slice(0, 4).map((cap) => (
                        <span
                          key={cap}
                          style={{
                            fontSize: "7px",
                            padding: "1px 5px",
                            backgroundColor: "rgba(0,184,255,0.08)",
                            color: "#00b8ff",
                            borderRadius: "2px",
                            letterSpacing: "0.3px",
                          }}
                        >
                          {cap}
                        </span>
                      ))}
                      {plugin.capabilities.length > 4 && (
                        <span style={{ fontSize: "7px", padding: "1px 5px", color: "var(--text-dim)" }}>
                          +{plugin.capabilities.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
        {plugins.length === 0 && (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              color: "var(--text-faint)",
              fontSize: "11px",
            }}
          >
            No plugins registered
          </div>
        )}
      </div>

      <style>{`
        @keyframes pluginPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
