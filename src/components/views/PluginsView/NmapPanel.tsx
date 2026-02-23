import { useState, useEffect, useCallback } from "react";
import { usePluginStore } from "../../../hooks/usePluginStore";
import { getPluginParams, runPlugin, cancelPlugin } from "../../../lib/tauri-bridge";
import { NmapScanResult, ScanProfile, NmapHost } from "../../../types/plugin";
import { ScanProgress } from "./ScanProgress";

export function NmapPanel() {
  const runningPlugin = usePluginStore((s) => s.runningPlugin);
  const setRunningPlugin = usePluginStore((s) => s.setRunningPlugin);
  const clearProgress = usePluginStore((s) => s.clearProgress);
  const result = usePluginStore((s) => s.results["nmap"]);
  const plugins = usePluginStore((s) => s.plugins);

  const nmapInfo = plugins.find((p) => p.name === "nmap");
  const isRunning = runningPlugin === "nmap";

  const [target, setTarget] = useState("127.0.0.1");
  const [profileId, setProfileId] = useState("quick");
  const [customFlags, setCustomFlags] = useState("");
  const [profiles, setProfiles] = useState<ScanProfile[]>([]);

  useEffect(() => {
    getPluginParams("nmap")
      .then((params: any) => {
        if (params?.profiles) setProfiles(params.profiles);
      })
      .catch(() => {});
  }, []);

  const handleScan = useCallback(async () => {
    if (!target.trim()) return;
    clearProgress();
    setRunningPlugin("nmap");
    try {
      await runPlugin("nmap", { target, profile: profileId, customFlags });
    } catch (err) {
      console.error("Scan failed:", err);
    }
    setRunningPlugin(null);
  }, [target, profileId, customFlags, clearProgress, setRunningPlugin]);

  const handleCancel = useCallback(async () => {
    try {
      await cancelPlugin("nmap");
    } catch {}
    setRunningPlugin(null);
  }, [setRunningPlugin]);

  const scanData = result?.data as NmapScanResult | undefined;

  if (!nmapInfo?.available) {
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
        <div style={{ fontSize: "32px", color: "var(--text-faint)" }}>&#9888;</div>
        <div style={{ fontFamily: "'Orbitron'", fontSize: "12px", color: "var(--text-secondary)" }}>
          NMAP NOT INSTALLED
        </div>
        <div style={{ fontSize: "10px", color: "var(--text-faint)", maxWidth: "280px", textAlign: "center", lineHeight: "1.5" }}>
          Install nmap to enable network scanning capabilities.
          Visit nmap.org for installation instructions.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          fontFamily: "'Orbitron'",
          fontSize: "11px",
          color: "var(--accent)",
          letterSpacing: "1px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        NMAP SCANNER
        {isRunning && (
          <span style={{ fontSize: "8px", color: "#00ffff", animation: "nmapPulse 1.5s ease-in-out infinite" }}>
            RUNNING
          </span>
        )}
      </div>

      {/* Controls */}
      <div
        style={{
          padding: "14px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                fontSize: "9px",
                color: "var(--text-muted)",
                marginBottom: "4px",
                fontFamily: "'Orbitron'",
                letterSpacing: "0.5px",
              }}
            >
              TARGET
            </label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="IP, hostname, or CIDR"
              disabled={isRunning}
              style={{
                width: "100%",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-strong)",
                borderRadius: "4px",
                padding: "8px",
                color: "var(--accent)",
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: "12px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "9px",
                color: "var(--text-muted)",
                marginBottom: "4px",
                fontFamily: "'Orbitron'",
                letterSpacing: "0.5px",
              }}
            >
              PROFILE
            </label>
            <select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              disabled={isRunning}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-strong)",
                borderRadius: "4px",
                padding: "8px",
                color: "var(--accent)",
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: "11px",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id} style={{ background: "var(--bg-primary)" }}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          {isRunning ? (
            <button
              onClick={handleCancel}
              style={{
                padding: "8px 18px",
                border: "none",
                borderRadius: "4px",
                background: "#ff3366",
                color: "#fff",
                fontFamily: "'Orbitron'",
                fontSize: "10px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              CANCEL
            </button>
          ) : (
            <button
              onClick={handleScan}
              style={{
                padding: "8px 18px",
                border: "none",
                borderRadius: "4px",
                background: "var(--accent)",
                color: "var(--bg-primary)",
                fontFamily: "'Orbitron'",
                fontSize: "10px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              SCAN
            </button>
          )}
        </div>
        {profileId === "custom" && (
          <div style={{ marginTop: "8px" }}>
            <input
              type="text"
              value={customFlags}
              onChange={(e) => setCustomFlags(e.target.value)}
              placeholder="Custom nmap flags (e.g. -sV -p 1-1000)"
              disabled={isRunning}
              style={{
                width: "100%",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-strong)",
                borderRadius: "4px",
                padding: "8px",
                color: "var(--accent)",
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: "11px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        )}
        {isRunning && <ScanProgress />}
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflow: "auto", padding: "14px" }}>
        {result && scanData ? (
          <>
            <div
              style={{
                marginBottom: "12px",
                padding: "10px 14px",
                backgroundColor: "var(--bg-surface)",
                borderRadius: "4px",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  fontFamily: "'Orbitron'",
                  fontSize: "10px",
                  color: "var(--accent)",
                  marginBottom: "6px",
                  letterSpacing: "0.5px",
                }}
              >
                SCAN SUMMARY
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-primary)" }}>
                {result.summary}
              </div>
              {scanData.scanInfo.args && (
                <div
                  style={{
                    fontSize: "9px",
                    color: "var(--text-muted)",
                    marginTop: "4px",
                    fontFamily: "'Share Tech Mono', monospace",
                  }}
                >
                  {scanData.scanInfo.args}
                </div>
              )}
            </div>

            {scanData.hosts
              .filter((h) => h.status === "up")
              .map((host, i) => (
                <HostCard key={i} host={host} />
              ))}

            {scanData.hosts.filter((h) => h.status === "up").length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--text-faint)",
                  padding: "20px",
                  fontSize: "11px",
                }}
              >
                No hosts found up
              </div>
            )}
          </>
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
            <div style={{ fontSize: "32px" }}>&#9906;</div>
            <div style={{ fontSize: "11px" }}>
              Enter a target and click SCAN to begin
            </div>
          </div>
        ) : null}
      </div>

      <style>{`
        @keyframes nmapPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

function HostCard({ host }: { host: NmapHost }) {
  const openPorts = host.ports.filter((p) => p.state === "open");

  return (
    <div
      style={{
        marginBottom: "12px",
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <span
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "13px",
              color: "var(--accent)",
            }}
          >
            {host.address}
          </span>
          {host.hostname && (
            <span style={{ fontSize: "10px", color: "var(--text-secondary)", marginLeft: "10px" }}>
              ({host.hostname})
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {host.osMatches.length > 0 && (
            <span style={{ fontSize: "9px", color: "#00b8ff" }}>
              {host.osMatches[0].name}
            </span>
          )}
          <span
            style={{
              fontSize: "9px",
              padding: "2px 8px",
              borderRadius: "3px",
              backgroundColor: "rgba(var(--accent-rgb),0.15)",
              color: "var(--accent)",
            }}
          >
            {openPorts.length} open
          </span>
        </div>
      </div>

      {openPorts.length > 0 && (
        <div>
          <div
            style={{
              display: "flex",
              padding: "6px 14px",
              fontSize: "8px",
              color: "var(--text-muted)",
              fontFamily: "'Orbitron'",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              letterSpacing: "0.5px",
            }}
          >
            <span style={{ width: "70px" }}>PORT</span>
            <span style={{ width: "50px" }}>STATE</span>
            <span style={{ width: "100px" }}>SERVICE</span>
            <span style={{ flex: 1 }}>VERSION</span>
          </div>
          {openPorts.map((port, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                padding: "6px 14px",
                fontSize: "10px",
                borderBottom: "1px solid rgba(255,255,255,0.02)",
                backgroundColor: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
              }}
            >
              <span
                style={{
                  width: "70px",
                  fontFamily: "'Share Tech Mono', monospace",
                  color: "var(--text-primary)",
                }}
              >
                {port.portId}/{port.protocol}
              </span>
              <span style={{ width: "50px", color: port.state === "open" ? "#00ff9f" : "#ff3366" }}>
                {port.state}
              </span>
              <span style={{ width: "100px", color: "#00b8ff" }}>
                {port.serviceName || "-"}
              </span>
              <span style={{ flex: 1, color: "var(--text-secondary)" }}>
                {[port.serviceProduct, port.serviceVersion].filter(Boolean).join(" ") || "-"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
