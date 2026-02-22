// Protocol conversation templates for demo mode
// Each template is an array of messages exchanged between client and server

export interface ConversationMessage {
  direction: "client" | "server";
  content: string;
}

export type ProtocolTemplate = ConversationMessage[];

// ─── HTTP Templates ──────────────────────────────────────────────

const httpGet: ProtocolTemplate = [
  {
    direction: "client",
    content:
      "GET /index.html HTTP/1.1\r\nHost: www.example.com\r\nUser-Agent: Mozilla/5.0 (X11; Linux x86_64)\r\nAccept: text/html,application/xhtml+xml\r\nAccept-Language: en-US,en;q=0.9\r\nConnection: keep-alive\r\n\r\n",
  },
  {
    direction: "server",
    content:
      'HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Length: 274\r\nServer: Apache/2.4.52\r\nDate: Wed, 18 Feb 2026 14:30:00 GMT\r\nConnection: keep-alive\r\n\r\n<!DOCTYPE html>\n<html>\n<head><title>Welcome</title></head>\n<body>\n<h1>Welcome to Example Corp</h1>\n<p>This is the main landing page for our network monitoring demo.</p>\n<ul>\n  <li><a href="/about">About Us</a></li>\n  <li><a href="/status">System Status</a></li>\n</ul>\n</body>\n</html>\n',
  },
];

const httpPost: ProtocolTemplate = [
  {
    direction: "client",
    content:
      'POST /api/v1/auth/login HTTP/1.1\r\nHost: api.example.com\r\nContent-Type: application/json\r\nContent-Length: 52\r\nUser-Agent: NexusClient/2.1\r\nAccept: application/json\r\n\r\n{"username":"admin","password":"hunter2","mfa":true}',
  },
  {
    direction: "server",
    content:
      'HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 148\r\nX-Request-Id: a3f8c912-4e7b\r\nSet-Cookie: session=eyJhbGciOiJIUzI1NiJ9; Path=/; HttpOnly\r\n\r\n{"status":"ok","token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9","user":{"id":1,"name":"admin","role":"superuser"},"expires_in":3600}',
  },
];

// ─── FTP Template ────────────────────────────────────────────────

const ftp: ProtocolTemplate = [
  { direction: "server", content: "220 FTP Server Ready\r\n" },
  { direction: "client", content: "USER admin\r\n" },
  { direction: "server", content: "331 Password required for admin\r\n" },
  { direction: "client", content: "PASS s3cur3p@ss\r\n" },
  { direction: "server", content: "230 User admin logged in\r\n" },
  { direction: "client", content: "PWD\r\n" },
  { direction: "server", content: '257 "/" is current directory\r\n' },
  { direction: "client", content: "LIST\r\n" },
  {
    direction: "server",
    content:
      "150 Opening ASCII mode data connection\r\n-rw-r--r--  1 admin staff  4096 Feb 10 09:22 config.yaml\r\n-rw-r--r--  1 admin staff 12800 Feb 15 14:05 database.sql\r\ndrwxr-xr-x  3 admin staff  4096 Jan 28 11:30 backups/\r\n-rwx------  1 admin staff  8192 Feb 18 08:00 deploy.sh\r\n226 Transfer complete\r\n",
  },
  { direction: "client", content: "RETR config.yaml\r\n" },
  {
    direction: "server",
    content:
      "150 Opening BINARY mode data connection\r\nserver:\n  host: 0.0.0.0\n  port: 8443\n  workers: 4\n\ndatabase:\n  driver: postgres\n  host: db.internal\n  name: nexus_prod\n\nlogging:\n  level: info\n  output: /var/log/nexus.log\r\n226 Transfer complete\r\n",
  },
  { direction: "client", content: "QUIT\r\n" },
  { direction: "server", content: "221 Goodbye\r\n" },
];

// ─── SMTP Template ───────────────────────────────────────────────

const smtp: ProtocolTemplate = [
  { direction: "server", content: "220 mail.example.com ESMTP Postfix\r\n" },
  { direction: "client", content: "EHLO client.example.com\r\n" },
  {
    direction: "server",
    content:
      "250-mail.example.com\r\n250-SIZE 52428800\r\n250-8BITMIME\r\n250-STARTTLS\r\n250-AUTH PLAIN LOGIN\r\n250 OK\r\n",
  },
  {
    direction: "client",
    content: "MAIL FROM:<alice@example.com>\r\n",
  },
  { direction: "server", content: "250 2.1.0 Ok\r\n" },
  { direction: "client", content: "RCPT TO:<bob@example.com>\r\n" },
  { direction: "server", content: "250 2.1.5 Ok\r\n" },
  { direction: "client", content: "DATA\r\n" },
  { direction: "server", content: "354 End data with <CR><LF>.<CR><LF>\r\n" },
  {
    direction: "client",
    content:
      "From: Alice <alice@example.com>\r\nTo: Bob <bob@example.com>\r\nSubject: Q1 Network Audit Report\r\nDate: Wed, 18 Feb 2026 10:00:00 -0500\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\nHi Bob,\r\n\r\nPlease find the Q1 network audit results below:\r\n\r\n- Total devices scanned: 1,247\r\n- Critical vulnerabilities: 3\r\n- High-risk ports open: 12\r\n- Recommended patches: 8\r\n\r\nLet me know if you have questions.\r\n\r\nBest regards,\r\nAlice\r\n.\r\n",
  },
  {
    direction: "server",
    content: "250 2.0.0 Ok: queued as ABC123DEF\r\n",
  },
  { direction: "client", content: "QUIT\r\n" },
  { direction: "server", content: "221 2.0.0 Bye\r\n" },
];

// ─── TELNET Template ─────────────────────────────────────────────

const telnet: ProtocolTemplate = [
  {
    direction: "server",
    content: "Linux nexus-gw01 5.15.0-91-generic\r\n\r\nnexus-gw01 login: ",
  },
  { direction: "client", content: "operator\r\n" },
  { direction: "server", content: "Password: " },
  { direction: "client", content: "n3xus0ps!\r\n" },
  {
    direction: "server",
    content:
      "Last login: Tue Feb 17 22:14:03 2026 from 10.0.1.5\r\noperator@nexus-gw01:~$ ",
  },
  { direction: "client", content: "whoami\r\n" },
  { direction: "server", content: "operator\r\noperator@nexus-gw01:~$ " },
  { direction: "client", content: "ls -la /var/log/\r\n" },
  {
    direction: "server",
    content:
      "total 14820\r\ndrwxr-xr-x  8 root   root    4096 Feb 18 00:00 .\r\ndrwxr-xr-x 14 root   root    4096 Jan 10 12:00 ..\r\n-rw-r-----  1 syslog adm   892431 Feb 18 14:28 syslog\r\n-rw-r-----  1 syslog adm   234112 Feb 18 14:28 auth.log\r\n-rw-r--r--  1 root   root   45230 Feb 17 23:59 dpkg.log\r\n-rw-r-----  1 syslog adm  1204800 Feb 18 14:25 kern.log\r\noperator@nexus-gw01:~$ ",
  },
  { direction: "client", content: "cat /etc/hostname\r\n" },
  {
    direction: "server",
    content: "nexus-gw01\r\noperator@nexus-gw01:~$ ",
  },
  { direction: "client", content: "uptime\r\n" },
  {
    direction: "server",
    content:
      " 14:30:12 up 42 days,  6:15,  2 users,  load average: 0.12, 0.08, 0.05\r\noperator@nexus-gw01:~$ ",
  },
  { direction: "client", content: "exit\r\n" },
  { direction: "server", content: "logout\r\n" },
];

// ─── MQTT Template ───────────────────────────────────────────────

const mqtt: ProtocolTemplate = [
  {
    direction: "client",
    content:
      "CONNECT clientId=sensor-hub-01 cleanSession=1 keepAlive=60\r\n",
  },
  { direction: "server", content: "CONNACK returnCode=0 sessionPresent=0\r\n" },
  {
    direction: "client",
    content: "SUBSCRIBE topic=factory/sensors/+/temperature qos=1\r\n",
  },
  {
    direction: "server",
    content: "SUBACK packetId=1 grantedQos=1\r\n",
  },
  {
    direction: "server",
    content:
      'PUBLISH topic=factory/sensors/A3/temperature qos=1 payload={"sensor":"A3","temp":72.4,"unit":"F","ts":1708272600}\r\n',
  },
  {
    direction: "server",
    content:
      'PUBLISH topic=factory/sensors/B7/temperature qos=1 payload={"sensor":"B7","temp":68.1,"unit":"F","ts":1708272601}\r\n',
  },
  {
    direction: "client",
    content:
      'PUBLISH topic=factory/commands/A3 qos=1 payload={"action":"calibrate","target":"A3"}\r\n',
  },
  { direction: "server", content: "PUBACK packetId=2\r\n" },
  {
    direction: "server",
    content:
      'PUBLISH topic=factory/sensors/A3/temperature qos=1 payload={"sensor":"A3","temp":71.9,"unit":"F","ts":1708272660}\r\n',
  },
  { direction: "client", content: "PINGREQ\r\n" },
  { direction: "server", content: "PINGRESP\r\n" },
  { direction: "client", content: "DISCONNECT\r\n" },
];

// ─── DNS Template ────────────────────────────────────────────────

const dns: ProtocolTemplate = [
  {
    direction: "client",
    content:
      "QUERY id=0x1A2B type=A class=IN name=www.example.com\r\n",
  },
  {
    direction: "server",
    content:
      "RESPONSE id=0x1A2B status=NOERROR answers=1\r\n  www.example.com. 300 IN A 93.184.216.34\r\n",
  },
  {
    direction: "client",
    content:
      "QUERY id=0x3C4D type=AAAA class=IN name=api.example.com\r\n",
  },
  {
    direction: "server",
    content:
      "RESPONSE id=0x3C4D status=NOERROR answers=1\r\n  api.example.com. 600 IN AAAA 2606:2800:220:1:248:1893:25c8:1946\r\n",
  },
  {
    direction: "client",
    content:
      "QUERY id=0x5E6F type=MX class=IN name=example.com\r\n",
  },
  {
    direction: "server",
    content:
      "RESPONSE id=0x5E6F status=NOERROR answers=2\r\n  example.com. 3600 IN MX 10 mail1.example.com.\r\n  example.com. 3600 IN MX 20 mail2.example.com.\r\n",
  },
];

// ─── MySQL Template ──────────────────────────────────────────────

const mysql: ProtocolTemplate = [
  {
    direction: "server",
    content:
      "Server version: 8.0.35-MySQL Community Server - GPL\r\nConnection id: 4217\r\nReady.\r\n",
  },
  { direction: "client", content: "USE nexus_prod;\r\n" },
  { direction: "server", content: "Database changed\r\n" },
  {
    direction: "client",
    content:
      "SELECT id, hostname, ip_addr, status, last_seen FROM devices WHERE status = 'active' LIMIT 5;\r\n",
  },
  {
    direction: "server",
    content:
      "+------+----------------+---------------+--------+---------------------+\r\n| id   | hostname       | ip_addr       | status | last_seen           |\r\n+------+----------------+---------------+--------+---------------------+\r\n| 1001 | web-frontend-1 | 10.0.2.10     | active | 2026-02-18 14:28:00 |\r\n| 1002 | api-server-3   | 10.0.2.15     | active | 2026-02-18 14:27:45 |\r\n| 1003 | db-primary     | 10.0.3.5      | active | 2026-02-18 14:28:01 |\r\n| 1004 | cache-redis-1  | 10.0.3.12     | active | 2026-02-18 14:27:58 |\r\n| 1005 | lb-haproxy-01  | 10.0.1.2      | active | 2026-02-18 14:28:02 |\r\n+------+----------------+---------------+--------+---------------------+\r\n5 rows in set (0.02 sec)\r\n",
  },
  {
    direction: "client",
    content:
      "SELECT COUNT(*) AS total_alerts FROM alerts WHERE severity = 'critical' AND acknowledged = 0;\r\n",
  },
  {
    direction: "server",
    content:
      "+--------------+\r\n| total_alerts |\r\n+--------------+\r\n|            3 |\r\n+--------------+\r\n1 row in set (0.01 sec)\r\n",
  },
  { direction: "client", content: "QUIT;\r\n" },
  { direction: "server", content: "Bye\r\n" },
];

// ─── PostgreSQL Template ─────────────────────────────────────────

const pgsql: ProtocolTemplate = [
  {
    direction: "server",
    content:
      'PostgreSQL 15.4 on x86_64-pc-linux-gnu\r\nType "help" for help.\r\n\r\nnexus_analytics=> ',
  },
  {
    direction: "client",
    content:
      "SELECT protocol, COUNT(*) as pkt_count, SUM(length) as total_bytes FROM packets WHERE capture_time > NOW() - INTERVAL '1 hour' GROUP BY protocol ORDER BY pkt_count DESC LIMIT 5;\r\n",
  },
  {
    direction: "server",
    content:
      " protocol | pkt_count | total_bytes \r\n----------+-----------+-------------\r\n TCP      |     12847 |     8294102\r\n UDP      |      5621 |     1893440\r\n HTTP     |      3204 |     4510283\r\n DNS      |      1847 |      221640\r\n ICMP     |       312 |       24960\r\n(5 rows)\r\n\r\nnexus_analytics=> ",
  },
  {
    direction: "client",
    content:
      "SELECT src_ip, dst_ip, COUNT(*) as conn_count FROM connections WHERE flagged = true GROUP BY src_ip, dst_ip ORDER BY conn_count DESC LIMIT 3;\r\n",
  },
  {
    direction: "server",
    content:
      "    src_ip     |    dst_ip     | conn_count \r\n---------------+---------------+------------\r\n 192.168.1.105 | 10.0.5.22     |         47\r\n 10.0.2.88     | 172.16.0.1    |         23\r\n 192.168.1.42  | 10.0.3.5      |         12\r\n(3 rows)\r\n\r\nnexus_analytics=> ",
  },
];

// ─── Template Registry ──────────────────────────────────────────

const httpTemplates = [httpGet, httpPost];

export const PROTOCOL_TEMPLATES: Record<string, ProtocolTemplate[]> = {
  HTTP: httpTemplates,
  FTP: [ftp],
  SMTP: [smtp],
  TELNET: [telnet],
  MQTT: [mqtt],
  DNS: [dns],
  MySQL: [mysql],
  PGSQL: [pgsql],
};

// Protocols that are encrypted — no conversation reconstruction possible
export const ENCRYPTED_PROTOCOLS = new Set(["HTTPS", "SSH", "RDP"]);

export function getTemplateForProtocol(
  protocol: string
): ProtocolTemplate | null {
  const templates = PROTOCOL_TEMPLATES[protocol];
  if (!templates || templates.length === 0) return null;
  return templates[Math.floor(Math.random() * templates.length)];
}
