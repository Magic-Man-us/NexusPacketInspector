import { useEffect, useRef } from "react";
import { usePacketStore } from "./usePacketStore";
import { generatePacket, getStreamKey, DemoPacket, StreamInfo, resetConversationState } from "../lib/demo-mode";

export function useDemoCapture() {
  const isCapturing = usePacketStore((s) => s.isCapturing);
  const mode = usePacketStore((s) => s.mode);
  const addPackets = usePacketStore((s) => s.addPackets);
  const updateStats = usePacketStore((s) => s.updateStats);
  const updateDashboardStats = usePacketStore((s) => s.updateDashboardStats);
  const updateStream = usePacketStore((s) => s.updateStream);
  const packetIdRef = useRef(0);
  const existingStreamsRef = useRef<StreamInfo[]>([]);

  useEffect(() => {
    if (!isCapturing || mode !== "demo") return;

    const interval = setInterval(() => {
      const newPacket: DemoPacket = generatePacket(
        ++packetIdRef.current,
        existingStreamsRef.current
      );

      // Track existing streams for reuse
      const found = existingStreamsRef.current.find(
        (s) =>
          s.srcIP === newPacket.ip.srcIp &&
          s.dstIP === newPacket.ip.dstIp &&
          s.srcPort === newPacket.srcPort &&
          s.dstPort === newPacket.dstPort
      );
      if (!found) {
        existingStreamsRef.current.push({
          protocol: newPacket.protocol,
          srcIP: newPacket.ip.srcIp,
          dstIP: newPacket.ip.dstIp,
          srcPort: newPacket.srcPort,
          dstPort: newPacket.dstPort,
        });
        if (existingStreamsRef.current.length > 20) {
          existingStreamsRef.current.shift();
        }
      }

      // Store route data in the stream via a temporary extended update
      addPackets([newPacket]);
      updateStats(newPacket);
      updateDashboardStats(newPacket);
      updateStream(newPacket);

      // Patch route data onto the stream after it exists
      const key = newPacket.streamKey;
      if (newPacket.route) {
        usePacketStore.setState((state) => {
          const existing = state.streams[key];
          if (existing && !existing.route) {
            return {
              streams: {
                ...state.streams,
                [key]: { ...existing, route: newPacket.route },
              },
            };
          }
          return state;
        });
      }
    }, 150 + Math.random() * 150);

    return () => clearInterval(interval);
  }, [isCapturing, mode, addPackets, updateStats, updateDashboardStats, updateStream]);

  const resetDemo = () => {
    packetIdRef.current = 0;
    existingStreamsRef.current = [];
    resetConversationState();
  };

  return { resetDemo };
}
