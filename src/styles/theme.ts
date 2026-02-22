export const PROTOCOLS = ["TCP", "UDP", "HTTP", "HTTPS", "DNS", "ICMP", "ARP", "SSH", "FTP", "SMTP", "DHCP", "NTP", "SNMP", "TELNET", "RDP", "MQTT", "MySQL", "PGSQL", "LDAP", "SIP"] as const;

export const PROTOCOL_COLORS: Record<string, string> = {
  TCP: "#00ff9f",
  UDP: "#00b8ff",
  HTTP: "#ff6b00",
  HTTPS: "#ffd600",
  DNS: "#ff00ff",
  ICMP: "#00ffff",
  ARP: "#ff3366",
  SSH: "#9d00ff",
  FTP: "#00ff66",
  SMTP: "#ff9500",
  DHCP: "#a0ff00",
  NTP: "#ff66cc",
  SNMP: "#66ffcc",
  TELNET: "#cc6600",
  RDP: "#6699ff",
  MQTT: "#ff99ff",
  MySQL: "#ffcc33",
  PGSQL: "#3399ff",
  LDAP: "#cc99ff",
  SIP: "#ff6666",
};

export const STREAM_COLORS = [
  "#00ff9f", "#00b8ff", "#ff6b00", "#ffd600", "#ff00ff",
  "#00ffff", "#ff3366", "#9d00ff", "#00ff66", "#ff9500",
  "#7fff00", "#dc143c", "#00ced1", "#ff1493", "#32cd32",
];

// ─── Color Schemes ─────────────────────────────────────────────────────────

export type ColorScheme = "nexus" | "dark" | "light";

export interface SchemeVars {
  bgPrimary: string;
  bgSecondary: string;
  bgSurface: string;
  bgHover: string;
  bgConsole: string;        // darker bg for code/hex/terminal areas
  accent: string;
  accentRgb: string;       // for rgba() usage
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDim: string;
  textFaint: string;
  fontWeight: string;       // base font weight for readability
  fontWeightStrong: string; // bolder weight for headings/labels
  border: string;
  borderStrong: string;
  scrollbarThumb: string;
  headerBg: string;
}

export const COLOR_SCHEMES: Record<ColorScheme, SchemeVars> = {
  nexus: {
    bgPrimary: "#0a0f0a",
    bgSecondary: "rgba(0,0,0,0.2)",
    bgSurface: "rgba(0,255,159,0.03)",
    bgHover: "rgba(0,255,159,0.06)",
    bgConsole: "#060a06",
    accent: "#00ff9f",
    accentRgb: "0,255,159",
    textPrimary: "#e8e8e8",
    textSecondary: "#a0a0a0",
    textMuted: "#777",
    textDim: "#5a5a5a",
    textFaint: "#484848",
    fontWeight: "500",
    fontWeightStrong: "700",
    border: "rgba(0,255,159,0.1)",
    borderStrong: "rgba(0,255,159,0.2)",
    scrollbarThumb: "#00ff9f",
    headerBg: "rgba(10,15,10,0.95)",
  },
  dark: {
    bgPrimary: "#12121a",
    bgSecondary: "rgba(0,0,0,0.25)",
    bgSurface: "rgba(124,131,255,0.04)",
    bgHover: "rgba(124,131,255,0.08)",
    bgConsole: "#0c0c14",
    accent: "#7c83ff",
    accentRgb: "124,131,255",
    textPrimary: "#dcdce8",
    textSecondary: "#9999b0",
    textMuted: "#707088",
    textDim: "#58586e",
    textFaint: "#48485c",
    fontWeight: "500",
    fontWeightStrong: "700",
    border: "rgba(124,131,255,0.12)",
    borderStrong: "rgba(124,131,255,0.25)",
    scrollbarThumb: "#7c83ff",
    headerBg: "rgba(18,18,26,0.95)",
  },
  light: {
    bgPrimary: "#ebedf2",
    bgSecondary: "rgba(0,0,0,0.06)",
    bgSurface: "rgba(37,99,235,0.06)",
    bgHover: "rgba(37,99,235,0.10)",
    bgConsole: "#e0e2e8",
    accent: "#2563eb",
    accentRgb: "37,99,235",
    textPrimary: "#111122",
    textSecondary: "#3a3a50",
    textMuted: "#555566",
    textDim: "#6e6e80",
    textFaint: "#8a8a9a",
    fontWeight: "600",
    fontWeightStrong: "800",
    border: "rgba(0,0,0,0.12)",
    borderStrong: "rgba(0,0,0,0.22)",
    scrollbarThumb: "#2563eb",
    headerBg: "rgba(235,237,242,0.97)",
  },
};

export function schemeToCssVars(scheme: SchemeVars): string {
  return `
    --bg-primary: ${scheme.bgPrimary};
    --bg-secondary: ${scheme.bgSecondary};
    --bg-surface: ${scheme.bgSurface};
    --bg-hover: ${scheme.bgHover};
    --bg-console: ${scheme.bgConsole};
    --accent: ${scheme.accent};
    --accent-rgb: ${scheme.accentRgb};
    --text-primary: ${scheme.textPrimary};
    --text-secondary: ${scheme.textSecondary};
    --text-muted: ${scheme.textMuted};
    --text-dim: ${scheme.textDim};
    --text-faint: ${scheme.textFaint};
    --font-weight: ${scheme.fontWeight};
    --font-weight-strong: ${scheme.fontWeightStrong};
    --border: ${scheme.border};
    --border-strong: ${scheme.borderStrong};
    --scrollbar-thumb: ${scheme.scrollbarThumb};
    --header-bg: ${scheme.headerBg};
  `;
}

export const LAYER_COLORS = {
  ethernet: { bg: "rgba(255, 51, 102, 0.15)", border: "#ff3366", text: "#ff3366" },
  ip: { bg: "rgba(0, 184, 255, 0.15)", border: "#00b8ff", text: "#00b8ff" },
  tcp: { bg: "rgba(0, 255, 159, 0.15)", border: "#00ff9f", text: "#00ff9f" },
  udp: { bg: "rgba(255, 214, 0, 0.15)", border: "#ffd600", text: "#ffd600" },
  payload: { bg: "rgba(157, 0, 255, 0.15)", border: "#9d00ff", text: "#9d00ff" },
};
