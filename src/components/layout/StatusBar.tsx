import { usePacketStore } from "../../hooks/usePacketStore";
import { useFilteredPackets } from "../../hooks/useFilteredPackets";
import { styles } from "../../styles/components";

export function StatusBar() {
  const isCapturing = usePacketStore((s) => s.isCapturing);
  const packets = usePacketStore((s) => s.packets);
  const streams = usePacketStore((s) => s.streams);
  const mode = usePacketStore((s) => s.mode);
  const isLoading = usePacketStore((s) => s.isLoading);
  const filteredPackets = useFilteredPackets();
  const streamCount = Object.keys(streams).length;

  return (
    <footer style={styles.statusBar}>
      <div style={styles.statusLeft}>
        <span
          style={{
            ...styles.statusIndicator,
            backgroundColor: isCapturing || isLoading ? "#00ff9f" : "#666",
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
