import { usePacketStore, VisualEffects } from "../../hooks/usePacketStore";
import { styles } from "../../styles/components";
import { FONT } from "../../styles/typography";
import { ColorScheme } from "../../styles/theme";

const SCHEMES: { id: ColorScheme; label: string; preview: string }[] = [
  { id: "nexus", label: "NEXUS", preview: "#00ff9f" },
  { id: "dark", label: "DARK", preview: "#7c83ff" },
  { id: "light", label: "LIGHT", preview: "#2563eb" },
];

export function SettingsPanel() {
  const visualEffects = usePacketStore((s) => s.visualEffects);
  const setVisualEffects = usePacketStore((s) => s.setVisualEffects);
  const setShowSettings = usePacketStore((s) => s.setShowSettings);

  const updateEffect = <K extends keyof VisualEffects>(key: K, value: VisualEffects[K]) => {
    setVisualEffects({ ...visualEffects, [key]: value });
  };

  return (
    <div style={styles.settingsPanel}>
      <div style={styles.settingsHeader}>
        <span style={styles.settingsTitle}>SETTINGS</span>
        <button onClick={() => setShowSettings(false)} style={styles.settingsClose}>
          x
        </button>
      </div>

      <div style={styles.settingsContent}>
        {/* Color Scheme */}
        <div style={styles.settingsGroup}>
          <div style={styles.settingsLabel}>Color Scheme</div>
          <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
            {SCHEMES.map((s) => {
              const isActive = visualEffects.colorScheme === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => updateEffect("colorScheme", s.id)}
                  style={{
                    flex: 1,
                    padding: "10px 4px",
                    borderWidth: "2px",
                    borderStyle: "solid",
                    borderColor: isActive ? s.preview : "rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    background: isActive
                      ? `${s.preview}15`
                      : "rgba(0,0,0,0.2)",
                    color: isActive ? s.preview : "var(--text-muted)",
                    fontFamily: FONT.family.display,
                    fontSize: FONT.size.sm,
                    fontWeight: FONT.weight.bold,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    flexDirection: "column" as const,
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      backgroundColor: s.preview,
                      boxShadow: isActive ? `0 0 10px ${s.preview}66` : "none",
                    }}
                  />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sequence FX */}
        <div style={styles.settingsGroup}>
          <div style={styles.settingsLabel}>Sequence FX</div>
          <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
            {([
              { id: "river" as const, label: "RIVER", desc: "Multi-layer dashed streams" },
              { id: "arrows" as const, label: "ARROWS", desc: "Flowing chevron arrows" },
            ]).map((fx) => {
              const isActive = visualEffects.sequenceFx === fx.id;
              return (
                <button
                  key={fx.id}
                  onClick={() => updateEffect("sequenceFx", fx.id)}
                  style={{
                    flex: 1,
                    padding: "10px 4px",
                    borderWidth: "2px",
                    borderStyle: "solid",
                    borderColor: isActive ? "var(--accent)" : "rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    background: isActive
                      ? "rgba(0,255,159,0.08)"
                      : "rgba(0,0,0,0.2)",
                    color: isActive ? "var(--accent)" : "var(--text-muted)",
                    fontFamily: FONT.family.display,
                    fontSize: FONT.size.sm,
                    fontWeight: FONT.weight.bold,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    flexDirection: "column" as const,
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {fx.label}
                  <span style={{ fontSize: FONT.size.xxs, opacity: 0.6, fontFamily: "sans-serif", fontWeight: FONT.weight.normal }}>
                    {fx.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid */}
        <div style={styles.settingsGroup}>
          <div style={styles.settingsRow}>
            <span style={styles.settingsLabel}>Matrix Grid</span>
            <button
              onClick={() => updateEffect("grid", !visualEffects.grid)}
              style={{
                ...styles.toggleButton,
                backgroundColor: visualEffects.grid ? "var(--accent)" : "var(--bg-secondary)",
                color: visualEffects.grid ? "#000" : "var(--text-muted)",
              }}
            >
              {visualEffects.grid ? "ON" : "OFF"}
            </button>
          </div>
          {visualEffects.grid && (
            <div style={styles.settingsRow}>
              <span style={styles.settingsSubLabel}>Opacity</span>
              <input
                type="range"
                min="0.01"
                max="0.1"
                step="0.005"
                value={visualEffects.gridOpacity}
                onChange={(e) => updateEffect("gridOpacity", parseFloat(e.target.value))}
                style={styles.slider}
              />
              <span style={styles.sliderValue}>
                {Math.round(visualEffects.gridOpacity * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
