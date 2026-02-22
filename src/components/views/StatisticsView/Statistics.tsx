import { useMemo } from "react";
import { usePacketStore } from "../../../hooks/usePacketStore";
import { styles } from "../../../styles/components";
import { PROTOCOL_COLORS } from "../../../styles/theme";
import { formatBytes, PORT_SERVICE_NAMES } from "../../../lib/formatters";

export function Statistics() {
  const stats = usePacketStore((s) => s.stats);
  const streams = usePacketStore((s) => s.streams);
  const packets = usePacketStore((s) => s.packets);
  const dashboardStats = usePacketStore((s) => s.dashboardStats);

  const computed = useMemo(() => {
    const sizes = packets.map((p) => p.length);
    const totalBytes = sizes.reduce((a, b) => a + b, 0);
    const avgSize = sizes.length > 0 ? totalBytes / sizes.length : 0;
    const minSize = sizes.length > 0 ? Math.min(...sizes) : 0;
    const maxSize = sizes.length > 0 ? Math.max(...sizes) : 0;
    const medianSize = sizes.length > 0
      ? [...sizes].sort((a, b) => a - b)[Math.floor(sizes.length / 2)]
      : 0;

    // Throughput
    const timestamps = packets.map((p) => p.time);
    const durationMs = timestamps.length >= 2
      ? timestamps[timestamps.length - 1] - timestamps[0]
      : 0;
    const durationSec = durationMs / 1000;
    const throughputBps = durationSec > 0 ? totalBytes / durationSec : 0;
    const pps = durationSec > 0 ? packets.length / durationSec : 0;

    // TCP vs UDP breakdown
    let tcpCount = 0;
    let udpCount = 0;
    let tcpBytes = 0;
    let udpBytes = 0;
    let synCount = 0;
    let finCount = 0;
    let rstCount = 0;
    let ackCount = 0;
    let pshCount = 0;
    let retransmissions = 0;

    const seenSeqs = new Set<string>();
    packets.forEach((p) => {
      if (p.isUdp) {
        udpCount++;
        udpBytes += p.length;
      } else {
        tcpCount++;
        tcpBytes += p.length;
        if (p.tcp?.flags) {
          if (p.tcp.flags.syn) synCount++;
          if (p.tcp.flags.fin) finCount++;
          if (p.tcp.flags.rst) rstCount++;
          if (p.tcp.flags.ack) ackCount++;
          if (p.tcp.flags.psh) pshCount++;
        }
        // Simple retransmission estimate
        if (p.tcp) {
          const seqKey = `${p.ip.srcIp}:${p.srcPort}-${p.tcp.sequenceNumber}`;
          if (seenSeqs.has(seqKey)) retransmissions++;
          else seenSeqs.add(seqKey);
        }
      }
    });

    // Top source IPs
    const srcIps: Record<string, number> = {};
    const dstIps: Record<string, number> = {};
    const conversations: Record<string, { packets: number; bytes: number }> = {};
    packets.forEach((p) => {
      srcIps[p.ip.srcIp] = (srcIps[p.ip.srcIp] || 0) + 1;
      dstIps[p.ip.dstIp] = (dstIps[p.ip.dstIp] || 0) + 1;
      const convKey = [p.ip.srcIp, p.ip.dstIp].sort().join(" <-> ");
      if (!conversations[convKey]) conversations[convKey] = { packets: 0, bytes: 0 };
      conversations[convKey].packets++;
      conversations[convKey].bytes += p.length;
    });

    const topSrcIps = Object.entries(srcIps).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const topDstIps = Object.entries(dstIps).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const topConversations = Object.entries(conversations)
      .sort((a, b) => b[1].bytes - a[1].bytes)
      .slice(0, 8);

    // Port distribution
    const topPorts = Object.entries(stats.ports)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // TTL distribution
    const ttlBuckets: Record<string, number> = {};
    packets.forEach((p) => {
      const bucket = `${Math.floor(p.ip.ttl / 16) * 16}-${Math.floor(p.ip.ttl / 16) * 16 + 15}`;
      ttlBuckets[bucket] = (ttlBuckets[bucket] || 0) + 1;
    });

    // Stream stats
    const streamEntries = Object.values(streams);
    const avgStreamDuration = streamEntries.length > 0
      ? streamEntries.reduce((a, s) => a + (s.lastTime - s.startTime), 0) / streamEntries.length / 1000
      : 0;
    const avgStreamPackets = streamEntries.length > 0
      ? streamEntries.reduce((a, s) => a + s.packets.length, 0) / streamEntries.length
      : 0;

    return {
      totalBytes, avgSize, minSize, maxSize, medianSize,
      throughputBps, pps, durationSec,
      tcpCount, udpCount, tcpBytes, udpBytes,
      synCount, finCount, rstCount, ackCount, pshCount, retransmissions,
      topSrcIps, topDstIps, topConversations, topPorts,
      ttlBuckets,
      avgStreamDuration, avgStreamPackets,
    };
  }, [packets, streams, stats]);

  const protocolData = Object.entries(stats.protocols)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
  const maxProto = Math.max(...protocolData.map((d) => d[1]), 1);

  const cardStyle: React.CSSProperties = {
    backgroundColor: "rgba(0,255,159,0.03)",
    border: "1px solid rgba(0,255,159,0.1)",
    borderRadius: "6px",
    padding: "14px",
  };
  const cardTitle: React.CSSProperties = {
    fontFamily: "'Orbitron'",
    fontSize: "10px",
    color: "#00ff9f",
    marginBottom: "12px",
    letterSpacing: "1px",
  };
  const statRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    padding: "4px 0",
    borderBottom: "1px solid rgba(255,255,255,0.03)",
    fontSize: "10px",
  };

  return (
    <div style={{ ...styles.statsContainer, display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Top summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "10px" }}>
        {[
          { value: stats.total.toLocaleString(), label: "TOTAL PACKETS" },
          { value: formatBytes(computed.totalBytes), label: "TOTAL BYTES" },
          { value: `${formatBytes(computed.throughputBps)}/s`, label: "THROUGHPUT" },
          { value: computed.pps.toFixed(1), label: "PACKETS/SEC" },
          { value: Object.keys(streams).length.toString(), label: "STREAMS" },
          { value: `${computed.durationSec.toFixed(1)}s`, label: "DURATION" },
        ].map((item) => (
          <div key={item.label} style={styles.summaryCard}>
            <div style={{ ...styles.summaryValue, fontSize: "18px" }}>{item.value}</div>
            <div style={styles.summaryLabel}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Second row: Packet size stats + TCP/UDP breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
        {/* Packet Size Stats */}
        <div style={cardStyle}>
          <div style={cardTitle}>PACKET SIZE STATISTICS</div>
          {[
            { label: "Average", value: `${computed.avgSize.toFixed(0)} B` },
            { label: "Median", value: `${computed.medianSize} B` },
            { label: "Minimum", value: `${computed.minSize} B` },
            { label: "Maximum", value: `${computed.maxSize} B` },
            { label: "Std Dev", value: `${packets.length > 1 ? Math.sqrt(packets.reduce((a, p) => a + (p.length - computed.avgSize) ** 2, 0) / packets.length).toFixed(0) : 0} B` },
          ].map((row) => (
            <div key={row.label} style={statRow}>
              <span style={{ color: "#888" }}>{row.label}</span>
              <span style={{ color: "#fff", fontFamily: "monospace" }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* TCP/UDP Breakdown */}
        <div style={cardStyle}>
          <div style={cardTitle}>TRANSPORT LAYER</div>
          {[
            { label: "TCP Packets", value: computed.tcpCount.toLocaleString(), color: "#00ff9f" },
            { label: "UDP Packets", value: computed.udpCount.toLocaleString(), color: "#00b8ff" },
            { label: "TCP Bytes", value: formatBytes(computed.tcpBytes), color: "#00ff9f" },
            { label: "UDP Bytes", value: formatBytes(computed.udpBytes), color: "#00b8ff" },
            { label: "TCP Ratio", value: `${stats.total > 0 ? ((computed.tcpCount / stats.total) * 100).toFixed(1) : 0}%`, color: "#888" },
          ].map((row) => (
            <div key={row.label} style={statRow}>
              <span style={{ color: "#888" }}>{row.label}</span>
              <span style={{ color: row.color, fontFamily: "monospace" }}>{row.value}</span>
            </div>
          ))}
          {/* TCP/UDP bar */}
          <div style={{ marginTop: "8px", height: "8px", borderRadius: "4px", overflow: "hidden", display: "flex", backgroundColor: "rgba(0,0,0,0.3)" }}>
            <div style={{ width: `${stats.total > 0 ? (computed.tcpCount / stats.total) * 100 : 50}%`, backgroundColor: "#00ff9f", transition: "width 0.3s" }} />
            <div style={{ flex: 1, backgroundColor: "#00b8ff" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", color: "#555", marginTop: "2px" }}>
            <span>TCP</span>
            <span>UDP</span>
          </div>
        </div>

        {/* TCP Flags */}
        <div style={cardStyle}>
          <div style={cardTitle}>TCP FLAGS</div>
          {[
            { label: "SYN", value: computed.synCount, color: "#00ff9f" },
            { label: "ACK", value: computed.ackCount, color: "#00b8ff" },
            { label: "FIN", value: computed.finCount, color: "#ffd600" },
            { label: "RST", value: computed.rstCount, color: "#ff3366" },
            { label: "PSH", value: computed.pshCount, color: "#ff6b00" },
            { label: "Est. Retransmit", value: computed.retransmissions, color: "#ff00ff" },
          ].map((row) => {
            const max = Math.max(computed.synCount, computed.ackCount, computed.finCount, computed.rstCount, computed.pshCount, 1);
            return (
              <div key={row.label} style={{ ...statRow, alignItems: "center" }}>
                <span style={{ color: row.color, width: "90px" }}>{row.label}</span>
                <div style={{ flex: 1, height: "6px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "3px", overflow: "hidden", margin: "0 8px" }}>
                  <div style={{ width: `${(row.value / max) * 100}%`, height: "100%", backgroundColor: row.color, borderRadius: "3px" }} />
                </div>
                <span style={{ color: "#888", fontFamily: "monospace", width: "40px", textAlign: "right" }}>{row.value}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Third row: Protocols + Top Conversations + Stream Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
        {/* Protocol Distribution */}
        <div style={cardStyle}>
          <div style={cardTitle}>PROTOCOL DISTRIBUTION</div>
          {protocolData.map(([proto, count]) => (
            <div key={proto} style={styles.barRow}>
              <span style={{ width: 50, color: PROTOCOL_COLORS[proto], fontSize: "10px" }}>{proto}</span>
              <div style={styles.barContainer}>
                <div
                  style={{
                    ...styles.bar,
                    width: `${(count / maxProto) * 100}%`,
                    backgroundColor: PROTOCOL_COLORS[proto],
                  }}
                />
              </div>
              <span style={{ width: 40, textAlign: "right" as const, color: "#888", fontSize: "10px" }}>
                {count}
              </span>
              <span style={{ width: 40, textAlign: "right" as const, color: "#555", fontSize: "9px" }}>
                {stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : 0}%
              </span>
            </div>
          ))}
        </div>

        {/* Top Conversations */}
        <div style={cardStyle}>
          <div style={cardTitle}>TOP CONVERSATIONS</div>
          {computed.topConversations.map(([conv, data]) => {
            const maxConvBytes = computed.topConversations[0]?.[1].bytes || 1;
            return (
              <div key={conv} style={{ marginBottom: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px" }}>
                  <span style={{ color: "#888", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}>{conv}</span>
                  <span style={{ color: "#666", flexShrink: 0 }}>{formatBytes(data.bytes)}</span>
                </div>
                <div style={{ height: "4px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "2px", overflow: "hidden", marginTop: "2px" }}>
                  <div style={{ width: `${(data.bytes / maxConvBytes) * 100}%`, height: "100%", backgroundColor: "#9d00ff", borderRadius: "2px" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Stream Statistics */}
        <div style={cardStyle}>
          <div style={cardTitle}>STREAM STATISTICS</div>
          {[
            { label: "Total Streams", value: Object.keys(streams).length.toString() },
            { label: "Active IPs", value: Object.keys(stats.ips).length.toString() },
            { label: "Unique Ports", value: Object.keys(stats.ports).length.toString() },
            { label: "Avg Stream Duration", value: `${computed.avgStreamDuration.toFixed(1)}s` },
            { label: "Avg Pkts/Stream", value: computed.avgStreamPackets.toFixed(1) },
            { label: "Bytes/Protocol (top)", value: (() => {
              const top = Object.entries(dashboardStats.bytesPerProtocol).sort((a, b) => b[1] - a[1])[0];
              return top ? `${top[0]}: ${formatBytes(top[1])}` : "-";
            })() },
          ].map((row) => (
            <div key={row.label} style={statRow}>
              <span style={{ color: "#888" }}>{row.label}</span>
              <span style={{ color: "#fff", fontFamily: "monospace" }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Fourth row: Src IPs + Dst IPs + Port Distribution */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
        {/* Top Source IPs */}
        <div style={cardStyle}>
          <div style={cardTitle}>TOP SOURCE IPs</div>
          {computed.topSrcIps.map(([ip, count]) => {
            const max = computed.topSrcIps[0]?.[1] || 1;
            return (
              <div key={ip} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <span style={{ width: "100px", fontSize: "9px", color: "#888", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis" }}>{ip}</span>
                <div style={{ flex: 1, height: "8px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ width: `${(count / max) * 100}%`, height: "100%", backgroundColor: "#00b8ff", borderRadius: "3px" }} />
                </div>
                <span style={{ width: "30px", fontSize: "9px", color: "#666", textAlign: "right" }}>{count}</span>
              </div>
            );
          })}
        </div>

        {/* Top Destination IPs */}
        <div style={cardStyle}>
          <div style={cardTitle}>TOP DESTINATION IPs</div>
          {computed.topDstIps.map(([ip, count]) => {
            const max = computed.topDstIps[0]?.[1] || 1;
            return (
              <div key={ip} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <span style={{ width: "100px", fontSize: "9px", color: "#888", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis" }}>{ip}</span>
                <div style={{ flex: 1, height: "8px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ width: `${(count / max) * 100}%`, height: "100%", backgroundColor: "#ff6b00", borderRadius: "3px" }} />
                </div>
                <span style={{ width: "30px", fontSize: "9px", color: "#666", textAlign: "right" }}>{count}</span>
              </div>
            );
          })}
        </div>

        {/* Port Distribution */}
        <div style={cardStyle}>
          <div style={cardTitle}>PORT DISTRIBUTION</div>
          {computed.topPorts.map(([port, count]) => {
            const max = computed.topPorts[0]?.[1] || 1;
            const service = PORT_SERVICE_NAMES[Number(port)] || `Port ${port}`;
            return (
              <div key={port} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <span style={{ width: "70px", fontSize: "9px", color: "#888" }}>{service}</span>
                <span style={{ width: "36px", fontSize: "8px", color: "#555", fontFamily: "monospace" }}>:{port}</span>
                <div style={{ flex: 1, height: "8px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ width: `${(count / max) * 100}%`, height: "100%", backgroundColor: "#ffd600", borderRadius: "3px" }} />
                </div>
                <span style={{ width: "30px", fontSize: "9px", color: "#666", textAlign: "right" }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fifth row: TTL distribution + Anomaly summary + Bytes per protocol */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
        {/* TTL Distribution */}
        <div style={cardStyle}>
          <div style={cardTitle}>TTL DISTRIBUTION</div>
          {Object.entries(computed.ttlBuckets)
            .sort((a, b) => {
              const aStart = parseInt(a[0]);
              const bStart = parseInt(b[0]);
              return aStart - bStart;
            })
            .map(([bucket, count]) => {
              const max = Math.max(...Object.values(computed.ttlBuckets), 1);
              return (
                <div key={bucket} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                  <span style={{ width: "50px", fontSize: "9px", color: "#888", fontFamily: "monospace" }}>{bucket}</span>
                  <div style={{ flex: 1, height: "8px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${(count / max) * 100}%`, height: "100%", backgroundColor: "#00ffff", borderRadius: "3px" }} />
                  </div>
                  <span style={{ width: "30px", fontSize: "9px", color: "#666", textAlign: "right" }}>{count}</span>
                </div>
              );
            })}
        </div>

        {/* Anomaly Summary */}
        <div style={cardStyle}>
          <div style={cardTitle}>ANOMALY SUMMARY</div>
          {[
            { label: "RST Flags Detected", value: dashboardStats.anomalies.rstCount, color: dashboardStats.anomalies.rstCount > 20 ? "#ff3366" : dashboardStats.anomalies.rstCount > 5 ? "#ffd600" : "#00ff9f" },
            { label: "Oversized Packets (>1500B)", value: dashboardStats.anomalies.oversizedCount, color: dashboardStats.anomalies.oversizedCount > 10 ? "#ff3366" : dashboardStats.anomalies.oversizedCount > 3 ? "#ffd600" : "#00ff9f" },
            { label: "Unusual Ports", value: dashboardStats.anomalies.unusualPortCount, color: dashboardStats.anomalies.unusualPortCount > 30 ? "#ff3366" : dashboardStats.anomalies.unusualPortCount > 10 ? "#ffd600" : "#00ff9f" },
            { label: "Est. Retransmissions", value: computed.retransmissions, color: computed.retransmissions > 20 ? "#ff3366" : computed.retransmissions > 5 ? "#ffd600" : "#00ff9f" },
          ].map((row) => (
            <div key={row.label} style={{ ...statRow, alignItems: "center" }}>
              <span style={{ color: "#888", flex: 1 }}>{row.label}</span>
              <span style={{ fontFamily: "'Orbitron'", fontSize: "14px", color: row.color }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Bytes per Protocol */}
        <div style={cardStyle}>
          <div style={cardTitle}>BYTES PER PROTOCOL</div>
          {Object.entries(dashboardStats.bytesPerProtocol)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([proto, bytes]) => {
              const max = Object.values(dashboardStats.bytesPerProtocol).reduce((a, b) => Math.max(a, b), 1);
              return (
                <div key={proto} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <span style={{ width: "50px", fontSize: "9px", color: PROTOCOL_COLORS[proto] || "#888" }}>{proto}</span>
                  <div style={{ flex: 1, height: "8px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${(bytes / max) * 100}%`, height: "100%", backgroundColor: PROTOCOL_COLORS[proto] || "#00ff9f", borderRadius: "3px" }} />
                  </div>
                  <span style={{ width: "50px", fontSize: "9px", color: "#666", textAlign: "right" }}>{formatBytes(bytes)}</span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
