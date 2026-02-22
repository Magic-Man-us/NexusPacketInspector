export const PROTOCOLS = ["TCP", "UDP", "HTTP", "HTTPS", "DNS", "ICMP", "ARP", "SSH", "FTP", "SMTP", "DHCP", "NTP", "SNMP", "TELNET", "RDP", "MQTT", "MySQL", "PGSQL", "LDAP", "SIP"] as const;

export const PROTOCOL_COLORS: Record<string, string> = {
  TCP: "#00ff9f",
  UDP: "#00b8ff",
  HTTP: "#ff6b00",
  HTTPS: "#ffd600",
  DNS: "#ff00ff",
  ICMP: "#00ffff",
  ARP: "#ff3366",
  SSH: "#9d00ff",
  FTP: "#00ff66",
  SMTP: "#ff9500",
  DHCP: "#a0ff00",
  NTP: "#ff66cc",
  SNMP: "#66ffcc",
  TELNET: "#cc6600",
  RDP: "#6699ff",
  MQTT: "#ff99ff",
  MySQL: "#ffcc33",
  PGSQL: "#3399ff",
  LDAP: "#cc99ff",
  SIP: "#ff6666",
};

export const STREAM_COLORS = [
  "#00ff9f", "#00b8ff", "#ff6b00", "#ffd600", "#ff00ff",
  "#00ffff", "#ff3366", "#9d00ff", "#00ff66", "#ff9500",
  "#7fff00", "#dc143c", "#00ced1", "#ff1493", "#32cd32",
];

export const LAYER_COLORS = {
  ethernet: { bg: "rgba(255, 51, 102, 0.15)", border: "#ff3366", text: "#ff3366" },
  ip: { bg: "rgba(0, 184, 255, 0.15)", border: "#00b8ff", text: "#00b8ff" },
  tcp: { bg: "rgba(0, 255, 159, 0.15)", border: "#00ff9f", text: "#00ff9f" },
  udp: { bg: "rgba(255, 214, 0, 0.15)", border: "#ffd600", text: "#ffd600" },
  payload: { bg: "rgba(157, 0, 255, 0.15)", border: "#9d00ff", text: "#9d00ff" },
};
