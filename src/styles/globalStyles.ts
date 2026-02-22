import { VisualEffects } from "../hooks/usePacketStore";
import { COLOR_SCHEMES, schemeToCssVars } from "./theme";

export const globalStyles = (effects: VisualEffects): string => {
  const scheme = COLOR_SCHEMES[effects.colorScheme];
  return `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');

  :root {
    ${schemeToCssVars(scheme)}
  }

  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes navGlow {
    0%, 100% { box-shadow: 0 2px 8px rgba(var(--accent-rgb),0.3), inset 0 -2px 6px rgba(var(--accent-rgb),0.1); }
    50% { box-shadow: 0 2px 14px rgba(var(--accent-rgb),0.5), inset 0 -2px 10px rgba(var(--accent-rgb),0.15); }
  }
  .nav-tab-active-glow {
    animation: navGlow 2s ease-in-out infinite;
  }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: var(--bg-primary); }
  ::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 3px; }
  nav::-webkit-scrollbar { display: none; }
`;
};

export const noiseBackground = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`;
