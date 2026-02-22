import { useMemo } from "react";
import { LAYER_COLORS } from "../../../styles/theme";
import { getFieldEncyclopedia } from "../../../data/fieldEncyclopedia";
import type { ActiveField, PopoverAnchor } from "./PacketStructure";

interface FieldEncyclopediaPanelProps {
  field: ActiveField | null;
  anchor: PopoverAnchor | null;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const POPOVER_WIDTH = 380;
const POPOVER_MAX_HEIGHT = 420;

export function FieldEncyclopediaPanel({ field, anchor, onMouseEnter, onMouseLeave }: FieldEncyclopediaPanelProps) {
  const entry = field ? getFieldEncyclopedia(field.layer, field.name) : null;
  const colors = field
    ? LAYER_COLORS[field.layer as keyof typeof LAYER_COLORS]
    : { border: "var(--text-dim)", text: "var(--text-dim)", bg: "transparent" };

  const position = useMemo(() => {
    if (!anchor) return { top: 0, left: 0 };
    const spaceRight = window.innerWidth - anchor.right;
    const spaceLeft = anchor.left;

    let left: number;
    if (spaceRight >= POPOVER_WIDTH + 12) {
      left = anchor.right + 8;
    } else if (spaceLeft >= POPOVER_WIDTH + 12) {
      left = anchor.left - POPOVER_WIDTH - 8;
    } else {
      left = Math.max(8, (window.innerWidth - POPOVER_WIDTH) / 2);
    }

    let top = anchor.top;
    if (top + POPOVER_MAX_HEIGHT > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - POPOVER_MAX_HEIGHT - 8);
    }

    return { top, left };
  }, [anchor]);

  if (!field || !anchor) return null;

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${POPOVER_WIDTH}px`,
        maxHeight: `${POPOVER_MAX_HEIGHT}px`,
        backgroundColor: "rgba(10, 15, 10, 0.98)",
        backdropFilter: "blur(8px)",
        border: `1px solid ${colors.border}60`,
        borderTop: `2px solid ${colors.border}`,
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column" as const,
        zIndex: 9999,
        boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 1px ${colors.border}40`,
        animation: "encyclopediaFadeIn 0.15s ease-out",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "8px 12px",
          borderBottom: `1px solid ${colors.border}30`,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "8px",
            fontWeight: 700,
            color: "var(--text-muted)",
            letterSpacing: "1.5px",
          }}
        >
          FIELD ENCYCLOPEDIA
        </span>
        <span
          style={{
            marginLeft: "auto",
            padding: "2px 8px",
            backgroundColor: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: "4px",
            fontSize: "8px",
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 700,
            color: colors.text,
            textTransform: "uppercase" as const,
            letterSpacing: "1px",
          }}
        >
          {field.layer}
        </span>
      </div>

      {/* Scrollable content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto" as const,
          padding: "12px 14px 14px",
        }}
      >
        {/* Field identity */}
        <div style={{ marginBottom: "14px" }}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: colors.text,
              fontFamily: "'Orbitron', sans-serif",
              marginBottom: "4px",
            }}
          >
            {field.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" as const }}>
            <span
              style={{
                fontSize: "12px",
                fontFamily: "'JetBrains Mono', monospace",
                color: "#fff",
                wordBreak: "break-all" as const,
              }}
            >
              {String(field.value)}
            </span>
            <span
              style={{
                padding: "2px 6px",
                backgroundColor: "rgba(var(--accent-rgb),0.1)",
                borderRadius: "3px",
                fontSize: "9px",
                color: "#00ff9f",
                fontFamily: "'Share Tech Mono', monospace",
              }}
            >
              {field.bits}b / {Math.ceil(field.bits / 8)}B
            </span>
          </div>
        </div>

        {entry ? (
          <>
            <Section title="OVERVIEW" color={colors.border}>
              <p style={bodyTextStyle}>{entry.overview}</p>
            </Section>

            <Section title="SIZE RATIONALE" color={colors.border}>
              <p style={bodyTextStyle}>{entry.sizeRationale}</p>
            </Section>

            <Section title="HOW IT WORKS" color={colors.border}>
              <p style={bodyTextStyle}>{entry.howItWorks}</p>
            </Section>

            <Section title="COMMON VALUES" color={colors.border}>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "3px" }}>
                {entry.commonValues.map((cv, i) => (
                  <span
                    key={i}
                    style={{
                      padding: "3px 8px",
                      backgroundColor: `${colors.border}15`,
                      border: `1px solid ${colors.border}25`,
                      borderRadius: "3px",
                      fontSize: "9px",
                      color: "var(--text-primary)",
                      fontFamily: "'Share Tech Mono', monospace",
                      lineHeight: "1.4",
                    }}
                  >
                    {cv}
                  </span>
                ))}
              </div>
            </Section>

            <Section title="RFC REFERENCE" color={colors.border}>
              <p style={{ ...bodyTextStyle, color: "#00b8ff" }}>{entry.rfcReference}</p>
            </Section>
          </>
        ) : (
          <div style={{ color: "var(--text-dim)", fontSize: "11px", fontStyle: "italic" }}>
            No encyclopedia entry available for this field.
          </div>
        )}

        {typeof field.value === "number" && (
          <Section title="BINARY" color={colors.border}>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                color: "#ff6b00",
                wordBreak: "break-all" as const,
                backgroundColor: "rgba(255,107,0,0.1)",
                padding: "6px 8px",
                borderRadius: "3px",
                letterSpacing: "1px",
              }}
            >
              {field.value.toString(2).padStart(field.bits, "0")}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

const bodyTextStyle: React.CSSProperties = {
  fontSize: "10px",
  color: "var(--text-secondary)",
  lineHeight: "1.5",
  fontFamily: "'Share Tech Mono', monospace",
  margin: 0,
};

function Section({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <div
        style={{
          fontSize: "8px",
          fontFamily: "'Orbitron', sans-serif",
          fontWeight: 700,
          color: color,
          letterSpacing: "1.5px",
          marginBottom: "4px",
          opacity: 0.8,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
