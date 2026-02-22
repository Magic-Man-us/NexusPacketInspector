import { usePacketStore } from "../../hooks/usePacketStore";
import { useTauriCapture } from "../../hooks/useTauriCapture";
import { styles } from "../../styles/components";

export function Header() {
  const isCapturing = usePacketStore((s) => s.isCapturing);
  const setIsCapturing = usePacketStore((s) => s.setIsCapturing);
  const filter = usePacketStore((s) => s.filter);
  const setFilter = usePacketStore((s) => s.setFilter);
  const stats = usePacketStore((s) => s.stats);
  const streams = usePacketStore((s) => s.streams);
  const showSettings = usePacketStore((s) => s.showSettings);
  const setShowSettings = usePacketStore((s) => s.setShowSettings);
  const mode = usePacketStore((s) => s.mode);
  const setMode = usePacketStore((s) => s.setMode);
  const clearPackets = usePacketStore((s) => s.clearPackets);
  const resetStats = usePacketStore((s) => s.resetStats);
  const resetStreams = usePacketStore((s) => s.resetStreams);
  const { openPcapFile } = useTauriCapture();

  const clearCapture = () => {
    clearPackets();
    resetStats();
    resetStreams();
  };

  const streamCount = Object.keys(streams).length;

  return (
    <header style={styles.header}>
      <div style={styles.logoSection}>
        <div style={styles.logoIcon}>
          <svg viewBox="0 0 40 40" style={{ width: 36, height: 36 }}>
            <circle cx="20" cy="20" r="18" fill="none" stroke="#00ff9f" strokeWidth="2" />
            <circle cx="20" cy="20" r="10" fill="none" stroke="#00ff9f" strokeWidth="1" opacity="0.5" />
            <circle cx="20" cy="20" r="4" fill="#00ff9f" />
          </svg>
        </div>
        <div>
          <h1 style={styles.logoText}>NEXUS</h1>
          <span style={styles.logoSubtext}>PACKET INSPECTOR v4.0</span>
        </div>
      </div>

      <div style={styles.controls}>
        <div style={styles.searchContainer}>
          <span style={styles.searchIcon}>⌕</span>
          <input
            type="text"
            placeholder="Filter..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <button
          onClick={openPcapFile}
          style={{ ...styles.controlButton, background: '#00b8ff', color: '#0a0f0a' }}
        >
          OPEN PCAP
        </button>
        {mode === "demo" && (
          <button
            onClick={() => setIsCapturing(!isCapturing)}
            style={{
              ...styles.controlButton,
              ...(isCapturing ? styles.stopButton : styles.startButton),
            }}
          >
            {isCapturing ? (
              <>
                <span style={styles.pulsingDot} />
                STOP
              </>
            ) : (
              "▶ DEMO"
            )}
          </button>
        )}
        <button onClick={clearCapture} style={styles.clearButton}>
          ✕ CLEAR
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            ...styles.clearButton,
            color: showSettings ? "#00ff9f" : "#888",
            borderColor: showSettings ? "#00ff9f" : "rgba(255,255,255,0.2)",
          }}
        >
          ⚙ FX
        </button>
      </div>

      <div style={styles.statsPreview}>
        <div style={styles.statItem}>
          <span style={styles.statValue}>{stats.total.toLocaleString()}</span>
          <span style={styles.statLabel}>PACKETS</span>
        </div>
        <div style={styles.statItem}>
          <span style={{ ...styles.statValue, color: "#00b8ff" }}>{streamCount}</span>
          <span style={styles.statLabel}>STREAMS</span>
        </div>
      </div>
    </header>
  );
}
