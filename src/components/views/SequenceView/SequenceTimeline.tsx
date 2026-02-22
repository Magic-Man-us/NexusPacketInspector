import React, { useMemo, useState } from "react";
import { styles } from "../../../styles/components";
import { PROTOCOL_COLORS } from "../../../styles/theme";
import { usePacketStore } from "../../../hooks/usePacketStore";
import { EmptyState } from "../../shared/EmptyState";
import { formatTCPFlags } from "../../../lib/formatters";
import type { StreamData } from "../../../types/stream";

export function SequenceTimeline() {
  const streams = usePacketStore((s) => s.streams);

  const [selectedStream, setSelectedStream] = useState<string | null>(null);

  const sortedStreams = useMemo(() => {
    return Object.entries(streams)
      .sort((a, b) => b[1].packets.length - a[1].packets.length)
      .slice(0, 20);
  }, [streams]);

  const streamData = selectedStream ? streams[selectedStream] : null;

  return (
    <div style={styles.sequenceContainer}>
      <div style={styles.sequenceStreamPanel}>
        <div style={styles.sequencePanelHeader}>
          &#x2195; SELECT STREAM
        </div>
        <div style={styles.sequenceStreamList}>
          {sortedStreams.map(([key, stream]) => (
            <div
              key={key}
              onClick={() => setSelectedStream(key)}
              style={{
                ...styles.sequenceStreamItem,
                borderLeftColor: stream.color,
                backgroundColor:
                  selectedStream === key
                    ? "rgba(0,255,159,0.1)"
                    : "transparent",
              }}
            >
              <span style={{ color: PROTOCOL_COLORS[stream.protocol] }}>
                {stream.protocol}
              </span>
              <span style={styles.sequenceStreamPkts}>
                {stream.packets.length}
              </span>
              <div style={styles.sequenceStreamIPs}>
                {stream.srcIP} &#x2194; {stream.dstIP}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.sequenceMain}>
        {!streamData ? (
          <EmptyState
            icon="&#x2195;"
            message="Select a stream to view sequence"
          />
        ) : (
          <div style={styles.sequenceDiagram}>
            <div style={styles.sequenceHeaders}>
              <div style={styles.sequenceTimeCol}>TIME</div>
              <div style={styles.sequenceEndpoint}>
                <div
                  style={{
                    ...styles.sequenceEndpointBox,
                    borderColor: streamData.color,
                  }}
                >
                  {streamData.srcIP}
                  <div style={styles.sequencePort}>:{streamData.srcPort}</div>
                </div>
              </div>
              <div style={styles.sequenceMiddle}></div>
              <div style={styles.sequenceEndpoint}>
                <div
                  style={{
                    ...styles.sequenceEndpointBox,
                    borderColor: streamData.color,
                  }}
                >
                  {streamData.dstIP}
                  <div style={styles.sequencePort}>:{streamData.dstPort}</div>
                </div>
              </div>
              <div style={styles.sequenceInfoCol}>INFO</div>
            </div>
            <div style={styles.sequenceBody}>
              <div style={styles.sequenceLifelines}>
                <div
                  style={{ ...styles.sequenceLifeline, left: "25%" } as React.CSSProperties}
                />
                <div
                  style={{ ...styles.sequenceLifeline, left: "75%" } as React.CSSProperties}
                />
              </div>
              {streamData.packets.map((pkt, i) => {
                const isForward = pkt.ip.srcIp === streamData.srcIP;
                const flags = pkt.tcp?.flags
                  ? formatTCPFlags(pkt.tcp.flags)
                  : "";
                return (
                  <div key={i} style={styles.sequenceMessage}>
                    <div style={styles.sequenceTimeCell}>
                      {new Date(pkt.timestamp).toLocaleTimeString()}
                    </div>
                    <div style={styles.sequenceArrowContainer}>
                      <div
                        style={{
                          ...styles.sequenceArrow,
                          left: "25%",
                          right: "25%",
                          flexDirection: isForward ? "row" : "row-reverse",
                          background: `linear-gradient(${isForward ? "90deg" : "270deg"}, ${streamData.color}aa, ${streamData.color}22)`,
                        } as React.CSSProperties}
                      >
                        <div
                          style={{
                            ...styles.sequenceArrowHead,
                            borderLeftColor: isForward
                              ? streamData.color
                              : "transparent",
                            borderRightColor: isForward
                              ? "transparent"
                              : streamData.color,
                          }}
                        />
                      </div>
                      <div style={styles.sequenceArrowLabel}>
                        {flags && (
                          <span style={styles.sequenceFlags}>{flags}</span>
                        )}
                        <span style={styles.sequenceLen}>{pkt.length}B</span>
                      </div>
                    </div>
                    <div style={styles.sequenceInfoCell}>
                      {pkt.tcp &&
                        `Seq: ${pkt.tcp.sequenceNumber % 10000}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
