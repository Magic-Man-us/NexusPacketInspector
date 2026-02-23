import { StreamData } from "../../../../types/plugin";

interface Props {
  stream: StreamData;
}

export function StreamFollowView({ stream }: Props) {
  if (stream.segments.length === 0) {
    return (
      <div style={{ color: "var(--text-faint)", fontSize: "11px", textAlign: "center", padding: "20px" }}>
        No stream data found
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          fontFamily: "'Orbitron'",
          fontSize: "10px",
          color: "var(--accent)",
          marginBottom: "8px",
          letterSpacing: "0.5px",
          display: "flex",
          gap: "12px",
          alignItems: "center",
        }}
      >
        <span>STREAM FOLLOW</span>
        <span style={{ fontSize: "9px", color: "var(--text-muted)", fontFamily: "'Share Tech Mono', monospace" }}>
          {stream.protocol.toUpperCase()} Stream #{stream.streamIndex}
        </span>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "12px", fontSize: "9px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: "rgba(0,255,255,0.2)", border: "1px solid #00ffff" }} />
          <span style={{ color: "#00ffff" }}>Client</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: "rgba(255,165,0,0.2)", border: "1px solid #ffa500" }} />
          <span style={{ color: "#ffa500" }}>Server</span>
        </span>
      </div>

      {/* Chat-style messages */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {stream.segments.map((seg, i) => {
          const isServer = seg.fromServer;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: isServer ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "85%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  backgroundColor: isServer
                    ? "rgba(255,165,0,0.08)"
                    : "rgba(0,255,255,0.08)",
                  border: `1px solid ${isServer ? "rgba(255,165,0,0.2)" : "rgba(0,255,255,0.2)"}`,
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: "10px",
                  color: "var(--text-primary)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  lineHeight: "1.4",
                }}
              >
                {seg.data}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
