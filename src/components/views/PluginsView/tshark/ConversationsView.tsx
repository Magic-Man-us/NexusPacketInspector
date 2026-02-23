import { useState, useMemo } from "react";
import { ConversationEntry } from "../../../../types/plugin";
import { formatBytes } from "../../../../lib/formatters";

interface Props {
  entries: ConversationEntry[];
}

type SortKey = "totalFrames" | "totalBytes" | "duration";

export function ConversationsView({ entries }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>("totalBytes");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    return [...entries].sort((a, b) => {
      const diff = a[sortBy] - b[sortBy];
      return sortAsc ? diff : -diff;
    });
  }, [entries, sortBy, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc(!sortAsc);
    else {
      setSortBy(key);
      setSortAsc(false);
    }
  };

  if (entries.length === 0) {
    return (
      <div style={{ color: "var(--text-faint)", fontSize: "11px", textAlign: "center", padding: "20px" }}>
        No conversation data
      </div>
    );
  }

  const sortIndicator = (key: SortKey) =>
    sortBy === key ? (sortAsc ? " \u25B2" : " \u25BC") : "";

  return (
    <div>
      <div
        style={{
          fontFamily: "'Orbitron'",
          fontSize: "10px",
          color: "var(--accent)",
          marginBottom: "12px",
          letterSpacing: "0.5px",
        }}
      >
        CONVERSATIONS ({entries.length})
      </div>

      <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "10px", overflowX: "auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            padding: "6px 10px",
            fontSize: "8px",
            color: "var(--text-muted)",
            fontFamily: "'Orbitron'",
            borderBottom: "1px solid var(--border)",
            letterSpacing: "0.5px",
            minWidth: "700px",
          }}
        >
          <span style={{ width: "140px" }}>ADDRESS A</span>
          <span style={{ width: "140px" }}>ADDRESS B</span>
          <span style={{ width: "80px", textAlign: "right" }}>A&rarr;B FRM</span>
          <span style={{ width: "80px", textAlign: "right" }}>B&rarr;A FRM</span>
          <span
            style={{ width: "90px", textAlign: "right", cursor: "pointer" }}
            onClick={() => handleSort("totalFrames")}
          >
            FRAMES{sortIndicator("totalFrames")}
          </span>
          <span
            style={{ width: "90px", textAlign: "right", cursor: "pointer" }}
            onClick={() => handleSort("totalBytes")}
          >
            BYTES{sortIndicator("totalBytes")}
          </span>
          <span
            style={{ width: "80px", textAlign: "right", cursor: "pointer" }}
            onClick={() => handleSort("duration")}
          >
            DURATION{sortIndicator("duration")}
          </span>
        </div>

        {/* Rows */}
        {sorted.map((conv, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              padding: "5px 10px",
              borderBottom: "1px solid rgba(255,255,255,0.02)",
              backgroundColor: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
              minWidth: "700px",
            }}
          >
            <span style={{ width: "140px", color: "#00b8ff" }}>{conv.addressA}</span>
            <span style={{ width: "140px", color: "#00b8ff" }}>{conv.addressB}</span>
            <span style={{ width: "80px", textAlign: "right", color: "var(--text-secondary)" }}>
              {conv.framesAToB}
            </span>
            <span style={{ width: "80px", textAlign: "right", color: "var(--text-secondary)" }}>
              {conv.framesBToA}
            </span>
            <span style={{ width: "90px", textAlign: "right", color: "var(--text-primary)" }}>
              {conv.totalFrames}
            </span>
            <span style={{ width: "90px", textAlign: "right", color: "var(--accent)" }}>
              {formatBytes(conv.totalBytes)}
            </span>
            <span style={{ width: "80px", textAlign: "right", color: "var(--text-muted)" }}>
              {conv.duration > 0 ? `${conv.duration.toFixed(2)}s` : "-"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
