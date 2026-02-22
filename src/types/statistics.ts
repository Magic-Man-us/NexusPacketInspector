export interface PacketStatistics {
  total: number;
  protocols: Record<string, number>;
  ips: Record<string, number>;
  ports: Record<string, number>;

  // Incremental counters
  srcIps: Record<string, number>;
  dstIps: Record<string, number>;
  tcpCount: number;
  udpCount: number;
  tcpBytes: number;
  udpBytes: number;
  totalBytes: number;
  minSize: number;
  maxSize: number;

  // TCP flags
  synCount: number;
  finCount: number;
  rstCount: number;
  ackCount: number;
  pshCount: number;
  retransmissions: number;
  seenSeqCount: number;

  // Distributions
  ttlBuckets: Record<string, number>;
  conversations: Record<string, { packets: number; bytes: number }>;

  // Timing
  firstTimestamp: number;
  lastTimestamp: number;
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
