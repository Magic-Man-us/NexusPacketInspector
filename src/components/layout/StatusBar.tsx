import { usePacketStore } from "../../hooks/usePacketStore";
import { useFilteredPackets } from "../../hooks/useFilteredPackets";
import { styles } from "../../styles/components";

export function StatusBar() {
  const isCapturing = usePacketStore((s) => s.isCapturing);
  const packetCount = usePacketStore((s) => s.packets.length);
  const streamCount = usePacketStore((s) => Object.keys(s.streams).length);
  const mode = usePacketStore((s) => s.mode);
  const isLoading = usePacketStore((s) => s.isLoading);
  const filteredPackets = useFilteredPackets();

  return (
    <footer style={styles.statusBar}>
      <div style={styles.statusLeft}>
        <span
          style={{
            ...styles.statusIndicator,
            backgroundColor: isCapturing || isLoading ? "var(--accent)" : "var(--text-muted)",
          }}
        />
        {isLoading ? "LOADING..." : isCapturing ? "CAPTURING" : "IDLE"}
        {mode === "pcap" && " [PCAP]"}
      </div>
      <div>
        {filteredPackets.length} packets • {streamCount} streams
      </div>
      <div style={styles.statusRight}>NEXUS v4.0</div>
    </footer>
  );
}
