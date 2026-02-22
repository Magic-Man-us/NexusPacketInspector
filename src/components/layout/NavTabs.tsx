import { usePacketStore, ViewId } from "../../hooks/usePacketStore";
import { styles } from "../../styles/components";

const tabs: { id: ViewId; label: string; icon: string }[] = [
  { id: "packets", label: "PACKETS", icon: "☰" },
  { id: "structure", label: "STRUCTURE", icon: "⬢" },
  { id: "routetrace", label: "ROUTE TRACE", icon: "⟿" },
  { id: "matrix", label: "MATRIX", icon: "▦" },
  { id: "sankey", label: "SANKEY", icon: "⥤" },
  { id: "sequence", label: "SEQUENCE", icon: "↕" },
  { id: "topology", label: "TOPOLOGY", icon: "◎" },
  { id: "services", label: "SERVICES", icon: "⚙" },
  { id: "statistics", label: "STATS", icon: "◧" },
  { id: "plugins", label: "PLUGINS", icon: "⚡" },
];

export function NavTabs() {
  const activeView = usePacketStore((s) => s.activeView);
  const setActiveView = usePacketStore((s) => s.setActiveView);

  return (
    <nav style={styles.nav}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveView(tab.id)}
          style={{
            ...styles.navTab,
            ...(activeView === tab.id ? styles.navTabActive : {}),
          }}
        >
          <span style={styles.navIcon}>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
