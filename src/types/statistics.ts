export interface PacketStatistics {
  total: number;
  protocols: Record<string, number>;
  ips: Record<string, number>;
  ports: Record<string, number>;
}
