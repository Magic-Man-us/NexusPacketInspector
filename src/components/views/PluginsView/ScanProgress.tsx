import { useRef, useEffect } from "react";
import { FONT } from "../../../styles/typography";
import { usePluginStore } from "../../../hooks/usePluginStore";

export function ScanProgress() {
  const progressLines = usePluginStore((s) => s.progressLines);
  const progressPercent = usePluginStore((s) => s.progressPercent);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [progressLines]);

  return (
    <div style={{ marginTop: "12px" }}>
      {progressPercent !== null && (
        <div style={{ marginBottom: "8px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: FONT.size.sm,
              color: "var(--text-secondary)",
              marginBottom: "4px",
            }}
          >
            <span>Progress</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div
            style={{
              height: "4px",
              backgroundColor: "rgba(0,0,0,0.3)",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progressPercent}%`,
                backgroundColor: "#00ff9f",
                borderRadius: "2px",
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>
      )}
      <div
        ref={logRef}
        style={{
          maxHeight: "150px",
          overflowY: "auto",
          backgroundColor: "rgba(0,0,0,0.3)",
          borderRadius: "4px",
          padding: "8px",
          fontFamily: FONT.family.mono,
          fontSize: FONT.size.md,
          color: "var(--text-secondary)",
        }}
      >
        {progressLines.map((line, i) => (
          <div key={i} style={{ padding: "1px 0" }}>
            {line}
          </div>
        ))}
        {progressLines.length === 0 && (
          <div style={{ color: "var(--text-faint)" }}>Waiting for output...</div>
        )}
      </div>
    </div>
  );
}
