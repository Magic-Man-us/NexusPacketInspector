import { useMemo } from "react";
import { usePacketStore } from "./usePacketStore";
import { ParsedPacket } from "../types/packet";

export function useFilteredPackets(): ParsedPacket[] {
  const packets = usePacketStore((s) => s.packets);
  const filter = usePacketStore((s) => s.filter);

  return useMemo(() => {
    if (!filter.trim()) return packets;
    const f = filter.toLowerCase();
    return packets.filter(
      (p) =>
        p.protocol.toLowerCase().includes(f) ||
        p.ip.srcIp.includes(f) ||
        p.ip.dstIp.includes(f) ||
        p.info.toLowerCase().includes(f)
    );
  }, [packets, filter]);
}
