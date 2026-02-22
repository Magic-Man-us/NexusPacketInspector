import { TcpFlags } from "../types/packet";

export function formatTCPFlags(flags: TcpFlags | undefined): string {
  if (!flags) return "";
  const f: string[] = [];
  if (flags.syn) f.push("SYN");
  if (flags.ack) f.push("ACK");
  if (flags.fin) f.push("FIN");
  if (flags.rst) f.push("RST");
  if (flags.psh) f.push("PSH");
  return f.join(",") || "-";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const COMMON_PORTS = new Set([
  20, 21, 22, 23, 25, 53, 67, 68, 80, 110, 123, 143, 161, 162,
  389, 443, 465, 587, 993, 995, 1883, 3306, 3389, 5060, 5432,
  5900, 8080, 8443,
]);

export function isUnusualPort(port: number): boolean {
  return port > 0 && port < 49152 && !COMMON_PORTS.has(port);
}

export const PORT_SERVICE_NAMES: Record<number, string> = {
  20: "FTP-Data", 21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP",
  53: "DNS", 67: "DHCP", 68: "DHCP", 80: "HTTP", 110: "POP3",
  123: "NTP", 143: "IMAP", 161: "SNMP", 162: "SNMP-Trap",
  389: "LDAP", 443: "HTTPS", 465: "SMTPS", 587: "Submission",
  993: "IMAPS", 995: "POP3S", 1883: "MQTT", 3306: "MySQL",
  3389: "RDP", 5060: "SIP", 5432: "PostgreSQL", 5900: "VNC",
  8080: "HTTP-Alt", 8443: "HTTPS-Alt",
};
