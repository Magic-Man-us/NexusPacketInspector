import { useEffect, useRef } from "react";
import { usePacketStore } from "./usePacketStore";
import { generatePacket, getStreamKey, DemoPacket, StreamInfo } from "../lib/demo-mode";

export function useDemoCapture() {
  const isCapturing = usePacketStore((s) => s.isCapturing);
  const mode = usePacketStore((s) => s.mode);
  const addPackets = usePacketStore((s) => s.addPackets);
  const updateStats = usePacketStore((s) => s.updateStats);
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

      // Update stream with route data from demo packet
      const store = usePacketStore.getState();
      const key = newPacket.streamKey;
      const existing = store.streams[key];
      if (existing && !existing.route && newPacket.route) {
        usePacketStore.setState({
          streams: {
            ...store.streams,
            [key]: { ...existing, route: newPacket.route },
          },
        });
      }
      updateStream(newPacket);
    }, 150 + Math.random() * 150);

    return () => clearInterval(interval);
  }, [isCapturing, mode, addPackets, updateStats, updateStream]);

  const resetDemo = () => {
    packetIdRef.current = 0;
    existingStreamsRef.current = [];
  };

  return { resetDemo };
}
