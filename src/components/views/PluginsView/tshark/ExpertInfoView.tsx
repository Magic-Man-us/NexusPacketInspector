import { useState, useMemo } from "react";
import { FONT } from "../../../../styles/typography";
import { ExpertEntry } from "../../../../types/plugin";

interface Props {
  entries: ExpertEntry[];
}

const SEVERITY_COLORS: Record<string, string> = {
  Error: "#ff3366",
  Warn: "#ffd600",
  Warning: "#ffd600",
  Note: "#00b8ff",
  Chat: "#00ff9f",
};

type SeverityFilter = "all" | "Error" | "Warn" | "Note" | "Chat";

export function ExpertInfoView({ entries }: Props) {
  const [filter, setFilter] = useState<SeverityFilter>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return entries;
    return entries.filter((e) => {
      const sev = e.severity.toLowerCase();
      return sev === filter.toLowerCase() || sev.startsWith(filter.toLowerCase().slice(0, 4));
    });
  }, [entries, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of entries) {
      // Normalize "Warning" → "Warn" to match filter keys
      const sev = e.severity.toLowerCase();
      let key = e.severity;
      if (sev === "warning") key = "Warn";
      else if (sev === "error") key = "Error";
      else if (sev === "note") key = "Note";
      else if (sev === "chat") key = "Chat";
      c[key] = (c[key] || 0) + e.count;
    }
    return c;
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div style={{ color: "var(--text-faint)", fontSize: FONT.size.base, textAlign: "center", padding: "20px" }}>
        No expert info entries found
      </div>
    );
  }

  const filters: SeverityFilter[] = ["all", "Error", "Warn", "Note", "Chat"];

  return (
    <div>
      <div
        style={{
          fontFamily: FONT.family.display,
          fontSize: FONT.size.md,
          color: "var(--accent)",
          marginBottom: "12px",
          letterSpacing: FONT.spacing.normal,
        }}
      >
        EXPERT INFORMATION
      </div>

      {/* Filter toggles */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "3px 10px",
              border: filter === f ? "1px solid" : "1px solid var(--border)",
              borderColor: f === "all" ? (filter === f ? "var(--accent)" : "var(--border)") : (SEVERITY_COLORS[f] || "var(--border)"),
              borderRadius: "3px",
              background: filter === f ? "rgba(255,255,255,0.06)" : "transparent",
              color: f === "all" ? "var(--text-secondary)" : (SEVERITY_COLORS[f] || "var(--text-secondary)"),
              fontFamily: FONT.family.mono,
              fontSize: FONT.size.md,
              cursor: "pointer",
            }}
          >
            {f === "all" ? "ALL" : f.toUpperCase()} {f !== "all" && counts[f] !== undefined ? `(${counts[f]})` : ""}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ fontFamily: FONT.family.mono, fontSize: FONT.size.md }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            padding: "6px 10px",
            fontSize: FONT.size.xs,
            color: "var(--text-muted)",
            fontFamily: FONT.family.display,
            borderBottom: "1px solid var(--border)",
            letterSpacing: FONT.spacing.normal,
          }}
        >
          <span style={{ width: "70px" }}>SEVERITY</span>
          <span style={{ width: "80px" }}>GROUP</span>
          <span style={{ width: "80px" }}>PROTOCOL</span>
          <span style={{ flex: 1 }}>SUMMARY</span>
          <span style={{ width: "60px", textAlign: "right" }}>COUNT</span>
        </div>

        {filtered.map((entry, i) => {
          const color = SEVERITY_COLORS[entry.severity] || "var(--text-secondary)";
          return (
            <div
              key={i}
              style={{
                display: "flex",
                padding: "5px 10px",
                borderBottom: "1px solid rgba(255,255,255,0.02)",
                backgroundColor: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                alignItems: "flex-start",
              }}
            >
              <span style={{ width: "70px", color, fontWeight: FONT.weight.bold }}>
                {entry.severity}
              </span>
              <span style={{ width: "80px", color: "var(--text-muted)" }}>
                {entry.group}
              </span>
              <span style={{ width: "80px", color: "#00b8ff" }}>
                {entry.protocol}
              </span>
              <span style={{ flex: 1, color: "var(--text-secondary)", wordBreak: "break-word" }}>
                {entry.summary}
              </span>
              <span style={{ width: "60px", textAlign: "right", color: "var(--text-primary)" }}>
                {entry.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
