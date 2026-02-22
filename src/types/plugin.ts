export type PluginCapability =
  | "hostDiscovery"
  | "portScan"
  | "serviceDetection"
  | "vulnScan"
  | "osDetection";

export type PluginStatus = "running" | "completed" | "failed" | "cancelled";

export interface PluginInfo {
  name: string;
  description: string;
  capabilities: PluginCapability[];
  available: boolean;
}

export interface PluginResult {
  pluginName: string;
  startedAt: string;
  completedAt: string;
  status: PluginStatus;
  summary: string;
  data: unknown;
  enrichments: PacketEnrichment[];
}

export interface PacketEnrichment {
  ip: string;
  hostname: string | null;
  openPorts: number[];
  osGuess: string | null;
  services: Record<number, string>;
}

export interface PluginProgress {
  plugin: string;
  line: string;
  percent: number | null;
}

// NMAP-specific types
export interface NmapScanResult {
  hosts: NmapHost[];
  scanInfo: NmapScanInfo;
}

export interface NmapScanInfo {
  scanner: string;
  args: string;
  startTime: string;
  endTime: string;
  elapsed: string;
  summary: string;
}

export interface NmapHost {
  address: string;
  hostname: string | null;
  status: string;
  ports: NmapPort[];
  osMatches: NmapOsMatch[];
}

export interface NmapPort {
  portId: number;
  protocol: string;
  state: string;
  serviceName: string | null;
  serviceVersion: string | null;
  serviceProduct: string | null;
}

export interface NmapOsMatch {
  name: string;
  accuracy: string;
}

export interface ScanProfile {
  id: string;
  name: string;
  description: string;
  flags: string[];
}

export interface NmapParams {
  target: string;
  profile: string;
  customFlags: string;
  profiles: ScanProfile[];
}
