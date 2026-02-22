import { create } from "zustand";
import { ParsedPacket } from "../types/packet";
import { StreamData } from "../types/stream";
import { PacketStatistics, DashboardStats } from "../types/statistics";
import { STREAM_COLORS } from "../styles/theme";

export type ViewId = "dashboard" | "packets" | "structure" | "routetrace" | "matrix" | "sankey" | "sequence" | "topology" | "services" | "plugins" | "livewire";

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

  // Dashboard stats
  dashboardStats: DashboardStats;
  updateDashboardStats: (packet: ParsedPacket) => void;
  resetDashboardStats: () => void;

  // Loading
  isLoading: boolean;
  loadProgress: number;
  setLoading: (loading: boolean, progress?: number) => void;
}

const defaultStats: PacketStatistics = { total: 0, protocols: {}, ips: {}, ports: {} };

const defaultDashboardStats: DashboardStats = {
  packetSizes: [],
  timestamps: [],
  anomalies: { rstCount: 0, oversizedCount: 0, unusualPortCount: 0 },
  bytesPerProtocol: {},
};

const defaultEffects: VisualEffects = {
  scanline: false,
  scanlineSpeed: 8,
  crt: false,
  crtIntensity: 0.05,
  grid: false,
  gridOpacity: 0.015,
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

  activeView: "dashboard",
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

  dashboardStats: defaultDashboardStats,
  updateDashboardStats: (packet) =>
    set((state) => {
      const sizes = [...state.dashboardStats.packetSizes, packet.length].slice(-200);
      const timestamps = [...state.dashboardStats.timestamps, packet.time].slice(-500);
      const anomalies = { ...state.dashboardStats.anomalies };
      if (packet.tcp?.flags.rst) anomalies.rstCount++;
      if (packet.length > 1500) anomalies.oversizedCount++;
      const commonPorts = new Set([20, 21, 22, 23, 25, 53, 67, 68, 80, 110, 123, 143, 161, 389, 443, 465, 587, 993, 995, 1883, 3306, 3389, 5060, 5432, 8080, 8443]);
      if (packet.dstPort > 0 && packet.dstPort < 49152 && !commonPorts.has(packet.dstPort)) anomalies.unusualPortCount++;
      const bytesPerProtocol = { ...state.dashboardStats.bytesPerProtocol };
      bytesPerProtocol[packet.protocol] = (bytesPerProtocol[packet.protocol] || 0) + packet.length;
      return { dashboardStats: { packetSizes: sizes, timestamps, anomalies, bytesPerProtocol } };
    }),
  resetDashboardStats: () => set({ dashboardStats: defaultDashboardStats }),

  showSettings: false,
  setShowSettings: (show) => set({ showSettings: show }),
  visualEffects: defaultEffects,
  setVisualEffects: (effects) => set({ visualEffects: effects }),

  isLoading: false,
  loadProgress: 0,
  setLoading: (loading, progress = 0) => set({ isLoading: loading, loadProgress: progress }),
}));
