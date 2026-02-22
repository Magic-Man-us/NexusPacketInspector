// Stream reassembly and protocol parsing — pure functions, no React
import { ENCRYPTED_PROTOCOLS } from "./protocol-templates";
import type { StreamData } from "../types/stream";

// ─── Types ───────────────────────────────────────────────────────

export interface HttpExchange {
  request: { method: string; path: string; version: string; headers: Record<string, string>; body: string };
  response: { version: string; status: number; statusText: string; headers: Record<string, string>; body: string } | null;
}

export interface SmtpEnvelope {
  from: string;
  to: string[];
  subject: string;
  body: string;
  rawExchange: string;
}

export interface FtpCommand {
  direction: "client" | "server";
  line: string;
}

export interface MqttMsg {
  type: string;
  topic?: string;
  payload?: string;
  raw: string;
}

export interface DnsQuery {
  direction: "query" | "response";
  id: string;
  type?: string;
  name?: string;
  answers?: string;
  raw: string;
}

export type ParsedProtocolContent =
  | { type: "http"; exchanges: HttpExchange[] }
  | { type: "smtp"; envelope: SmtpEnvelope }
  | { type: "ftp"; commands: FtpCommand[] }
  | { type: "telnet"; session: string }
  | { type: "mqtt"; messages: MqttMsg[] }
  | { type: "dns"; queries: DnsQuery[] }
  | { type: "raw"; text: string };

export interface ReassembledStream {
  protocol: string;
  clientIP: string;
  serverIP: string;
  clientPayload: Uint8Array;
  serverPayload: Uint8Array;
  clientText: string;
  serverText: string;
  totalBytes: number;
  packetCount: number;
  isEncrypted: boolean;
  content: ParsedProtocolContent | null;
}

// ─── Helpers ─────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s/g, "");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToText(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return "";
  }
}

// ─── Protocol Parsers ────────────────────────────────────────────

function parseHttp(clientText: string, serverText: string): ParsedProtocolContent {
  const exchanges: HttpExchange[] = [];

  const requestPattern = /(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+(\S+)\s+(HTTP\/[\d.]+)\r?\n/g;
  const requests: { method: string; path: string; version: string; headers: Record<string, string>; body: string; index: number }[] = [];

  let match;
  while ((match = requestPattern.exec(clientText)) !== null) {
    requests.push({
      method: match[1],
      path: match[2],
      version: match[3],
      headers: {},
      body: "",
      index: match.index,
    });
  }

  for (let i = 0; i < requests.length; i++) {
    const reqStart = requests[i].index;
    const reqEnd = i + 1 < requests.length ? requests[i + 1].index : clientText.length;
    const reqText = clientText.substring(reqStart, reqEnd);
    const headerBodySplit = reqText.indexOf("\r\n\r\n");
    if (headerBodySplit !== -1) {
      const headerSection = reqText.substring(reqText.indexOf("\r\n") + 2, headerBodySplit);
      requests[i].headers = parseHeaders(headerSection);
      requests[i].body = reqText.substring(headerBodySplit + 4).trim();
    }
  }

  const responsePattern = /(HTTP\/[\d.]+)\s+(\d{3})\s+([^\r\n]*)\r?\n/g;
  const responses: { version: string; status: number; statusText: string; headers: Record<string, string>; body: string; index: number }[] = [];

  while ((match = responsePattern.exec(serverText)) !== null) {
    responses.push({
      version: match[1],
      status: parseInt(match[2]),
      statusText: match[3],
      headers: {},
      body: "",
      index: match.index,
    });
  }

  for (let i = 0; i < responses.length; i++) {
    const respStart = responses[i].index;
    const respEnd = i + 1 < responses.length ? responses[i + 1].index : serverText.length;
    const respText = serverText.substring(respStart, respEnd);
    const headerBodySplit = respText.indexOf("\r\n\r\n");
    if (headerBodySplit !== -1) {
      const headerSection = respText.substring(respText.indexOf("\r\n") + 2, headerBodySplit);
      responses[i].headers = parseHeaders(headerSection);
      responses[i].body = respText.substring(headerBodySplit + 4).trim();
    }
  }

  for (let i = 0; i < requests.length; i++) {
    exchanges.push({
      request: requests[i],
      response: responses[i] || null,
    });
  }

  if (exchanges.length === 0 && (clientText.length > 0 || serverText.length > 0)) {
    exchanges.push({
      request: { method: "?", path: "/", version: "HTTP/1.1", headers: {}, body: clientText },
      response: serverText.length > 0 ? { version: "HTTP/1.1", status: 200, statusText: "OK", headers: {}, body: serverText } : null,
    });
  }

  return { type: "http", exchanges };
}

function parseHeaders(headerText: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of headerText.split(/\r?\n/)) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      headers[line.substring(0, colonIdx).trim()] = line.substring(colonIdx + 1).trim();
    }
  }
  return headers;
}

function parseSmtp(clientText: string, serverText: string): ParsedProtocolContent {
  let from = "";
  const to: string[] = [];
  let subject = "";
  let body = "";

  const fromMatch = clientText.match(/MAIL FROM:<([^>]*)>/i);
  if (fromMatch) from = fromMatch[1];

  const toMatches = clientText.matchAll(/RCPT TO:<([^>]*)>/gi);
  for (const m of toMatches) to.push(m[1]);

  const subjectMatch = clientText.match(/Subject:\s*([^\r\n]+)/i);
  if (subjectMatch) subject = subjectMatch[1];

  const dataIdx = clientText.indexOf("DATA\r\n");
  if (dataIdx !== -1) {
    const afterData = clientText.substring(dataIdx + 6);
    const headerEnd = afterData.indexOf("\r\n\r\n");
    if (headerEnd !== -1) {
      body = afterData.substring(headerEnd + 4).replace(/\r?\n\.\r?\n$/, "").trim();
    }
  }

  return {
    type: "smtp",
    envelope: { from, to, subject, body, rawExchange: clientText + serverText },
  };
}

function parseFtp(clientText: string, serverText: string): ParsedProtocolContent {
  const commands: FtpCommand[] = [];
  const clientLines = clientText.split(/\r?\n/).filter(Boolean);
  const serverLines = serverText.split(/\r?\n/).filter(Boolean);

  let ci = 0, si = 0;

  while (si < serverLines.length || ci < clientLines.length) {
    if (si < serverLines.length) {
      commands.push({ direction: "server", line: serverLines[si] });
      si++;
      while (si < serverLines.length && !/^\d{3}/.test(serverLines[si])) {
        commands.push({ direction: "server", line: serverLines[si] });
        si++;
      }
    }
    if (ci < clientLines.length) {
      commands.push({ direction: "client", line: clientLines[ci] });
      ci++;
    }
  }

  return { type: "ftp", commands };
}

function parseTelnet(clientText: string, serverText: string): ParsedProtocolContent {
  return { type: "telnet", session: serverText || clientText };
}

function parseMqtt(clientText: string, serverText: string): ParsedProtocolContent {
  const messages: MqttMsg[] = [];
  const allLines = [
    ...clientText.split(/\r?\n/).filter(Boolean).map(l => ({ line: l })),
    ...serverText.split(/\r?\n/).filter(Boolean).map(l => ({ line: l })),
  ];

  for (const { line } of allLines) {
    const typeMatch = line.match(/^(CONNECT|CONNACK|PUBLISH|SUBSCRIBE|SUBACK|PUBACK|PINGREQ|PINGRESP|DISCONNECT)/);
    const topicMatch = line.match(/topic=(\S+)/);
    const payloadMatch = line.match(/payload=(.+)$/);

    messages.push({
      type: typeMatch ? typeMatch[1] : "UNKNOWN",
      topic: topicMatch ? topicMatch[1] : undefined,
      payload: payloadMatch ? payloadMatch[1] : undefined,
      raw: line,
    });
  }

  return { type: "mqtt", messages };
}

function parseDns(clientText: string, serverText: string): ParsedProtocolContent {
  const queries: DnsQuery[] = [];

  for (const line of clientText.split(/\r?\n/).filter(Boolean)) {
    const idMatch = line.match(/id=(\S+)/);
    const typeMatch = line.match(/type=(\S+)/);
    const nameMatch = line.match(/name=(\S+)/);
    queries.push({
      direction: "query",
      id: idMatch?.[1] || "",
      type: typeMatch?.[1],
      name: nameMatch?.[1],
      raw: line,
    });
  }

  for (const line of serverText.split(/\r?\n/).filter(Boolean)) {
    const idMatch = line.match(/id=(\S+)/);
    if (idMatch) {
      queries.push({ direction: "response", id: idMatch[1], answers: line, raw: line });
    } else if (line.trim().startsWith("  ") || line.trim().match(/^\S+\.\s+\d+/)) {
      const last = queries[queries.length - 1];
      if (last) last.answers = (last.answers || "") + "\n" + line.trim();
    }
  }

  return { type: "dns", queries };
}

// ─── Core Reassembly ─────────────────────────────────────────────

export function reassembleStream(
  _streamKey: string,
  stream: StreamData
): ReassembledStream {
  const protocol = stream.protocol;
  const isEncrypted = ENCRYPTED_PROTOCOLS.has(protocol);

  const clientHexParts: string[] = [];
  const serverHexParts: string[] = [];

  for (const pkt of stream.packets) {
    if (!pkt.payload?.data) continue;
    if (pkt.ip.srcIp === stream.srcIP) {
      clientHexParts.push(pkt.payload.data);
    } else {
      serverHexParts.push(pkt.payload.data);
    }
  }

  const clientBytes = hexToBytes(clientHexParts.join(""));
  const serverBytes = hexToBytes(serverHexParts.join(""));
  const clientText = bytesToText(clientBytes);
  const serverText = bytesToText(serverBytes);

  let content: ParsedProtocolContent | null = null;

  if (!isEncrypted) {
    switch (protocol) {
      case "HTTP":
        content = parseHttp(clientText, serverText);
        break;
      case "SMTP":
        content = parseSmtp(clientText, serverText);
        break;
      case "FTP":
        content = parseFtp(clientText, serverText);
        break;
      case "TELNET":
        content = parseTelnet(clientText, serverText);
        break;
      case "MQTT":
        content = parseMqtt(clientText, serverText);
        break;
      case "DNS":
        content = parseDns(clientText, serverText);
        break;
      case "MySQL":
      case "PGSQL":
        content = { type: "raw", text: clientText + serverText };
        break;
      default:
        if (clientText.length > 0 || serverText.length > 0) {
          content = { type: "raw", text: clientText + serverText };
        }
        break;
    }
  }

  return {
    protocol,
    clientIP: stream.srcIP,
    serverIP: stream.dstIP,
    clientPayload: clientBytes,
    serverPayload: serverBytes,
    clientText,
    serverText,
    totalBytes: clientBytes.length + serverBytes.length,
    packetCount: stream.packets.length,
    isEncrypted,
    content,
  };
}

// ─── Hex Dump Formatter ──────────────────────────────────────────

export function formatHexDump(bytes: Uint8Array): string {
  const lines: string[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const offset = i.toString(16).padStart(8, "0");
    const hexParts: string[] = [];
    let ascii = "";
    for (let j = 0; j < 16; j++) {
      if (i + j < bytes.length) {
        hexParts.push(bytes[i + j].toString(16).padStart(2, "0"));
        ascii += bytes[i + j] >= 32 && bytes[i + j] < 127 ? String.fromCharCode(bytes[i + j]) : ".";
      } else {
        hexParts.push("  ");
        ascii += " ";
      }
    }
    const hexLeft = hexParts.slice(0, 8).join(" ");
    const hexRight = hexParts.slice(8).join(" ");
    lines.push(`${offset}  ${hexLeft}  ${hexRight}  |${ascii}|`);
  }
  return lines.join("\n");
}
