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
