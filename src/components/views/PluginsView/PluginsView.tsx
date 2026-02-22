import { useState } from "react";
import { PluginSelector } from "./PluginSelector";
import { NmapPanel } from "./NmapPanel";

export function PluginsView() {
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>("nmap");

  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
      <PluginSelector selected={selectedPlugin} onSelect={setSelectedPlugin} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {selectedPlugin === "nmap" && <NmapPanel />}
        {selectedPlugin && selectedPlugin !== "nmap" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#444",
              fontSize: "11px",
            }}
          >
            Plugin "{selectedPlugin}" has no dedicated UI panel yet
          </div>
        )}
        {!selectedPlugin && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#444",
              fontSize: "11px",
            }}
          >
            Select a plugin from the sidebar
          </div>
        )}
      </div>
    </div>
  );
}
