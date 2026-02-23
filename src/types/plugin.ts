export type PluginCategory =
  | "networkScanning"
  | "packetAnalysis"
  | "trafficMonitoring"
  | "intrusionDetection";

export type PluginCapability =
  | "hostDiscovery"
  | "portScan"
  | "serviceDetection"
  | "vulnScan"
  | "osDetection"
  | "packetAnalysis"
  | "displayFilter"
  | "protocolStats"
  | "expertInfo"
  | "conversationStats"
  | "streamFollow";

export type PluginStatus = "running" | "completed" | "failed" | "cancelled";

export interface PluginInfo {
  name: string;
  description: string;
  category: PluginCategory;
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

// TSHARK-specific types
export type TsharkAnalysisMode =
  | "deepAnalysis"
  | "displayFilter"
  | "protocolHierarchy"
  | "expertInfo"
  | "conversations"
  | "followStream";

export interface TsharkResult {
  mode: TsharkAnalysisMode;
  data: TsharkData;
  packetCount: number;
  pcapPath: string;
}

export type TsharkData =
  | { json: unknown }
  | { protocolHierarchy: ProtocolNode[] }
  | { expertInfo: ExpertEntry[] }
  | { conversations: ConversationEntry[] }
  | { stream: StreamData };

export interface ProtocolNode {
  protocol: string;
  frames: number;
  bytes: number;
  percentFrames: number;
  depth: number;
}

export interface ExpertEntry {
  severity: string;
  group: string;
  protocol: string;
  summary: string;
  count: number;
}

export interface ConversationEntry {
  addressA: string;
  addressB: string;
  framesAToB: number;
  bytesAToB: number;
  framesBToA: number;
  bytesBToA: number;
  totalFrames: number;
  totalBytes: number;
  relStart: number;
  duration: number;
}

export interface StreamData {
  streamIndex: number;
  protocol: string;
  segments: StreamSegment[];
}

export interface StreamSegment {
  fromServer: boolean;
  data: string;
}

export interface TsharkModeInfo {
  id: TsharkAnalysisMode;
  label: string;
  description: string;
}
