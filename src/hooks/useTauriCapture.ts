import { useEffect, useCallback } from "react";
import { usePacketStore } from "./usePacketStore";
import { ParsedPacket } from "../types/packet";

// Detect if we're running inside Tauri
const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/**
 * Registers the Tauri packets-chunk listener. Call ONCE from App.tsx.
 */
export function useTauriListener() {
  useEffect(() => {
    if (!isTauri) return;

    let cancelled = false;
    let unlistenFn: (() => void) | undefined;

    (async () => {
      const { listen } = await import("@tauri-apps/api/event");
      const { addPackets, updateStats, updateStream, updateDashboardStats } = usePacketStore.getState();
      const unlisten = await listen<ParsedPacket[]>("packets-chunk", (event) => {
        const packets = event.payload;
        addPackets(packets);
        for (const pkt of packets) {
          updateStats(pkt);
          updateStream(pkt);
          updateDashboardStats(pkt);
        }
      });

      if (cancelled) {
        unlisten();
      } else {
        unlistenFn = unlisten;
      }
    })();

    return () => {
      cancelled = true;
      unlistenFn?.();
    };
  }, []);
}

/**
 * Returns PCAP file operations. Safe to call from any component — no listener side effects.
 */
export function usePcapActions() {
  const clearPackets = usePacketStore((s) => s.clearPackets);
  const setMode = usePacketStore((s) => s.setMode);
  const setLoading = usePacketStore((s) => s.setLoading);
  const resetStats = usePacketStore((s) => s.resetStats);
  const resetStreams = usePacketStore((s) => s.resetStreams);
  const resetDashboardStats = usePacketStore((s) => s.resetDashboardStats);

  const openPcapFile = useCallback(async () => {
    if (!isTauri) {
      console.warn("PCAP file opening requires Tauri runtime");
      return;
    }

    const { invoke } = await import("@tauri-apps/api/core");
    const { open } = await import("@tauri-apps/plugin-dialog");

    const selected = await open({
      multiple: false,
      filters: [
        { name: "PCAP Files", extensions: ["pcap", "pcapng", "cap"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (!selected) return;

    const path = typeof selected === "string" ? selected : String(selected);
    clearPackets();
    resetStats();
    resetStreams();
    resetDashboardStats();
    setMode("pcap");
    setLoading(true);

    try {
      const count = await invoke<number>("open_pcap", { path });
      console.log(`Loaded ${count} packets from PCAP`);
    } catch (err) {
      console.error("Failed to open PCAP:", err);
    } finally {
      setLoading(false);
    }
  }, [clearPackets, resetStats, resetStreams, resetDashboardStats, setMode, setLoading]);

  const applyFilter = useCallback(async (filterText: string) => {
    if (!isTauri) return [];

    const { invoke } = await import("@tauri-apps/api/core");
    try {
      const indices = await invoke<number[]>("apply_filter", { filterText });
      return indices;
    } catch (err) {
      console.error("Filter error:", err);
      return [];
    }
  }, []);

  return { openPcapFile, applyFilter };
}
