import React, { useState } from "react";
import { usePacketStore, ViewId } from "../../hooks/usePacketStore";
import { styles } from "../../styles/components";

const tabs: { id: ViewId; label: string; icon: string }[] = [
  { id: "dashboard", label: "DASHBOARD", icon: "◫" },
  { id: "packets", label: "PACKETS", icon: "☰" },
  { id: "structure", label: "STRUCTURE", icon: "⬢" },
  { id: "livewire", label: "LIVEWIRE", icon: "↯" },
  { id: "routetrace", label: "ROUTE TRACE", icon: "⟿" },
  { id: "matrix", label: "MATRIX", icon: "▦" },
  { id: "sankey", label: "SANKEY", icon: "⥤" },
  { id: "sequence", label: "SEQUENCE", icon: "↕" },
  { id: "topology", label: "TOPOLOGY", icon: "◎" },
  { id: "services", label: "SERVICES", icon: "⚙" },
  { id: "plugins", label: "PLUGINS", icon: "⚡" },
  { id: "stats", label: "STATS", icon: "◈" },
];

export function NavTabs() {
  const activeView = usePacketStore((s) => s.activeView);
  const setActiveView = usePacketStore((s) => s.setActiveView);
  const [hoveredTab, setHoveredTab] = useState<ViewId | null>(null);

  return (
    <nav style={styles.nav}>
      {tabs.map((tab, index) => {
        const isActive = activeView === tab.id;
        const isHovered = hoveredTab === tab.id && !isActive;

        // Build style without color — color is handled by CSS classes + !important
        const buttonStyle: React.CSSProperties = {
          ...styles.navTab,
          ...(isHovered ? styles.navTabHover : {}),
          ...(isActive ? styles.navTabActive : {}),
        };

        return (
          <React.Fragment key={tab.id}>
            {index > 0 && <div style={styles.navSeparator} />}
            <button
              onClick={() => setActiveView(tab.id)}
              onMouseEnter={() => setHoveredTab(tab.id)}
              onMouseLeave={() => setHoveredTab(null)}
              className={isActive ? "nav-tab-active-glow nav-tab-active" : undefined}
              style={buttonStyle}
            >
              <span
                style={{
                  ...styles.navIcon,
                  ...(isHovered ? styles.navIconHover : {}),
                  ...(isActive ? styles.navIconActive : {}),
                }}
              >
                {tab.icon}
              </span>
              {tab.label}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
