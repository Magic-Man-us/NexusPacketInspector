import { LAYER_COLORS } from "../../../styles/theme";
import { getFieldEncyclopedia } from "../../../data/fieldEncyclopedia";

interface FieldDef {
  name: string;
  value: string | number;
  bits: number;
  desc: string;
  isFlag?: boolean;
  active?: boolean;
}

interface ActiveField extends FieldDef {
  layer: string;
}

interface FieldEncyclopediaPanelProps {
  field: ActiveField | null;
  onClose: () => void;
}

export function FieldEncyclopediaPanel({ field, onClose }: FieldEncyclopediaPanelProps) {
  const entry = field ? getFieldEncyclopedia(field.layer, field.name) : null;
  const colors = field
    ? LAYER_COLORS[field.layer as keyof typeof LAYER_COLORS]
    : { border: "#555", text: "#555", bg: "transparent" };

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: "50%",
        backgroundColor: "rgba(10, 15, 10, 0.98)",
        backdropFilter: "blur(8px)",
        borderTop: `2px solid ${colors.border}`,
        transform: field ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        display: "flex",
        flexDirection: "column" as const,
        zIndex: 10,
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 16px",
          borderBottom: `1px solid ${colors.border}30`,
          flexShrink: 0,
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: `1px solid ${colors.border}50`,
            color: colors.text,
            width: "24px",
            height: "24px",
            borderRadius: "4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            lineHeight: 1,
            marginRight: "12px",
            flexShrink: 0,
          }}
        >
          {"\u2715"}
        </button>
        <span
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "10px",
            fontWeight: 700,
            color: "#888",
            letterSpacing: "1.5px",
          }}
        >
          FIELD ENCYCLOPEDIA
        </span>
        {field && (
          <span
            style={{
              marginLeft: "12px",
              padding: "2px 10px",
              backgroundColor: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: "4px",
              fontSize: "9px",
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: 700,
              color: colors.text,
              textTransform: "uppercase" as const,
              letterSpacing: "1px",
            }}
          >
            {field.layer}
          </span>
        )}
      </div>

      {/* Scrollable content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto" as const,
          padding: "16px 20px 20px",
        }}
      >
        {field && (
          <>
            {/* Field identity */}
            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: colors.text,
                  fontFamily: "'Orbitron', sans-serif",
                  marginBottom: "6px",
                }}
              >
                {field.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" as const }}>
                <span
                  style={{
                    fontSize: "13px",
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "#fff",
                    wordBreak: "break-all" as const,
                  }}
                >
                  {String(field.value)}
                </span>
                <span
                  style={{
                    padding: "3px 8px",
                    backgroundColor: "rgba(0,255,159,0.1)",
                    borderRadius: "4px",
                    fontSize: "10px",
                    color: "#00ff9f",
                    fontFamily: "'Share Tech Mono', monospace",
                  }}
                >
                  {field.bits} bits / {Math.ceil(field.bits / 8)} bytes
                </span>
              </div>
            </div>

            {entry ? (
              <>
                {/* Overview */}
                <Section title="OVERVIEW" color={colors.border}>
                  <p style={bodyTextStyle}>{entry.overview}</p>
                </Section>

                {/* Size Rationale */}
                <Section title="SIZE RATIONALE" color={colors.border}>
                  <p style={bodyTextStyle}>{entry.sizeRationale}</p>
                </Section>

                {/* How It Works */}
                <Section title="HOW IT WORKS" color={colors.border}>
                  <p style={bodyTextStyle}>{entry.howItWorks}</p>
                </Section>

                {/* Common Values */}
                <Section title="COMMON VALUES" color={colors.border}>
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px" }}>
                    {entry.commonValues.map((cv, i) => (
                      <span
                        key={i}
                        style={{
                          padding: "4px 10px",
                          backgroundColor: `${colors.border}15`,
                          border: `1px solid ${colors.border}30`,
                          borderRadius: "4px",
                          fontSize: "10px",
                          color: "#ccc",
                          fontFamily: "'Share Tech Mono', monospace",
                          lineHeight: "1.4",
                        }}
                      >
                        {cv}
                      </span>
                    ))}
                  </div>
                </Section>

                {/* RFC Reference */}
                <Section title="RFC REFERENCE" color={colors.border}>
                  <p style={{ ...bodyTextStyle, color: "#00b8ff" }}>{entry.rfcReference}</p>
                </Section>
              </>
            ) : (
              <div style={{ color: "#555", fontSize: "11px", fontStyle: "italic" }}>
                No encyclopedia entry available for this field.
              </div>
            )}

            {/* Binary representation for numeric values */}
            {typeof field.value === "number" && (
              <Section title="BINARY" color={colors.border}>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "11px",
                    color: "#ff6b00",
                    wordBreak: "break-all" as const,
                    backgroundColor: "rgba(255,107,0,0.1)",
                    padding: "8px 10px",
                    borderRadius: "4px",
                    letterSpacing: "1px",
                  }}
                >
                  {field.value.toString(2).padStart(field.bits, "0")}
                </div>
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const bodyTextStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "#bbb",
  lineHeight: "1.6",
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
    <div style={{ marginBottom: "16px" }}>
      <div
        style={{
          fontSize: "9px",
          fontFamily: "'Orbitron', sans-serif",
          fontWeight: 700,
          color: color,
          letterSpacing: "1.5px",
          marginBottom: "6px",
          opacity: 0.8,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
