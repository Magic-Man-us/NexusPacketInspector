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
  }, [target, profileId, customFlags]);

  const handleCancel = useCallback(async () => {
    try {
      await cancelPlugin("nmap");
    } catch {}
    setRunningPlugin(null);
  }, []);

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
        <div style={{ fontSize: "36px", color: "var(--text-faint)" }}>!</div>
        <div style={{ fontSize: "13px" }}>NMAP is not installed</div>
        <div style={{ fontSize: "10px", color: "var(--text-faint)" }}>
          Install nmap to enable network scanning
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
      {/* Controls */}
      <div
        style={{
          padding: "14px",
          borderBottom: "1px solid rgba(0,255,159,0.1)",
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
                background: "rgba(0,255,159,0.05)",
                border: "1px solid rgba(0,255,159,0.3)",
                borderRadius: "4px",
                padding: "8px",
                color: "#00ff9f",
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
              }}
            >
              PROFILE
            </label>
            <select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              disabled={isRunning}
              style={{
                background: "rgba(0,255,159,0.05)",
                border: "1px solid rgba(0,255,159,0.3)",
                borderRadius: "4px",
                padding: "8px",
                color: "#00ff9f",
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: "11px",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id} style={{ background: "#0a0f0a" }}>
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
                background: "#00ff9f",
                color: "#0a0f0a",
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
                background: "rgba(0,255,159,0.05)",
                border: "1px solid rgba(0,255,159,0.3)",
                borderRadius: "4px",
                padding: "8px",
                color: "#00ff9f",
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
                padding: "10px",
                backgroundColor: "rgba(0,255,159,0.03)",
                borderRadius: "4px",
                border: "1px solid rgba(0,255,159,0.1)",
              }}
            >
              <div
                style={{
                  fontFamily: "'Orbitron'",
                  fontSize: "10px",
                  color: "#00ff9f",
                  marginBottom: "6px",
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

            {/* Hosts table */}
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
            <div style={{ fontSize: "36px", color: "var(--text-faint)" }}>&#9906;</div>
            <div style={{ fontSize: "11px" }}>
              Enter a target and click SCAN to begin
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function HostCard({ host }: { host: NmapHost }) {
  const openPorts = host.ports.filter((p) => p.state === "open");

  return (
    <div
      style={{
        marginBottom: "12px",
        backgroundColor: "rgba(0,255,159,0.03)",
        border: "1px solid rgba(0,255,159,0.1)",
        borderRadius: "6px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid rgba(0,255,159,0.1)",
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
              color: "#00ff9f",
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
              backgroundColor: "rgba(0,255,159,0.15)",
              color: "#00ff9f",
            }}
          >
            {openPorts.length} open
          </span>
        </div>
      </div>

      {openPorts.length > 0 && (
        <div style={{ padding: "0" }}>
          <div
            style={{
              display: "flex",
              padding: "6px 14px",
              fontSize: "8px",
              color: "var(--text-muted)",
              fontFamily: "'Orbitron'",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
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
                borderBottom: "1px solid rgba(255,255,255,0.03)",
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
              <span
                style={{
                  width: "50px",
                  color: port.state === "open" ? "#00ff9f" : "#ff3366",
                }}
              >
                {port.state}
              </span>
              <span style={{ width: "100px", color: "#00b8ff" }}>
                {port.serviceName || "-"}
              </span>
              <span style={{ flex: 1, color: "var(--text-secondary)" }}>
                {[port.serviceProduct, port.serviceVersion]
                  .filter(Boolean)
                  .join(" ") || "-"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
