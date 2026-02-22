import { usePacketStore } from "../../../hooks/usePacketStore";
import { useFilteredPackets } from "../../../hooks/useFilteredPackets";
import { VirtualPacketTable } from "./VirtualPacketTable";
import { PacketDetails } from "./PacketDetails";
import { styles } from "../../../styles/components";

export function PacketListView() {
  const filteredPackets = useFilteredPackets();

  return (
    <div style={styles.splitView}>
      <VirtualPacketTable packets={filteredPackets} />
      <PacketDetails />
    </div>
  );
}
