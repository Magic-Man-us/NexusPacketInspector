export interface PacketStatistics {
  total: number;
  protocols: Record<string, number>;
  ips: Record<string, number>;
  ports: Record<string, number>;
}

export interface DashboardStats {
  packetSizes: number[];
  timestamps: number[];
  anomalies: {
    rstCount: number;
    oversizedCount: number;
    unusualPortCount: number;
  };
  bytesPerProtocol: Record<string, number>;
}
