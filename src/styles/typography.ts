import React from "react";

// ─── Single source of truth for ALL typography ──────────────────────────────

export const FONT = {
  // Families
  family: {
    display: "'Orbitron'" as const,
    mono: "'Share Tech Mono', monospace" as const,
  },

  // Size scale (px)
  size: {
    xxs: "7px" as const,
    xs: "8px" as const,
    sm: "9px" as const,
    md: "10px" as const,
    base: "11px" as const,
    lg: "12px" as const,
    xl: "14px" as const,
    "2xl": "16px" as const,
    "3xl": "20px" as const,
    "4xl": "32px" as const,
    "5xl": "48px" as const,
  },

  // Weight scale
  weight: {
    normal: 500 as const,
    medium: 600 as const,
    bold: 700 as const,
    heavy: 800 as const,
    black: 900 as const,
  },

  // Letter spacing
  spacing: {
    tight: "0.3px" as const,
    normal: "0.5px" as const,
    wide: "1px" as const,
    wider: "1.5px" as const,
    widest: "2px" as const,
  },

  // Line height
  leading: {
    none: 1 as const,
    tight: 1.3 as const,
    normal: 1.4 as const,
    relaxed: 1.5 as const,
    loose: 1.6 as const,
  },
} as const;

// ─── Composite text style presets ───────────────────────────────────────────
// Use these directly via spread: style={{ ...TYPE.label, color: "..." }}

export const TYPE: Record<string, React.CSSProperties> = {
  // ── Display / Headings (Orbitron) ──
  logo: {
    fontFamily: FONT.family.display,
    fontSize: FONT.size["3xl"],
    fontWeight: FONT.weight.black,
    letterSpacing: FONT.spacing.widest,
  },
  heading: {
    fontFamily: FONT.family.display,
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.heavy,
    letterSpacing: FONT.spacing.normal,
  },
  headingSm: {
    fontFamily: FONT.family.display,
    fontSize: FONT.size.base,
    fontWeight: FONT.weight.heavy,
  },

  // ── Labels (Orbitron, small) ──
  label: {
    fontFamily: FONT.family.display,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.heavy,
    letterSpacing: FONT.spacing.normal,
  },
  labelWide: {
    fontFamily: FONT.family.display,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.heavy,
    letterSpacing: FONT.spacing.wide,
  },
  labelXs: {
    fontFamily: FONT.family.display,
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
  },
  labelXxs: {
    fontFamily: FONT.family.display,
    fontSize: FONT.size.xxs,
    fontWeight: FONT.weight.bold,
  },

  // ── Buttons (Orbitron) ──
  button: {
    fontFamily: FONT.family.display,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.heavy,
  },
  buttonSm: {
    fontFamily: FONT.family.display,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.heavy,
  },
  buttonXs: {
    fontFamily: FONT.family.display,
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
  },

  // ── Nav tabs ──
  nav: {
    fontFamily: FONT.family.display,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.heavy,
    letterSpacing: FONT.spacing.normal,
  },

  // ── Stats / Numbers (Orbitron, large) ──
  stat: {
    fontFamily: FONT.family.display,
    fontSize: FONT.size["2xl"],
    fontWeight: FONT.weight.black,
  },
  statSm: {
    fontFamily: FONT.family.display,
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
  },
  statXl: {
    fontFamily: FONT.family.display,
    fontSize: FONT.size["4xl"],
    fontWeight: FONT.weight.black,
  },

  // ── Mono / Data (Share Tech Mono) ──
  mono: {
    fontFamily: FONT.family.mono,
    fontSize: FONT.size.base,
  },
  monoSm: {
    fontFamily: FONT.family.mono,
    fontSize: FONT.size.md,
  },
  monoXs: {
    fontFamily: FONT.family.mono,
    fontSize: FONT.size.sm,
  },
  monoLg: {
    fontFamily: FONT.family.mono,
    fontSize: FONT.size.lg,
    lineHeight: FONT.leading.loose,
  },

  // ── Body text (inherits container font) ──
  body: { fontSize: FONT.size.base },
  bodySm: { fontSize: FONT.size.md, fontWeight: FONT.weight.medium },
  bodyXs: { fontSize: FONT.size.sm },
  bodyXxs: { fontSize: FONT.size.xs },

  // ── Tags / Badges ──
  tag: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.medium,
  },
  badge: {
    fontFamily: FONT.family.display,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.heavy,
  },
};
