import { create } from "zustand";
import {
  PacketEnrichment,
  PluginInfo,
  PluginProgress,
  PluginResult,
} from "../types/plugin";

interface PluginStore {
  // Plugin registry
  plugins: PluginInfo[];
  setPlugins: (plugins: PluginInfo[]) => void;

  // Running state
  runningPlugin: string | null;
  setRunningPlugin: (name: string | null) => void;

  // Progress
  progressLines: string[];
  progressPercent: number | null;
  addProgress: (progress: PluginProgress) => void;
  clearProgress: () => void;

  // Results
  results: Record<string, PluginResult>;
  setResult: (name: string, result: PluginResult) => void;

  // Enrichments
  enrichments: Record<string, PacketEnrichment>;
  setEnrichments: (enrichments: PacketEnrichment[]) => void;
  mergeEnrichments: (enrichments: PacketEnrichment[]) => void;
}

export const usePluginStore = create<PluginStore>((set) => ({
  plugins: [],
  setPlugins: (plugins) => set({ plugins }),

  runningPlugin: null,
  setRunningPlugin: (name) => set({ runningPlugin: name }),

  progressLines: [],
  progressPercent: null,
  addProgress: (progress) =>
    set((state) => ({
      progressLines: [...state.progressLines.slice(-200), progress.line],
      progressPercent: progress.percent ?? state.progressPercent,
    })),
  clearProgress: () => set({ progressLines: [], progressPercent: null }),

  results: {},
  setResult: (name, result) =>
    set((state) => ({
      results: { ...state.results, [name]: result },
    })),

  enrichments: {},
  setEnrichments: (enrichments) =>
    set({
      enrichments: Object.fromEntries(enrichments.map((e) => [e.ip, e])),
    }),
  mergeEnrichments: (enrichments) =>
    set((state) => ({
      enrichments: {
        ...state.enrichments,
        ...Object.fromEntries(enrichments.map((e) => [e.ip, e])),
      },
    })),
}));
