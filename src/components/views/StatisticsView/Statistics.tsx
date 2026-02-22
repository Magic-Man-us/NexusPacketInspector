import { usePacketStore } from "../../../hooks/usePacketStore";
import { styles } from "../../../styles/components";
import { PROTOCOL_COLORS } from "../../../styles/theme";

export function Statistics() {
  const stats = usePacketStore((s) => s.stats);
  const streams = usePacketStore((s) => s.streams);

  const protocolData = Object.entries(stats.protocols)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxProto = Math.max(...protocolData.map((d) => d[1]), 1);

  return (
    <div style={styles.statsContainer}>
      <div style={styles.summaryCards}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{stats.total}</div>
          <div style={styles.summaryLabel}>PACKETS</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{Object.keys(streams).length}</div>
          <div style={styles.summaryLabel}>STREAMS</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{Object.keys(stats.ips).length}</div>
          <div style={styles.summaryLabel}>IPs</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{Object.keys(stats.protocols).length}</div>
          <div style={styles.summaryLabel}>PROTOCOLS</div>
        </div>
      </div>
      <div style={styles.chartCard}>
        <div style={styles.chartTitle}>PROTOCOL DISTRIBUTION</div>
        {protocolData.map(([proto, count]) => (
          <div key={proto} style={styles.barRow}>
            <span style={{ width: 60, color: PROTOCOL_COLORS[proto] }}>{proto}</span>
            <div style={styles.barContainer}>
              <div
                style={{
                  ...styles.bar,
                  width: `${(count / maxProto) * 100}%`,
                  backgroundColor: PROTOCOL_COLORS[proto],
                }}
              />
            </div>
            <span style={{ width: 40, textAlign: "right" as const, color: "#888" }}>
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
