import { useState } from "react";
import { FONT } from "../../../styles/typography";
import { PluginSelector } from "./PluginSelector";
import { NmapPanel } from "./NmapPanel";
import { TsharkPanel } from "./TsharkPanel";

export function PluginsView() {
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>("nmap");

  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
      <PluginSelector selected={selectedPlugin} onSelect={setSelectedPlugin} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {selectedPlugin === "nmap" && <NmapPanel />}
        {selectedPlugin === "tshark" && <TsharkPanel />}
        {selectedPlugin && selectedPlugin !== "nmap" && selectedPlugin !== "tshark" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-faint)",
              fontSize: FONT.size.base,
            }}
          >
            Plugin &quot;{selectedPlugin}&quot; has no dedicated UI panel yet
          </div>
        )}
        {!selectedPlugin && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-faint)",
              fontSize: FONT.size.base,
            }}
          >
            Select a plugin from the sidebar
          </div>
        )}
      </div>
    </div>
  );
}
