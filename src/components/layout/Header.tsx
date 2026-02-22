import { usePacketStore } from "../../hooks/usePacketStore";
import { usePcapActions } from "../../hooks/useTauriCapture";
import { styles } from "../../styles/components";
import { NexusLogo } from "../shared/NexusLogo";

export function Header() {
  const isCapturing = usePacketStore((s) => s.isCapturing);
  const setIsCapturing = usePacketStore((s) => s.setIsCapturing);
  const filter = usePacketStore((s) => s.filter);
  const setFilter = usePacketStore((s) => s.setFilter);
  const stats = usePacketStore((s) => s.stats);
  const streamCount = usePacketStore((s) => Object.keys(s.streams).length);
  const showSettings = usePacketStore((s) => s.showSettings);
  const setShowSettings = usePacketStore((s) => s.setShowSettings);
  const mode = usePacketStore((s) => s.mode);
  const setMode = usePacketStore((s) => s.setMode);
  const clearPackets = usePacketStore((s) => s.clearPackets);
  const resetStats = usePacketStore((s) => s.resetStats);
  const resetStreams = usePacketStore((s) => s.resetStreams);
  const { openPcapFile } = usePcapActions();

  const clearCapture = () => {
    clearPackets();
    resetStats();
    resetStreams();
  };

  return (
    <header style={styles.header}>
      <div style={styles.logoSection}>
        <div style={styles.logoIcon}>
          <NexusLogo size={36} />
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
          style={{ ...styles.controlButton, background: '#00b8ff', color: 'var(--bg-primary)' }}
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
            color: showSettings ? "var(--accent)" : "var(--text-secondary)",
            borderColor: showSettings ? "var(--accent)" : "rgba(255,255,255,0.2)",
          }}
        >
          ⚙ FX
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
        <a
          href="https://github.com/Magic-Man-us/NexusPacketInspector"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--text-muted)', transition: 'color 0.2s', display: 'flex', alignItems: 'center' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          title="View on GitHub"
        >
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </a>
      </div>
    </header>
  );
}
