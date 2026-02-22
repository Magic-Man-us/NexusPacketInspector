import { useEffect, useCallback } from "react";
import { usePacketStore } from "./usePacketStore";
import { ParsedPacket } from "../types/packet";

// Detect if we're running inside Tauri
const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export function useTauriCapture() {
  const addPackets = usePacketStore((s) => s.addPackets);
  const clearPackets = usePacketStore((s) => s.clearPackets);
  const setMode = usePacketStore((s) => s.setMode);
  const setLoading = usePacketStore((s) => s.setLoading);
  const resetStats = usePacketStore((s) => s.resetStats);
  const resetStreams = usePacketStore((s) => s.resetStreams);
  const updateStats = usePacketStore((s) => s.updateStats);
  const updateStream = usePacketStore((s) => s.updateStream);

  useEffect(() => {
    if (!isTauri) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      const { listen } = await import("@tauri-apps/api/event");
      const unlisten = await listen<ParsedPacket[]>("packets-chunk", (event) => {
        const packets = event.payload;
        addPackets(packets);
        for (const pkt of packets) {
          updateStats(pkt);
          updateStream(pkt);
        }
      });
      cleanup = unlisten;
    })();

    return () => {
      cleanup?.();
    };
  }, [addPackets, updateStats, updateStream]);

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
  }, [clearPackets, resetStats, resetStreams, setMode, setLoading]);

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
