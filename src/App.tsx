import { usePacketStore } from "./hooks/usePacketStore";
import { useDemoCapture } from "./hooks/useDemoCapture";
import { useTauriCapture } from "./hooks/useTauriCapture";
import { Header } from "./components/layout/Header";
import { NavTabs } from "./components/layout/NavTabs";
import { StatusBar } from "./components/layout/StatusBar";
import { SettingsPanel } from "./components/layout/SettingsPanel";
import { PacketListView } from "./components/views/PacketListView/PacketListView";
import { PacketStructure } from "./components/views/StructureView/PacketStructure";
import { RouteTrace } from "./components/views/RouteTraceView/RouteTrace";
import { ConversationMatrix } from "./components/views/MatrixView/ConversationMatrix";
import { SankeyDiagram } from "./components/views/SankeyView/SankeyDiagram";
import { SequenceTimeline } from "./components/views/SequenceView/SequenceTimeline";
import { HierarchicalTopology } from "./components/views/TopologyView/HierarchicalTopology";
import { ServiceMap } from "./components/views/ServiceMapView/ServiceMap";
import { PluginsView } from "./components/views/PluginsView/PluginsView";
import { Dashboard } from "./components/views/DashboardView/Dashboard";
import { Livewire } from "./components/views/LivewireView/Livewire";
import { usePluginEvents } from "./hooks/usePluginEvents";
import { PacketSidebar } from "./components/shared/PacketSidebar";
import { globalStyles, noiseBackground } from "./styles/globalStyles";
import { styles } from "./styles/components";

export default function App() {
  const activeView = usePacketStore((s) => s.activeView);
  const showSettings = usePacketStore((s) => s.showSettings);
  const visualEffects = usePacketStore((s) => s.visualEffects);

  // Initialize hooks
  useDemoCapture();
  useTauriCapture();
  usePluginEvents();

  return (
    <div style={styles.container}>
      <style>{globalStyles(visualEffects)}</style>

      {/* Static noise texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: noiseBackground,
          backgroundRepeat: "repeat",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Visual effects overlays */}
      {visualEffects.grid && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `linear-gradient(rgba(0,255,159,${visualEffects.gridOpacity}) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,159,${visualEffects.gridOpacity}) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
      )}
      {visualEffects.scanline && (
        <div
          style={{
            ...styles.scanline,
            animationDuration: `${visualEffects.scanlineSpeed}s`,
          }}
        />
      )}
      {visualEffects.crt && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `repeating-linear-gradient(0deg, rgba(0,0,0,${visualEffects.crtIntensity}) 0px, rgba(0,0,0,${visualEffects.crtIntensity}) 1px, transparent 1px, transparent 2px)`,
            pointerEvents: "none",
            zIndex: 1,
            animation: "flicker 0.15s infinite",
          }}
        />
      )}

      <Header />

      {showSettings && <SettingsPanel />}

      <NavTabs />

      <div style={{ ...styles.mainContent, flexDirection: "row" }}>
        <PacketSidebar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
        {activeView === "dashboard" && <Dashboard />}
        {activeView === "packets" && <PacketListView />}
        {activeView === "structure" && <PacketStructure />}
        {activeView === "routetrace" && <RouteTrace />}
        {activeView === "matrix" && <ConversationMatrix />}
        {activeView === "sankey" && <SankeyDiagram />}
        {activeView === "sequence" && <SequenceTimeline />}
        {activeView === "topology" && <HierarchicalTopology />}
        {activeView === "services" && <ServiceMap />}
        {activeView === "plugins" && <PluginsView />}
        {activeView === "livewire" && <Livewire />}
        </div>
      </div>

      <StatusBar />
    </div>
  );
}
