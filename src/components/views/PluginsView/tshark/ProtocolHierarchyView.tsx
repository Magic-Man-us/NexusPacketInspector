import { useState } from "react";
import { FONT } from "../../../../styles/typography";
import { ProtocolNode } from "../../../../types/plugin";
import { formatBytes } from "../../../../lib/formatters";

interface Props {
  nodes: ProtocolNode[];
}

export function ProtocolHierarchyView({ nodes }: Props) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  if (nodes.length === 0) {
    return (
      <div style={{ color: "var(--text-faint)", fontSize: FONT.size.base, textAlign: "center", padding: "20px" }}>
        No protocol hierarchy data
      </div>
    );
  }

  const toggleCollapse = (index: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Determine which nodes are visible based on collapsed state
  const visibleNodes: Array<{ node: ProtocolNode; index: number; hasChildren: boolean }> = [];
  let skipUntilDepth = -1;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if (skipUntilDepth >= 0 && node.depth > skipUntilDepth) continue;
    skipUntilDepth = -1;

    const hasChildren = i + 1 < nodes.length && nodes[i + 1].depth > node.depth;
    visibleNodes.push({ node, index: i, hasChildren });

    if (collapsed.has(i) && hasChildren) {
      skipUntilDepth = node.depth;
    }
  }

  const maxFrames = Math.max(...nodes.map((n) => n.frames), 1);

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
        PROTOCOL HIERARCHY
      </div>
      <div style={{ fontFamily: FONT.family.mono, fontSize: FONT.size.base }}>
        {visibleNodes.map(({ node, index, hasChildren }) => {
          const barWidth = (node.frames / maxFrames) * 100;
          const isCollapsed = collapsed.has(index);

          return (
            <div
              key={index}
              style={{
                paddingLeft: `${node.depth * 20}px`,
                marginBottom: "2px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "4px 8px",
                  borderRadius: "3px",
                  cursor: hasChildren ? "pointer" : "default",
                  backgroundColor: "rgba(255,255,255,0.02)",
                }}
                onClick={() => hasChildren && toggleCollapse(index)}
              >
                {/* Expand/collapse indicator */}
                <span style={{ width: "12px", fontSize: FONT.size.md, color: "var(--text-dim)" }}>
                  {hasChildren ? (isCollapsed ? "\u25B6" : "\u25BC") : " "}
                </span>

                {/* Protocol name */}
                <span style={{ width: "120px", color: "var(--accent)", fontWeight: FONT.weight.bold }}>
                  {node.protocol}
                </span>

                {/* Bar */}
                <div style={{ flex: 1, height: "10px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${barWidth}%`,
                      background: `linear-gradient(90deg, rgba(var(--accent-rgb),0.4), rgba(var(--accent-rgb),0.15))`,
                      borderRadius: "2px",
                    }}
                  />
                </div>

                {/* Stats */}
                <span style={{ width: "55px", textAlign: "right", color: "var(--text-secondary)", fontSize: FONT.size.md }}>
                  {node.percentFrames.toFixed(1)}%
                </span>
                <span style={{ width: "65px", textAlign: "right", color: "var(--text-muted)", fontSize: FONT.size.md }}>
                  {node.frames} frm
                </span>
                <span style={{ width: "70px", textAlign: "right", color: "var(--text-muted)", fontSize: FONT.size.md }}>
                  {formatBytes(node.bytes)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
