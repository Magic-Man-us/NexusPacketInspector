import { VisualEffects } from "../hooks/usePacketStore";

export const globalStyles = (effects: VisualEffects): string => `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes scanline {
    0% { top: -10%; }
    100% { top: 110%; }
  }
  @keyframes flicker {
    0%, 100% { opacity: 0.03; }
    50% { opacity: 0.05; }
  }
  .scanline-effect {
    animation: scanline ${effects.scanlineSpeed}s linear infinite;
  }
  @keyframes navGlow {
    0%, 100% { box-shadow: 0 2px 8px rgba(0,255,159,0.3), inset 0 -2px 6px rgba(0,255,159,0.1); }
    50% { box-shadow: 0 2px 14px rgba(0,255,159,0.5), inset 0 -2px 10px rgba(0,255,159,0.15); }
  }
  .nav-tab-active-glow {
    animation: navGlow 2s ease-in-out infinite;
  }
::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #0a0f0a; }
  ::-webkit-scrollbar-thumb { background: #00ff9f; border-radius: 3px; }
  nav::-webkit-scrollbar { display: none; }
`;

export const noiseBackground = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`;
