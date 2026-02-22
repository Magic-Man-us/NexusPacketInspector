import { create } from "zustand";
import { ParsedPacket } from "../types/packet";
import { StreamData } from "../types/stream";
import { PacketStatistics } from "../types/statistics";
import { STREAM_COLORS } from "../styles/theme";

export type ViewId = "packets" | "structure" | "routetrace" | "matrix" | "sankey" | "sequence" | "topology" | "services" | "statistics" | "plugins";

export type AppMode = "demo" | "pcap";

export interface VisualEffects {
  scanline: boolean;
  scanlineSpeed: number;
  crt: boolean;
  crtIntensity: number;
  grid: boolean;
  gridOpacity: number;
}

interface PacketStore {
  // Mode
  mode: AppMode;
  setMode: (mode: AppMode) => void;

  // Packets
  packets: ParsedPacket[];
  addPackets: (packets: ParsedPacket[]) => void;
  clearPackets: () => void;

  // Selection
  selectedPacket: ParsedPacket | null;
  setSelectedPacket: (packet: ParsedPacket | null) => void;

  // View
  activeView: ViewId;
  setActiveView: (view: ViewId) => void;

  // Capture (demo mode)
  isCapturing: boolean;
  setIsCapturing: (capturing: boolean) => void;

  // Filter
  filter: string;
  setFilter: (filter: string) => void;

  // Stats
  stats: PacketStatistics;
  updateStats: (packet: ParsedPacket) => void;
  resetStats: () => void;

  // Streams
  streams: Record<string, StreamData>;
  updateStream: (packet: ParsedPacket) => void;
  resetStreams: () => void;

  // Settings
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  visualEffects: VisualEffects;
  setVisualEffects: (effects: VisualEffects) => void;

  // Loading
  isLoading: boolean;
  loadProgress: number;
  setLoading: (loading: boolean, progress?: number) => void;
}

const defaultStats: PacketStatistics = { total: 0, protocols: {}, ips: {}, ports: {} };

const defaultEffects: VisualEffects = {
  scanline: true,
  scanlineSpeed: 4,
  crt: true,
  crtIntensity: 0.1,
  grid: true,
  gridOpacity: 0.02,
};

export const usePacketStore = create<PacketStore>((set, get) => ({
  mode: "demo",
  setMode: (mode) => set({ mode }),

  packets: [],
  addPackets: (newPackets) =>
    set((state) => ({
      packets: state.mode === "demo"
        ? [...state.packets.slice(-500), ...newPackets]
        : [...state.packets, ...newPackets],
    })),
  clearPackets: () => set({ packets: [], selectedPacket: null }),

  selectedPacket: null,
  setSelectedPacket: (packet) => set({ selectedPacket: packet }),

  activeView: "packets",
  setActiveView: (view) => set({ activeView: view }),

  isCapturing: false,
  setIsCapturing: (capturing) => set({ isCapturing: capturing }),

  filter: "",
  setFilter: (filter) => set({ filter }),

  stats: defaultStats,
  updateStats: (packet) =>
    set((state) => ({
      stats: {
        total: state.stats.total + 1,
        protocols: {
          ...state.stats.protocols,
          [packet.protocol]: (state.stats.protocols[packet.protocol] || 0) + 1,
        },
        ips: {
          ...state.stats.ips,
          [packet.ip.srcIp]: (state.stats.ips[packet.ip.srcIp] || 0) + 1,
          [packet.ip.dstIp]: (state.stats.ips[packet.ip.dstIp] || 0) + 1,
        },
        ports: {
          ...state.stats.ports,
          [packet.dstPort]: (state.stats.ports[packet.dstPort] || 0) + 1,
        },
      },
    })),
  resetStats: () => set({ stats: defaultStats }),

  streams: {},
  updateStream: (packet) =>
    set((state) => {
      const key = packet.streamKey;
      const existing = state.streams[key];
      if (existing) {
        return {
          streams: {
            ...state.streams,
            [key]: {
              ...existing,
              packets: [...existing.packets.slice(-100), packet],
              lastTime: packet.time,
              totalBytes: existing.totalBytes + packet.length,
            },
          },
        };
      }
      return {
        streams: {
          ...state.streams,
          [key]: {
            packets: [packet],
            srcIP: packet.ip.srcIp,
            dstIP: packet.ip.dstIp,
            srcPort: packet.srcPort,
            dstPort: packet.dstPort,
            protocol: packet.protocol,
            startTime: packet.time,
            lastTime: packet.time,
            color: STREAM_COLORS[Object.keys(state.streams).length % STREAM_COLORS.length],
            totalBytes: packet.length,
          },
        },
      };
    }),
  resetStreams: () => set({ streams: {} }),

  showSettings: false,
  setShowSettings: (show) => set({ showSettings: show }),
  visualEffects: defaultEffects,
  setVisualEffects: (effects) => set({ visualEffects: effects }),

  isLoading: false,
  loadProgress: 0,
  setLoading: (loading, progress = 0) => set({ isLoading: loading, loadProgress: progress }),
}));
