import { useState, useCallback } from "react";
import { FONT } from "../../../styles/typography";
import { usePluginStore } from "../../../hooks/usePluginStore";
import { usePacketStore } from "../../../hooks/usePacketStore";
import { runPlugin, cancelPlugin } from "../../../lib/tauri-bridge";
import {
  TsharkAnalysisMode,
  TsharkResult,
  TsharkModeInfo,
} from "../../../types/plugin";
import { ScanProgress } from "./ScanProgress";
import { ProtocolHierarchyView } from "./tshark/ProtocolHierarchyView";
import { ExpertInfoView } from "./tshark/ExpertInfoView";
import { ConversationsView } from "./tshark/ConversationsView";
import { StreamFollowView } from "./tshark/StreamFollowView";
import { PacketJsonView } from "./tshark/PacketJsonView";

const MODES: TsharkModeInfo[] = [
  { id: "protocolHierarchy", label: "PROTOCOLS", description: "Protocol hierarchy statistics" },
  { id: "expertInfo", label: "EXPERT", description: "Expert information analysis" },
  { id: "conversations", label: "CONVERSATIONS", description: "Network conversations" },
  { id: "followStream", label: "STREAM", description: "Follow TCP/UDP stream" },
  { id: "displayFilter", label: "FILTER", description: "Apply display filter" },
  { id: "deepAnalysis", label: "JSON", description: "Deep packet JSON analysis" },
];

export function TsharkPanel() {
  const runningPlugin = usePluginStore((s) => s.runningPlugin);
  const setRunningPlugin = usePluginStore((s) => s.setRunningPlugin);
  const clearProgress = usePluginStore((s) => s.clearProgress);
  const setResult = usePluginStore((s) => s.setResult);
  const result = usePluginStore((s) => s.results["tshark"]);
  const plugins = usePluginStore((s) => s.plugins);
  const pcapFilePath = usePacketStore((s) => s.pcapFilePath);

  const tsharkInfo = plugins.find((p) => p.name === "tshark");
  const isRunning = runningPlugin === "tshark";

  const [activeMode, setActiveMode] = useState<TsharkAnalysisMode>("protocolHierarchy");
  const [displayFilter, setDisplayFilter] = useState("tcp");
  const [convType, setConvType] = useState("ip");
  const [streamProto, setStreamProto] = useState("tcp");
  const [streamIndex, setStreamIndex] = useState(0);
  const [limit, setLimit] = useState(1000);

  const handleRun = useCallback(async () => {
    if (!pcapFilePath) return;
    clearProgress();
    setRunningPlugin("tshark");
    try {
      const pluginResult = await runPlugin("tshark", {
        pcapPath: pcapFilePath,
        mode: activeMode,
        displayFilter,
        conversationType: convType,
        streamProtocol: streamProto,
        streamIndex,
        limit,
      });
      setResult("tshark", pluginResult);
    } catch (err) {
      console.error("tshark analysis failed:", err);
    } finally {
      setRunningPlugin(null);
    }
  }, [pcapFilePath, activeMode, displayFilter, convType, streamProto, streamIndex, limit, clearProgress, setRunningPlugin, setResult]);

  const handleCancel = useCallback(async () => {
    try {
      await cancelPlugin("tshark");
    } catch {}
    setRunningPlugin(null);
  }, [setRunningPlugin]);

  if (!tsharkInfo?.available) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          gap: "12px",
        }}
      >
        <div style={{ fontSize: FONT.size["4xl"], color: "var(--text-faint)" }}>&#9888;</div>
        <div style={{ fontFamily: FONT.family.display, fontSize: FONT.size.lg, color: "var(--text-secondary)" }}>
          TSHARK NOT INSTALLED
        </div>
        <div style={{ fontSize: FONT.size.md, color: "var(--text-faint)", maxWidth: "280px", textAlign: "center", lineHeight: "1.5" }}>
          Install Wireshark/tshark to enable deep PCAP analysis.
          Visit wireshark.org for installation instructions.
        </div>
      </div>
    );
  }

  const tsharkResult = result?.data as TsharkResult | undefined;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Title bar */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          fontFamily: FONT.family.display,
          fontSize: FONT.size.base,
          color: "var(--accent)",
          letterSpacing: FONT.spacing.wide,
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        TSHARK ANALYZER
        {!pcapFilePath && (
          <span style={{ fontSize: FONT.size.sm, color: "var(--text-muted)", fontFamily: FONT.family.mono }}>
            - Load a PCAP first
          </span>
        )}
        {isRunning && (
          <span style={{ fontSize: FONT.size.xs, color: "#00ffff", animation: "tsharkPulse 1.5s ease-in-out infinite" }}>
            RUNNING
          </span>
        )}
      </div>

      {/* Mode tabs */}
      <div
        style={{
          padding: "8px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          gap: "4px",
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        {MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setActiveMode(mode.id)}
            title={mode.description}
            style={{
              padding: "5px 12px",
              border: activeMode === mode.id ? "1px solid var(--accent)" : "1px solid var(--border)",
              borderRadius: "3px",
              background: activeMode === mode.id ? "rgba(var(--accent-rgb),0.12)" : "transparent",
              color: activeMode === mode.id ? "var(--accent)" : "var(--text-muted)",
              fontFamily: FONT.family.display,
              fontSize: FONT.size.xs,
              letterSpacing: FONT.spacing.normal,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* Mode-specific controls */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          gap: "10px",
          alignItems: "flex-end",
          flexShrink: 0,
        }}
      >
        {(activeMode === "displayFilter" || activeMode === "deepAnalysis") && (
          <>
            {activeMode === "displayFilter" && (
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>DISPLAY FILTER</label>
                <input
                  type="text"
                  value={displayFilter}
                  onChange={(e) => setDisplayFilter(e.target.value)}
                  placeholder="e.g. tcp.port == 80"
                  disabled={isRunning}
                  style={inputStyle}
                />
              </div>
            )}
            <div>
              <label style={labelStyle}>LIMIT</label>
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value) || 1000)}
                disabled={isRunning}
                style={{ ...inputStyle, width: "80px" }}
              />
            </div>
          </>
        )}

        {activeMode === "conversations" && (
          <div>
            <label style={labelStyle}>TYPE</label>
            <select
              value={convType}
              onChange={(e) => setConvType(e.target.value)}
              disabled={isRunning}
              style={selectStyle}
            >
              <option value="ip" style={{ background: "var(--bg-primary)" }}>IP</option>
              <option value="tcp" style={{ background: "var(--bg-primary)" }}>TCP</option>
              <option value="udp" style={{ background: "var(--bg-primary)" }}>UDP</option>
              <option value="eth" style={{ background: "var(--bg-primary)" }}>Ethernet</option>
            </select>
          </div>
        )}

        {activeMode === "followStream" && (
          <>
            <div>
              <label style={labelStyle}>PROTOCOL</label>
              <select
                value={streamProto}
                onChange={(e) => setStreamProto(e.target.value)}
                disabled={isRunning}
                style={selectStyle}
              >
                <option value="tcp" style={{ background: "var(--bg-primary)" }}>TCP</option>
                <option value="udp" style={{ background: "var(--bg-primary)" }}>UDP</option>
                <option value="http" style={{ background: "var(--bg-primary)" }}>HTTP</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>STREAM INDEX</label>
              <input
                type="number"
                value={streamIndex}
                onChange={(e) => setStreamIndex(Number(e.target.value) || 0)}
                min={0}
                disabled={isRunning}
                style={{ ...inputStyle, width: "80px" }}
              />
            </div>
          </>
        )}

        <div style={{ marginLeft: "auto" }}>
          {isRunning ? (
            <button onClick={handleCancel} style={cancelBtnStyle}>
              CANCEL
            </button>
          ) : (
            <button
              onClick={handleRun}
              disabled={!pcapFilePath}
              style={{
                ...runBtnStyle,
                opacity: pcapFilePath ? 1 : 0.4,
                cursor: pcapFilePath ? "pointer" : "not-allowed",
              }}
            >
              ANALYZE
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      {isRunning && (
        <div style={{ padding: "0 14px", flexShrink: 0 }}>
          <ScanProgress />
        </div>
      )}

      {/* Results */}
      <div style={{ flex: 1, overflow: "auto", padding: "14px" }}>
        {tsharkResult ? (
          <ResultRouter result={tsharkResult} />
        ) : !isRunning ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--text-faint)",
              gap: "8px",
            }}
          >
            <div style={{ fontSize: FONT.size["4xl"] }}>&#9906;</div>
            <div style={{ fontSize: FONT.size.base }}>
              {pcapFilePath
                ? "Select a mode and click ANALYZE"
                : "Load a PCAP file first, then select an analysis mode"}
            </div>
          </div>
        ) : null}
      </div>

      <style>{`
        @keyframes tsharkPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

function ResultRouter({ result }: { result: TsharkResult }) {
  const data = result.data;

  if ("protocolHierarchy" in data) {
    return <ProtocolHierarchyView nodes={data.protocolHierarchy} />;
  }
  if ("expertInfo" in data) {
    return <ExpertInfoView entries={data.expertInfo} />;
  }
  if ("conversations" in data) {
    return <ConversationsView entries={data.conversations} />;
  }
  if ("stream" in data) {
    return <StreamFollowView stream={data.stream} />;
  }
  if ("json" in data) {
    return <PacketJsonView data={data.json} />;
  }

  return (
    <div style={{ color: "var(--text-faint)", fontSize: FONT.size.base }}>
      No result data to display
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: FONT.size.sm,
  color: "var(--text-muted)",
  marginBottom: "4px",
  fontFamily: FONT.family.display,
  letterSpacing: FONT.spacing.normal,
};

const inputStyle: React.CSSProperties = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border-strong)",
  borderRadius: "4px",
  padding: "7px 8px",
  color: "var(--accent)",
  fontFamily: FONT.family.mono,
  fontSize: FONT.size.base,
  outline: "none",
  boxSizing: "border-box",
  width: "100%",
};

const selectStyle: React.CSSProperties = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border-strong)",
  borderRadius: "4px",
  padding: "7px 8px",
  color: "var(--accent)",
  fontFamily: FONT.family.mono,
  fontSize: FONT.size.base,
  outline: "none",
  cursor: "pointer",
};

const runBtnStyle: React.CSSProperties = {
  padding: "7px 18px",
  border: "none",
  borderRadius: "4px",
  background: "var(--accent)",
  color: "var(--bg-primary)",
  fontFamily: FONT.family.display,
  fontSize: FONT.size.md,
  fontWeight: FONT.weight.bold,
  cursor: "pointer",
};

const cancelBtnStyle: React.CSSProperties = {
  padding: "7px 18px",
  border: "none",
  borderRadius: "4px",
  background: "#ff3366",
  color: "#fff",
  fontFamily: FONT.family.display,
  fontSize: FONT.size.md,
  fontWeight: FONT.weight.bold,
  cursor: "pointer",
};
