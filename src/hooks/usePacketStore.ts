import { create } from "zustand";
import { ParsedPacket } from "../types/packet";
import { StreamData } from "../types/stream";
import { PacketStatistics, DashboardStats } from "../types/statistics";
import { STREAM_COLORS, ColorScheme } from "../styles/theme";

export type ViewId = "dashboard" | "packets" | "structure" | "routetrace" | "matrix" | "sankey" | "sequence" | "topology" | "services" | "plugins" | "livewire" | "stats";

export type AppMode = "demo" | "pcap";

export interface VisualEffects {
  colorScheme: ColorScheme;
  grid: boolean;
  gridOpacity: number;
  sequenceFx: "river" | "arrows";
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
  selectedPackets: ParsedPacket[];
  toggleSelectedPacket: (packet: ParsedPacket) => void;
  clearSelectedPackets: () => void;

  // Cross-highlight (structure view → hex viewer)
  highlightedByteRange: { start: number; end: number } | null;
  setHighlightedByteRange: (range: { start: number; end: number } | null) => void;

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

  // PCAP file path (for plugins like tshark)
  pcapFilePath: string | null;
  setPcapFilePath: (path: string | null) => void;

  // Loading
  isLoading: boolean;
  loadProgress: number;
  setLoading: (loading: boolean, progress?: number) => void;
}

const defaultStats: PacketStatistics = {
  total: 0, protocols: {}, ips: {}, ports: {},
  srcIps: {}, dstIps: {},
  tcpCount: 0, udpCount: 0, tcpBytes: 0, udpBytes: 0, totalBytes: 0,
  minSize: Infinity, maxSize: 0,
  synCount: 0, finCount: 0, rstCount: 0, ackCount: 0, pshCount: 0,
  retransmissions: 0, seenSeqCount: 0,
  ttlBuckets: {}, conversations: {},
  firstTimestamp: 0, lastTimestamp: 0,
};

// Module-level Set for retransmission tracking (avoids serialization in store)
let seenSeqs = new Set<string>();

const defaultDashboardStats: DashboardStats = {
  packetSizes: [],
  timestamps: [],
  anomalies: { rstCount: 0, oversizedCount: 0, unusualPortCount: 0 },
  bytesPerProtocol: {},
};

const defaultEffects: VisualEffects = {
  colorScheme: "nexus",
  grid: false,
  gridOpacity: 0.015,
  sequenceFx: "river",
};

export const usePacketStore = create<PacketStore>((set, get) => ({
  mode: "demo",
  setMode: (mode) => set({ mode }),

  packets: [],
  addPackets: (newPackets) =>
    set((state) => ({
      packets: state.mode === "demo"
        ? [...state.packets, ...newPackets].slice(-500)
        : [...state.packets, ...newPackets],
    })),
  clearPackets: () => set({ packets: [], selectedPacket: null, selectedPackets: [], pcapFilePath: null }),

  selectedPacket: null,
  setSelectedPacket: (packet) => set({ selectedPacket: packet, selectedPackets: packet ? [packet] : [], highlightedByteRange: null }),
  selectedPackets: [],
  toggleSelectedPacket: (packet) =>
    set((state) => {
      const exists = state.selectedPackets.some((p) => p.id === packet.id);
      const next = exists
        ? state.selectedPackets.filter((p) => p.id !== packet.id)
        : [...state.selectedPackets, packet];
      return {
        selectedPackets: next,
        selectedPacket: next.length > 0 ? next[next.length - 1] : null,
        highlightedByteRange: null,
      };
    }),
  clearSelectedPackets: () => set({ selectedPackets: [], selectedPacket: null, highlightedByteRange: null }),

  highlightedByteRange: null,
  setHighlightedByteRange: (range) => set({ highlightedByteRange: range }),

  activeView: "dashboard",
  setActiveView: (view) => set({ activeView: view }),

  isCapturing: false,
  setIsCapturing: (capturing) => set({ isCapturing: capturing }),

  filter: "",
  setFilter: (filter) => set({ filter }),

  stats: defaultStats,
  updateStats: (packet) =>
    set((state) => {
      const s = state.stats;

      // TCP/UDP counting
      let tcpCount = s.tcpCount;
      let udpCount = s.udpCount;
      let tcpBytes = s.tcpBytes;
      let udpBytes = s.udpBytes;
      let synCount = s.synCount;
      let finCount = s.finCount;
      let rstCount = s.rstCount;
      let ackCount = s.ackCount;
      let pshCount = s.pshCount;
      let retransmissions = s.retransmissions;
      let seenSeqCount = s.seenSeqCount;

      if (packet.isUdp) {
        udpCount++;
        udpBytes += packet.length;
      } else if (packet.tcp) {
        tcpCount++;
        tcpBytes += packet.length;
        if (packet.tcp.flags) {
          if (packet.tcp.flags.syn) synCount++;
          if (packet.tcp.flags.fin) finCount++;
          if (packet.tcp.flags.rst) rstCount++;
          if (packet.tcp.flags.ack) ackCount++;
          if (packet.tcp.flags.psh) pshCount++;
        }
        const seqKey = `${packet.ip.srcIp}:${packet.srcPort}-${packet.tcp.sequenceNumber}`;
        if (seenSeqs.has(seqKey)) {
          retransmissions++;
        } else {
          seenSeqs.add(seqKey);
          seenSeqCount++;
        }
      }

      // Conversations
      const convKey = [packet.ip.srcIp, packet.ip.dstIp].sort().join(" <-> ");
      const conversations = { ...s.conversations };
      if (!conversations[convKey]) conversations[convKey] = { packets: 0, bytes: 0 };
      conversations[convKey] = {
        packets: conversations[convKey].packets + 1,
        bytes: conversations[convKey].bytes + packet.length,
      };

      // TTL buckets
      const bucketBase = Math.floor(packet.ip.ttl / 16) * 16;
      const ttlKey = `${bucketBase}-${bucketBase + 15}`;
      const ttlBuckets = { ...s.ttlBuckets };
      ttlBuckets[ttlKey] = (ttlBuckets[ttlKey] || 0) + 1;

      return {
        stats: {
          total: s.total + 1,
          protocols: { ...s.protocols, [packet.protocol]: (s.protocols[packet.protocol] || 0) + 1 },
          ips: {
            ...s.ips,
            [packet.ip.srcIp]: (s.ips[packet.ip.srcIp] || 0) + 1,
            [packet.ip.dstIp]: (s.ips[packet.ip.dstIp] || 0) + 1,
          },
          ports: { ...s.ports, [packet.dstPort]: (s.ports[packet.dstPort] || 0) + 1 },
          srcIps: { ...s.srcIps, [packet.ip.srcIp]: (s.srcIps[packet.ip.srcIp] || 0) + 1 },
          dstIps: { ...s.dstIps, [packet.ip.dstIp]: (s.dstIps[packet.ip.dstIp] || 0) + 1 },
          tcpCount, udpCount, tcpBytes, udpBytes,
          totalBytes: s.totalBytes + packet.length,
          minSize: Math.min(s.minSize === Infinity ? packet.length : s.minSize, packet.length),
          maxSize: Math.max(s.maxSize, packet.length),
          synCount, finCount, rstCount, ackCount, pshCount,
          retransmissions, seenSeqCount,
          ttlBuckets,
          conversations,
          firstTimestamp: s.firstTimestamp === 0 ? packet.time : s.firstTimestamp,
          lastTimestamp: packet.time,
        },
      };
    }),
  resetStats: () => {
    seenSeqs = new Set<string>();
    set({
      stats: {
        total: 0, protocols: {}, ips: {}, ports: {},
        srcIps: {}, dstIps: {},
        tcpCount: 0, udpCount: 0, tcpBytes: 0, udpBytes: 0, totalBytes: 0,
        minSize: Infinity, maxSize: 0,
        synCount: 0, finCount: 0, rstCount: 0, ackCount: 0, pshCount: 0,
        retransmissions: 0, seenSeqCount: 0,
        ttlBuckets: {}, conversations: {},
        firstTimestamp: 0, lastTimestamp: 0,
      },
    });
  },

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
      const commonPorts = new Set([20, 21, 22, 23, 25, 53, 67, 68, 80, 110, 123, 143, 161, 162, 389, 443, 465, 587, 993, 995, 1883, 3306, 3389, 5060, 5432, 5900, 8080, 8443]);
      if (packet.dstPort > 0 && packet.dstPort < 49152 && !commonPorts.has(packet.dstPort)) anomalies.unusualPortCount++;
      const bytesPerProtocol = { ...state.dashboardStats.bytesPerProtocol };
      bytesPerProtocol[packet.protocol] = (bytesPerProtocol[packet.protocol] || 0) + packet.length;
      return { dashboardStats: { packetSizes: sizes, timestamps, anomalies, bytesPerProtocol } };
    }),
  resetDashboardStats: () => set({
    dashboardStats: {
      packetSizes: [],
      timestamps: [],
      anomalies: { rstCount: 0, oversizedCount: 0, unusualPortCount: 0 },
      bytesPerProtocol: {},
    },
  }),

  showSettings: false,
  setShowSettings: (show) => set({ showSettings: show }),
  visualEffects: defaultEffects,
  setVisualEffects: (effects) => set({ visualEffects: effects }),

  pcapFilePath: null,
  setPcapFilePath: (path) => set({ pcapFilePath: path }),

  isLoading: false,
  loadProgress: 0,
  setLoading: (loading, progress = 0) => set({ isLoading: loading, loadProgress: progress }),
}));
