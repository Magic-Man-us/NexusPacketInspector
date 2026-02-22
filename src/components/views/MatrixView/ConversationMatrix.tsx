import React, { useMemo, useState } from "react";
import { styles } from "../../../styles/components";
import { usePacketStore } from "../../../hooks/usePacketStore";
import { EmptyState } from "../../shared/EmptyState";
import type { ParsedPacket } from "../../../types/packet";

interface Conversation {
  src: string;
  dst: string;
  packets: number;
  bytes: number;
  protocols: Set<string>;
}

interface MatrixData {
  conversations: Conversation[];
  ips: string[];
}

type SortBy = "packets" | "bytes";

export function ConversationMatrix() {
  const packets = usePacketStore((s) => s.packets);
  const stats = usePacketStore((s) => s.stats);

  const [sortBy, setSortBy] = useState<SortBy>("packets");

  const matrixData = useMemo<MatrixData>(() => {
    const conversations: Record<string, Conversation> = {};
    packets.forEach((p) => {
      const key = `${p.ip.srcIp}|${p.ip.dstIp}`;
      if (!conversations[key]) {
        conversations[key] = {
          src: p.ip.srcIp,
          dst: p.ip.dstIp,
          packets: 0,
          bytes: 0,
          protocols: new Set(),
        };
      }
      conversations[key].packets++;
      conversations[key].bytes += p.length;
      conversations[key].protocols.add(p.protocol);
    });

    const ips = [
      ...new Set(packets.flatMap((p) => [p.ip.srcIp, p.ip.dstIp])),
    ];
    ips.sort((a, b) => (stats.ips[b] || 0) - (stats.ips[a] || 0));

    return {
      conversations: Object.values(conversations),
      ips: ips.slice(0, 15),
    };
  }, [packets, stats]);

  const maxValue = Math.max(
    ...matrixData.conversations.map((c) =>
      sortBy === "packets" ? c.packets : c.bytes
    ),
    1
  );

  return (
    <div style={styles.matrixContainer}>
      <div style={styles.matrixHeader}>
        <span style={styles.matrixTitle}>&#x25A6; CONVERSATION MATRIX</span>
        <div style={styles.matrixControls}>
          <button
            onClick={() => setSortBy("packets")}
            style={{
              ...styles.matrixSortBtn,
              ...(sortBy === "packets" ? styles.matrixSortBtnActive : {}),
            }}
          >
            PACKETS
          </button>
          <button
            onClick={() => setSortBy("bytes")}
            style={{
              ...styles.matrixSortBtn,
              ...(sortBy === "bytes" ? styles.matrixSortBtnActive : {}),
            }}
          >
            BYTES
          </button>
        </div>
      </div>

      {matrixData.ips.length === 0 ? (
        <EmptyState icon="&#x25A6;" message="No conversations yet" />
      ) : (
        <div style={styles.matrixGrid}>
          <div style={styles.matrixRow}>
            <div style={styles.matrixCorner}>SRC &rarr; DST</div>
            {matrixData.ips.map((ip) => (
              <div key={ip} style={styles.matrixColHeader} title={ip}>
                {ip.split(".").slice(-2).join(".")}
              </div>
            ))}
          </div>
          {matrixData.ips.map((srcIp) => (
            <div key={srcIp} style={styles.matrixRow}>
              <div style={styles.matrixRowHeader} title={srcIp}>
                {srcIp.split(".").slice(-2).join(".")}
              </div>
              {matrixData.ips.map((dstIp) => {
                const conv = matrixData.conversations.find(
                  (c) => c.src === srcIp && c.dst === dstIp
                );
                const value = conv
                  ? sortBy === "packets"
                    ? conv.packets
                    : conv.bytes
                  : 0;
                const intensity = value / maxValue;
                return (
                  <div
                    key={dstIp}
                    style={{
                      ...styles.matrixCell,
                      backgroundColor:
                        value > 0
                          ? `rgba(0, 255, 159, ${intensity * 0.8 + 0.1})`
                          : "rgba(255,255,255,0.02)",
                    }}
                    title={
                      conv
                        ? `${conv.packets} pkts, ${(conv.bytes / 1024).toFixed(1)}KB`
                        : "No traffic"
                    }
                  >
                    {value > 0 && (
                      <span
                        style={{
                          color: intensity > 0.5 ? "#000" : "#00ff9f",
                          fontSize: "9px",
                        }}
                      >
                        {sortBy === "packets"
                          ? value
                          : `${(value / 1024).toFixed(0)}K`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
      <div style={styles.matrixScale}>
        <span>0</span>
        <div style={styles.matrixScaleGradient} />
        <span>
          {sortBy === "packets"
            ? maxValue
            : `${(maxValue / 1024).toFixed(0)}KB`}
        </span>
      </div>
    </div>
  );
}
