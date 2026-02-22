import { useMemo } from "react";
import { usePacketStore } from "../../../hooks/usePacketStore";
import { styles } from "../../../styles/components";
import { PROTOCOL_COLORS } from "../../../styles/theme";

export function ServiceMap() {
  const packets = usePacketStore((s) => s.packets);
  const stats = usePacketStore((s) => s.stats);

  const services = useMemo(() => {
    const svcMap: Record<
      string,
      {
        name: string;
        port: number;
        packets: number;
        bytes: number;
        sources: Set<string>;
        protocols: Set<string>;
      }
    > = {};
    const portNames: Record<number, string> = {
      80: "HTTP",
      443: "HTTPS",
      22: "SSH",
      21: "FTP",
      25: "SMTP",
      53: "DNS",
      3306: "MySQL",
      5432: "PostgreSQL",
      6379: "Redis",
      27017: "MongoDB",
      8080: "HTTP-Alt",
      8443: "HTTPS-Alt",
    };

    packets.forEach((p) => {
      const port = p.dstPort;
      const svcName =
        portNames[port] || (port < 1024 ? `Port ${port}` : "Ephemeral");
      if (!svcMap[svcName]) {
        svcMap[svcName] = {
          name: svcName,
          port,
          packets: 0,
          bytes: 0,
          sources: new Set(),
          protocols: new Set(),
        };
      }
      svcMap[svcName].packets++;
      svcMap[svcName].bytes += p.length;
      svcMap[svcName].sources.add(p.ip.srcIp);
      svcMap[svcName].protocols.add(p.protocol);
    });

    return Object.values(svcMap)
      .map((s) => ({
        ...s,
        sources: s.sources.size,
        protocols: Array.from(s.protocols),
      }))
      .sort((a, b) => b.packets - a.packets)
      .slice(0, 12);
  }, [packets]);

  const maxPackets = Math.max(...services.map((s) => s.packets), 1);

  return (
    <div style={styles.servicesContainer}>
      <div style={styles.servicesHeader}>
        <span style={styles.servicesTitle}>&#x2699; SERVICE MAP</span>
      </div>
      {services.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>&#x2699;</div>
          <div>No services detected</div>
        </div>
      ) : (
        <div style={styles.servicesGrid}>
          {services.map((svc) => (
            <div key={svc.name} style={styles.serviceCard}>
              <div style={styles.serviceHeader}>
                <span style={styles.serviceName}>{svc.name}</span>
                <span style={styles.servicePort}>:{svc.port}</span>
              </div>
              <div style={styles.serviceBar}>
                <div
                  style={{
                    ...styles.serviceBarFill,
                    width: `${(svc.packets / maxPackets) * 100}%`,
                  }}
                />
              </div>
              <div style={styles.serviceStats}>
                <div style={styles.serviceStat}>
                  <span style={styles.serviceStatValue}>{svc.packets}</span>
                  <span style={styles.serviceStatLabel}>packets</span>
                </div>
                <div style={styles.serviceStat}>
                  <span style={styles.serviceStatValue}>
                    {(svc.bytes / 1024).toFixed(1)}K
                  </span>
                  <span style={styles.serviceStatLabel}>bytes</span>
                </div>
                <div style={styles.serviceStat}>
                  <span style={styles.serviceStatValue}>{svc.sources}</span>
                  <span style={styles.serviceStatLabel}>sources</span>
                </div>
              </div>
              <div style={styles.serviceProtocols}>
                {svc.protocols.map((p) => (
                  <span
                    key={p}
                    style={{
                      ...styles.serviceProtocolTag,
                      color: PROTOCOL_COLORS[p],
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
