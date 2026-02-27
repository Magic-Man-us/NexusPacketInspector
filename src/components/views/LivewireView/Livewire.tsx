import React, { useMemo, useState } from "react";
import { usePacketStore } from "../../../hooks/usePacketStore";
import { styles } from "../../../styles/components";
import { PROTOCOL_COLORS } from "../../../styles/theme";
import { FONT } from "../../../styles/typography";
import { ENCRYPTED_PROTOCOLS } from "../../../lib/protocol-templates";
import { EmptyState } from "../../shared/EmptyState";
import {
  reassembleStream,
  formatHexDump,
  type ReassembledStream,
  type ParsedProtocolContent,
  type HttpExchange,
  type SmtpEnvelope,
  type FtpCommand,
  type MqttMsg,
  type DnsQuery,
} from "../../../lib/stream-reassembly";

type Direction = "both" | "client" | "server";
type ViewMode = "parsed" | "raw" | "hex";

export function Livewire() {
  const streams = usePacketStore((s) => s.streams);
  const packets = usePacketStore((s) => s.packets);

  const [selectedStreamKey, setSelectedStreamKey] = useState<string | null>(null);
  const [direction, setDirection] = useState<Direction>("both");
  const [viewMode, setViewMode] = useState<ViewMode>("parsed");
  const [filterText, setFilterText] = useState("");

  const sortedStreamKeys = useMemo(() => {
    return Object.keys(streams).sort((a, b) => {
      const sa = streams[a], sb = streams[b];
      return sb.lastTime - sa.lastTime;
    });
  }, [streams]);

  const filteredStreamKeys = useMemo(() => {
    if (!filterText) return sortedStreamKeys;
    const lower = filterText.toLowerCase();
    return sortedStreamKeys.filter((key) => {
      const s = streams[key];
      return (
        key.toLowerCase().includes(lower) ||
        s.protocol.toLowerCase().includes(lower) ||
        s.srcIP.includes(lower) ||
        s.dstIP.includes(lower)
      );
    });
  }, [sortedStreamKeys, filterText, streams]);

  const reassembled = useMemo<ReassembledStream | null>(() => {
    if (!selectedStreamKey || !streams[selectedStreamKey]) return null;
    return reassembleStream(selectedStreamKey, streams[selectedStreamKey]);
  }, [selectedStreamKey, streams]);

  if (packets.length === 0) {
    return <EmptyState icon="↯" message="No packet data" subtext="Start a capture to reconstruct stream content" />;
  }

  if (sortedStreamKeys.length === 0) {
    return <EmptyState icon="↯" message="No streams detected" subtext="Waiting for stream data..." />;
  }

  return (
    <div style={styles.livewireContainer}>
      {/* Left panel — Stream selector */}
      <div style={styles.livewireStreamPanel}>
        <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(0,255,159,0.1)" }}>
          <div style={{ fontFamily: FONT.family.display, fontSize: FONT.size.base, color: "#00ff9f", marginBottom: "8px" }}>
            STREAM CONTENT
          </div>
          <input
            type="text"
            placeholder="Filter streams..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 8px",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(0,255,159,0.15)",
              borderRadius: "3px",
              color: "#e0e0e0",
              fontSize: FONT.size.md,
              fontFamily: FONT.family.mono,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filteredStreamKeys.map((key) => {
            const stream = streams[key];
            const isEncrypted = ENCRYPTED_PROTOCOLS.has(stream.protocol);
            const isSelected = key === selectedStreamKey;
            const color = PROTOCOL_COLORS[stream.protocol] || "#888";

            return (
              <div
                key={key}
                onClick={() => setSelectedStreamKey(key)}
                style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                  borderLeft: `3px solid ${color}`,
                  cursor: "pointer",
                  backgroundColor: isSelected ? "rgba(0,255,159,0.08)" : "transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: FONT.size.md, fontWeight: FONT.weight.bold, color: isSelected ? "#00ff9f" : "var(--text-primary)" }}>
                    {stream.protocol}
                  </span>
                  {isEncrypted && (
                    <span style={{ fontSize: FONT.size.xs, color: "#ff3366", fontWeight: FONT.weight.bold, padding: "1px 4px", border: "1px solid rgba(255,51,102,0.3)", borderRadius: "2px" }}>
                      ENCRYPTED
                    </span>
                  )}
                  <span style={{ fontSize: FONT.size.sm, color: "var(--text-muted)", marginLeft: "auto" }}>
                    {stream.packets.length} pkts
                  </span>
                </div>
                <div style={{ fontSize: FONT.size.sm, color: "var(--text-secondary)", fontFamily: FONT.family.mono }}>
                  {stream.srcIP} → {stream.dstIP}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right panel — Content display */}
      <div style={styles.livewireContentArea}>
        {!selectedStreamKey || !reassembled ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-faint)", fontSize: FONT.size.lg }}>
            Select a stream to view reconstructed content
          </div>
        ) : (
          <>
            {/* Header bar */}
            <div style={styles.livewireContentHeader}>
              <span
                style={{
                  ...styles.livewireProtocolBadge,
                  backgroundColor: `${PROTOCOL_COLORS[reassembled.protocol] || "#888"}22`,
                  color: PROTOCOL_COLORS[reassembled.protocol] || "#888",
                  border: `1px solid ${PROTOCOL_COLORS[reassembled.protocol] || "#888"}44`,
                }}
              >
                {reassembled.protocol}
              </span>

              {/* Direction toggle */}
              <div style={{ display: "flex", gap: "3px" }}>
                {(["both", "client", "server"] as Direction[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDirection(d)}
                    style={{
                      ...styles.viewModeBtn,
                      ...(direction === d ? styles.viewModeBtnActive : {}),
                    }}
                  >
                    {d === "both" ? "BOTH" : d === "client" ? "CLIENT→SERVER" : "SERVER→CLIENT"}
                  </button>
                ))}
              </div>

              {/* View mode toggle */}
              <div style={{ display: "flex", gap: "3px" }}>
                {(["parsed", "raw", "hex"] as ViewMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setViewMode(m)}
                    style={{
                      ...styles.viewModeBtn,
                      ...(viewMode === m ? styles.viewModeBtnActive : {}),
                    }}
                  >
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>

              <span style={styles.livewireStats}>
                {reassembled.totalBytes.toLocaleString()} bytes from {reassembled.packetCount} packets
              </span>
            </div>

            {/* Content body */}
            <div style={styles.livewireBody}>
              {reassembled.isEncrypted ? (
                <EncryptedMessage protocol={reassembled.protocol} />
              ) : viewMode === "parsed" ? (
                <ParsedView reassembled={reassembled} direction={direction} />
              ) : viewMode === "raw" ? (
                <RawView reassembled={reassembled} direction={direction} />
              ) : (
                <HexView reassembled={reassembled} direction={direction} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function EncryptedMessage({ protocol }: { protocol: string }) {
  return (
    <div style={styles.livewireEncrypted}>
      <span style={{ fontSize: FONT.size["5xl"] }}>🔒</span>
      <span style={{ fontFamily: FONT.family.display, fontSize: FONT.size.lg, color: "#ff3366" }}>
        ENCRYPTED STREAM
      </span>
      <span style={{ fontSize: FONT.size.base, textAlign: "center", maxWidth: "300px" }}>
        {protocol} traffic is encrypted. Content reconstruction is not possible for this stream.
      </span>
    </div>
  );
}

function RawView({ reassembled, direction }: { reassembled: ReassembledStream; direction: Direction }) {
  const text =
    direction === "client"
      ? reassembled.clientText
      : direction === "server"
        ? reassembled.serverText
        : `${reassembled.clientText}\n--- SERVER ---\n${reassembled.serverText}`;

  if (!text) return <div style={{ color: "var(--text-faint)", fontSize: FONT.size.base }}>No payload data</div>;

  return <pre style={styles.livewireCodeBlock}>{text}</pre>;
}

function HexView({ reassembled, direction }: { reassembled: ReassembledStream; direction: Direction }) {
  const bytes = useMemo(() => {
    if (direction === "client") return reassembled.clientPayload;
    if (direction === "server") return reassembled.serverPayload;
    const combined = new Uint8Array(reassembled.clientPayload.length + reassembled.serverPayload.length);
    combined.set(reassembled.clientPayload, 0);
    combined.set(reassembled.serverPayload, reassembled.clientPayload.length);
    return combined;
  }, [direction, reassembled]);

  if (bytes.length === 0) return <div style={{ color: "var(--text-faint)", fontSize: FONT.size.base }}>No payload data</div>;

  return <pre style={styles.livewireCodeBlock}>{formatHexDump(bytes)}</pre>;
}

function ParsedView({ reassembled, direction }: { reassembled: ReassembledStream; direction: Direction }) {
  const { content } = reassembled;
  if (!content) return <RawView reassembled={reassembled} direction={direction} />;

  switch (content.type) {
    case "http":
      return <HttpRenderer exchanges={content.exchanges} direction={direction} />;
    case "smtp":
      return <SmtpRenderer envelope={content.envelope} />;
    case "ftp":
      return <FtpRenderer commands={content.commands} direction={direction} />;
    case "telnet":
      return <TelnetRenderer session={content.session} />;
    case "mqtt":
      return <MqttRenderer messages={content.messages} />;
    case "dns":
      return <DnsRenderer queries={content.queries} />;
    case "raw":
      return <pre style={styles.livewireCodeBlock}>{content.text}</pre>;
  }
}

// ─── Protocol Renderers ──────────────────────────────────────────

function HttpRenderer({ exchanges, direction }: { exchanges: HttpExchange[]; direction: Direction }) {
  return (
    <>
      {exchanges.map((ex, i) => (
        <React.Fragment key={i}>
          {(direction === "both" || direction === "client") && (
            <div style={styles.livewireCard}>
              <div style={{ ...styles.livewireCardHeader, backgroundColor: "rgba(0,100,255,0.1)", color: "#00b8ff" }}>
                <span style={{ fontFamily: FONT.family.display, fontSize: FONT.size.xs, padding: "2px 6px", border: "1px solid rgba(0,184,255,0.3)", borderRadius: "2px" }}>
                  REQUEST
                </span>
                <span style={{ color: "#ff6b00", fontWeight: FONT.weight.bold }}>{ex.request.method}</span>
                <span style={{ color: "#e0e0e0" }}>{ex.request.path}</span>
                <span style={{ color: "var(--text-muted)" }}>{ex.request.version}</span>
              </div>
              <div style={styles.livewireCardBody}>
                {Object.keys(ex.request.headers).length > 0 && (
                  <HeaderList headers={ex.request.headers} />
                )}
                {ex.request.body && (
                  <pre style={{ ...styles.livewireCodeBlock, marginTop: "8px" }}>{ex.request.body}</pre>
                )}
              </div>
            </div>
          )}
          {(direction === "both" || direction === "server") && ex.response && (
            <div style={styles.livewireCard}>
              <div
                style={{
                  ...styles.livewireCardHeader,
                  backgroundColor: ex.response.status < 400 ? "rgba(0,255,159,0.08)" : "rgba(255,51,102,0.08)",
                  color: ex.response.status < 400 ? "#00ff9f" : "#ff3366",
                }}
              >
                <span style={{ fontFamily: FONT.family.display, fontSize: FONT.size.xs, padding: "2px 6px", border: `1px solid ${ex.response.status < 400 ? "rgba(0,255,159,0.3)" : "rgba(255,51,102,0.3)"}`, borderRadius: "2px" }}>
                  RESPONSE
                </span>
                <span style={{ fontWeight: FONT.weight.bold }}>{ex.response.status}</span>
                <span style={{ color: "var(--text-secondary)" }}>{ex.response.statusText}</span>
              </div>
              <div style={styles.livewireCardBody}>
                {Object.keys(ex.response.headers).length > 0 && (
                  <HeaderList headers={ex.response.headers} />
                )}
                {ex.response.body && (
                  <pre style={{ ...styles.livewireCodeBlock, marginTop: "8px" }}>{ex.response.body}</pre>
                )}
              </div>
            </div>
          )}
        </React.Fragment>
      ))}
      {exchanges.length === 0 && (
        <div style={{ color: "var(--text-faint)", fontSize: FONT.size.base }}>No HTTP exchanges detected</div>
      )}
    </>
  );
}

function HeaderList({ headers }: { headers: Record<string, string> }) {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(headers);
  const shown = expanded ? entries : entries.slice(0, 3);

  return (
    <div style={{ fontSize: FONT.size.md }}>
      {shown.map(([k, v]) => (
        <div key={k} style={{ padding: "1px 0" }}>
          <span style={{ color: "#00b8ff" }}>{k}</span>
          <span style={{ color: "var(--text-muted)" }}>: </span>
          <span style={{ color: "var(--text-secondary)" }}>{v}</span>
        </div>
      ))}
      {entries.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ background: "none", border: "none", color: "#00ff9f", fontSize: FONT.size.sm, cursor: "pointer", padding: "2px 0" }}
        >
          {expanded ? "▲ collapse" : `▼ ${entries.length - 3} more headers`}
        </button>
      )}
    </div>
  );
}

function SmtpRenderer({ envelope }: { envelope: SmtpEnvelope }) {
  return (
    <div style={styles.livewireCard}>
      <div style={{ ...styles.livewireCardHeader, backgroundColor: "rgba(255,149,0,0.1)", color: "#ff9500" }}>
        <span style={{ fontFamily: FONT.family.display, fontSize: FONT.size.xs, padding: "2px 6px", border: "1px solid rgba(255,149,0,0.3)", borderRadius: "2px" }}>
          EMAIL
        </span>
      </div>
      <div style={styles.livewireCardBody}>
        <div style={{ marginBottom: "10px", fontSize: FONT.size.md }}>
          <div style={{ padding: "2px 0" }}>
            <span style={{ color: "#ff9500" }}>From: </span>
            <span style={{ color: "#e0e0e0" }}>{envelope.from || "—"}</span>
          </div>
          <div style={{ padding: "2px 0" }}>
            <span style={{ color: "#ff9500" }}>To: </span>
            <span style={{ color: "#e0e0e0" }}>{envelope.to.join(", ") || "—"}</span>
          </div>
          <div style={{ padding: "2px 0" }}>
            <span style={{ color: "#ff9500" }}>Subject: </span>
            <span style={{ color: "#e0e0e0", fontWeight: FONT.weight.bold }}>{envelope.subject || "—"}</span>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "10px" }}>
          <pre style={{ ...styles.livewireCodeBlock, whiteSpace: "pre-wrap" }}>{envelope.body || "(no body)"}</pre>
        </div>
      </div>
    </div>
  );
}

function FtpRenderer({ commands, direction }: { commands: FtpCommand[]; direction: Direction }) {
  const filtered = direction === "both"
    ? commands
    : commands.filter((c) => c.direction === direction);

  return (
    <div style={styles.livewireTerminal}>
      {filtered.map((cmd, i) => (
        <div key={i}>
          {cmd.direction === "client" ? (
            <span>
              <span style={{ color: "#00b8ff" }}>{">"}</span>{" "}
              <span style={{ color: "#e0e0e0" }}>{cmd.line}</span>
            </span>
          ) : (
            <span>
              <span style={{ color: "var(--text-muted)" }}>{"<"}</span>{" "}
              <span style={{ color: "#00ff9f" }}>{cmd.line}</span>
            </span>
          )}
        </div>
      ))}
      {filtered.length === 0 && <span style={{ color: "var(--text-faint)" }}>No FTP commands</span>}
    </div>
  );
}

function TelnetRenderer({ session }: { session: string }) {
  return <pre style={styles.livewireTerminal}>{session || "(empty session)"}</pre>;
}

function MqttRenderer({ messages }: { messages: MqttMsg[] }) {
  const typeColors: Record<string, string> = {
    CONNECT: "#00b8ff",
    CONNACK: "#00ff9f",
    PUBLISH: "#ff6b00",
    SUBSCRIBE: "#ff00ff",
    SUBACK: "#00ff9f",
    PUBACK: "#00ff9f",
    PINGREQ: "#666",
    PINGRESP: "#666",
    DISCONNECT: "#ff3366",
  };

  return (
    <>
      {messages.map((msg, i) => (
        <div key={i} style={{ ...styles.livewireCard, borderColor: `${typeColors[msg.type] || "#888"}33` }}>
          <div style={{ ...styles.livewireCardHeader, backgroundColor: `${typeColors[msg.type] || "#888"}11` }}>
            <span
              style={{
                fontFamily: FONT.family.display,
                fontSize: FONT.size.xs,
                padding: "2px 6px",
                border: `1px solid ${typeColors[msg.type] || "#888"}55`,
                borderRadius: "2px",
                color: typeColors[msg.type] || "#888",
              }}
            >
              {msg.type}
            </span>
            {msg.topic && <span style={{ color: "var(--text-secondary)", fontSize: FONT.size.sm }}>{msg.topic}</span>}
          </div>
          {msg.payload && (
            <div style={styles.livewireCardBody}>
              <pre style={{ ...styles.livewireCodeBlock, margin: 0 }}>{msg.payload}</pre>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

function DnsRenderer({ queries }: { queries: DnsQuery[] }) {
  return (
    <div style={{ fontSize: FONT.size.md }}>
      {queries.map((q, i) => (
        <div
          key={i}
          style={{
            padding: "6px 10px",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
            display: "flex",
            gap: "10px",
            alignItems: "flex-start",
          }}
        >
          <span
            style={{
              fontFamily: FONT.family.display,
              fontSize: FONT.size.xxs,
              padding: "2px 5px",
              border: `1px solid ${q.direction === "query" ? "rgba(0,184,255,0.3)" : "rgba(0,255,159,0.3)"}`,
              borderRadius: "2px",
              color: q.direction === "query" ? "#00b8ff" : "#00ff9f",
              flexShrink: 0,
            }}
          >
            {q.direction === "query" ? "Q" : "R"}
          </span>
          <div style={{ flex: 1, fontFamily: FONT.family.mono }}>
            {q.direction === "query" ? (
              <span>
                <span style={{ color: "#00b8ff" }}>{q.type}</span>{" "}
                <span style={{ color: "#e0e0e0" }}>{q.name}</span>
              </span>
            ) : (
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "#00ff9f" }}>
                {q.answers || q.raw}
              </pre>
            )}
          </div>
        </div>
      ))}
      {queries.length === 0 && <div style={{ color: "var(--text-faint)" }}>No DNS queries detected</div>}
    </div>
  );
}
