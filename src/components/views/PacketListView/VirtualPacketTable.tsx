import { useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useShallow } from "zustand/react/shallow";
import { ParsedPacket } from "../../../types/packet";
import { usePacketStore } from "../../../hooks/usePacketStore";
import { styles } from "../../../styles/components";
import { PROTOCOL_COLORS } from "../../../styles/theme";
import { FONT } from "../../../styles/typography";
import { formatTCPFlags } from "../../../lib/formatters";

interface Props {
  packets: ParsedPacket[];
}

export function VirtualPacketTable({ packets }: Props) {
  const selectedPacket = usePacketStore((s) => s.selectedPacket);
  const setSelectedPacket = usePacketStore((s) => s.setSelectedPacket);
  const streamColors = usePacketStore(
    useShallow((s) => {
      const colors: Record<string, string | undefined> = {};
      for (const key in s.streams) {
        colors[key] = s.streams[key].color;
      }
      return colors;
    })
  );
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: packets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 30,
    overscan: 20,
  });

  // Auto-scroll to bottom when new packets arrive in demo mode
  const mode = usePacketStore((s) => s.mode);
  const virtualizerRef = useRef(virtualizer);
  virtualizerRef.current = virtualizer;
  useEffect(() => {
    if (mode === "demo" && packets.length > 0) {
      virtualizerRef.current.scrollToIndex(packets.length - 1, { align: "end" });
    }
  }, [packets.length, mode]);

  return (
    <div style={styles.packetList}>
      <div style={styles.tableHeader}>
        <span style={{ ...styles.tableCell, width: "50px" }}>ID</span>
        <span style={{ ...styles.tableCell, width: "80px" }}>TIME</span>
        <span style={{ ...styles.tableCell, width: "50px" }}>PROTO</span>
        <span style={{ ...styles.tableCell, width: "120px" }}>SOURCE</span>
        <span style={{ ...styles.tableCell, width: "120px" }}>DEST</span>
        <span style={{ ...styles.tableCell, width: "50px" }}>LEN</span>
        <span style={{ ...styles.tableCell, flex: 1 }}>INFO</span>
      </div>
      <div
        ref={parentRef}
        style={{ ...styles.tableBody, position: "relative" }}
      >
        {packets.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>&#9678;</div>
            <div>No packets</div>
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const pkt = packets[virtualRow.index];
              return (
                <div
                  key={pkt.id}
                  onClick={() => setSelectedPacket(pkt)}
                  style={{
                    ...styles.tableRow,
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    backgroundColor:
                      selectedPacket?.id === pkt.id
                        ? "rgba(0,255,159,0.15)"
                        : "transparent",
                    borderLeft: `3px solid ${
                      streamColors[pkt.streamKey] ||
                      PROTOCOL_COLORS[pkt.protocol] ||
                      "#00ff9f"
                    }`,
                  }}
                >
                  <span style={{ ...styles.tableCell, width: "50px", color: "var(--text-muted)" }}>
                    {pkt.id}
                  </span>
                  <span style={{ ...styles.tableCell, width: "80px", fontSize: FONT.size.md }}>
                    {new Date(pkt.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    style={{
                      ...styles.tableCell,
                      width: "50px",
                      color: PROTOCOL_COLORS[pkt.protocol],
                      fontWeight: FONT.weight.bold,
                    }}
                  >
                    {pkt.protocol}
                  </span>
                  <span
                    style={{
                      ...styles.tableCell,
                      width: "120px",
                      fontSize: FONT.size.md,
                      fontFamily: FONT.family.mono,
                    }}
                  >
                    {pkt.ip.srcIp}
                  </span>
                  <span
                    style={{
                      ...styles.tableCell,
                      width: "120px",
                      fontSize: FONT.size.md,
                      fontFamily: FONT.family.mono,
                    }}
                  >
                    {pkt.ip.dstIp}
                  </span>
                  <span style={{ ...styles.tableCell, width: "50px" }}>{pkt.length}</span>
                  <span style={{ ...styles.tableCell, flex: 1, color: "var(--text-secondary)" }}>
                    {pkt.tcp?.flags && (
                      <span style={styles.flag}>{formatTCPFlags(pkt.tcp.flags)}</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
