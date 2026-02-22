import { usePluginStore } from "../../../hooks/usePluginStore";

interface Props {
  selected: string | null;
  onSelect: (name: string) => void;
}

export function PluginSelector({ selected, onSelect }: Props) {
  const plugins = usePluginStore((s) => s.plugins);

  return (
    <div
      style={{
        width: "220px",
        borderRight: "1px solid rgba(0,255,159,0.1)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: "12px",
          borderBottom: "1px solid rgba(0,255,159,0.1)",
          fontFamily: "'Orbitron'",
          fontSize: "11px",
          color: "#00ff9f",
        }}
      >
        PLUGINS
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {plugins.map((plugin) => (
          <div
            key={plugin.name}
            onClick={() => onSelect(plugin.name)}
            style={{
              padding: "12px",
              borderBottom: "1px solid rgba(255,255,255,0.03)",
              cursor: "pointer",
              backgroundColor:
                selected === plugin.name
                  ? "rgba(0,255,159,0.08)"
                  : "transparent",
              borderLeft:
                selected === plugin.name
                  ? "3px solid #00ff9f"
                  : "3px solid transparent",
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
                  color: selected === plugin.name ? "#00ff9f" : "#ccc",
                  textTransform: "uppercase",
                }}
              >
                {plugin.name}
              </span>
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: plugin.available ? "#00ff9f" : "#ff3366",
                }}
              />
            </div>
            <div style={{ fontSize: "9px", color: "#666" }}>
              {plugin.description}
            </div>
            <div
              style={{
                display: "flex",
                gap: "4px",
                flexWrap: "wrap",
                marginTop: "6px",
              }}
            >
              {plugin.capabilities.map((cap) => (
                <span
                  key={cap}
                  style={{
                    fontSize: "8px",
                    padding: "1px 5px",
                    backgroundColor: "rgba(0,184,255,0.1)",
                    color: "#00b8ff",
                    borderRadius: "2px",
                  }}
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>
        ))}
        {plugins.length === 0 && (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              color: "#444",
              fontSize: "11px",
            }}
          >
            No plugins registered
          </div>
        )}
      </div>
    </div>
  );
}
