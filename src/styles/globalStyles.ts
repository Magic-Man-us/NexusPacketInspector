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
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #0a0f0a; }
  ::-webkit-scrollbar-thumb { background: #00ff9f; border-radius: 3px; }
`;
