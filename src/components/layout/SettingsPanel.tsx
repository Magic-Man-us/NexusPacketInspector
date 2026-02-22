import { usePacketStore, VisualEffects } from "../../hooks/usePacketStore";
import { styles } from "../../styles/components";

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
        <span style={styles.settingsTitle}>⚙ VISUAL EFFECTS</span>
        <button onClick={() => setShowSettings(false)} style={styles.settingsClose}>
          ✕
        </button>
      </div>

      <div style={styles.settingsContent}>
        {/* Scanline */}
        <div style={styles.settingsGroup}>
          <div style={styles.settingsRow}>
            <span style={styles.settingsLabel}>Scanline</span>
            <button
              onClick={() => updateEffect("scanline", !visualEffects.scanline)}
              style={{
                ...styles.toggleButton,
                backgroundColor: visualEffects.scanline ? "#00ff9f" : "#333",
                color: visualEffects.scanline ? "#000" : "#666",
              }}
            >
              {visualEffects.scanline ? "ON" : "OFF"}
            </button>
          </div>
          {visualEffects.scanline && (
            <div style={styles.settingsRow}>
              <span style={styles.settingsSubLabel}>Speed</span>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={visualEffects.scanlineSpeed}
                onChange={(e) => updateEffect("scanlineSpeed", parseFloat(e.target.value))}
                style={styles.slider}
              />
              <span style={styles.sliderValue}>{visualEffects.scanlineSpeed}s</span>
            </div>
          )}
        </div>

        {/* CRT Effect */}
        <div style={styles.settingsGroup}>
          <div style={styles.settingsRow}>
            <span style={styles.settingsLabel}>CRT Lines</span>
            <button
              onClick={() => updateEffect("crt", !visualEffects.crt)}
              style={{
                ...styles.toggleButton,
                backgroundColor: visualEffects.crt ? "#00ff9f" : "#333",
                color: visualEffects.crt ? "#000" : "#666",
              }}
            >
              {visualEffects.crt ? "ON" : "OFF"}
            </button>
          </div>
          {visualEffects.crt && (
            <div style={styles.settingsRow}>
              <span style={styles.settingsSubLabel}>Intensity</span>
              <input
                type="range"
                min="0.02"
                max="0.3"
                step="0.02"
                value={visualEffects.crtIntensity}
                onChange={(e) => updateEffect("crtIntensity", parseFloat(e.target.value))}
                style={styles.slider}
              />
              <span style={styles.sliderValue}>
                {Math.round(visualEffects.crtIntensity * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Grid */}
        <div style={styles.settingsGroup}>
          <div style={styles.settingsRow}>
            <span style={styles.settingsLabel}>Matrix Grid</span>
            <button
              onClick={() => updateEffect("grid", !visualEffects.grid)}
              style={{
                ...styles.toggleButton,
                backgroundColor: visualEffects.grid ? "#00ff9f" : "#333",
                color: visualEffects.grid ? "#000" : "#666",
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

        {/* Presets */}
        <div style={styles.settingsGroup}>
          <div style={styles.settingsLabel}>Presets</div>
          <div style={styles.presetButtons}>
            <button
              onClick={() =>
                setVisualEffects({
                  scanline: true, scanlineSpeed: 4, crt: true, crtIntensity: 0.1, grid: true, gridOpacity: 0.02,
                })
              }
              style={styles.presetButton}
            >
              CYBER
            </button>
            <button
              onClick={() =>
                setVisualEffects({
                  scanline: true, scanlineSpeed: 2, crt: true, crtIntensity: 0.2, grid: true, gridOpacity: 0.05,
                })
              }
              style={styles.presetButton}
            >
              RETRO
            </button>
            <button
              onClick={() =>
                setVisualEffects({
                  scanline: false, scanlineSpeed: 4, crt: false, crtIntensity: 0.1, grid: false, gridOpacity: 0.02,
                })
              }
              style={styles.presetButton}
            >
              CLEAN
            </button>
            <button
              onClick={() =>
                setVisualEffects({
                  scanline: true, scanlineSpeed: 1, crt: true, crtIntensity: 0.25, grid: true, gridOpacity: 0.08,
                })
              }
              style={styles.presetButton}
            >
              HEAVY
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
