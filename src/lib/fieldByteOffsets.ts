/**
 * Maps structure view fields (by layer + field index) to absolute byte ranges
 * in the hex dump. Based on the deterministic layout in HexViewer's hexFromPacket().
 *
 * Sub-byte fields (e.g. TCP flags sharing byte 47) highlight the full byte
 * since the hex viewer operates at byte granularity.
 */

interface ByteRange {
  byteStart: number;
  byteEnd: number; // exclusive
}

// Ethernet: 14 bytes (0–13)
//  0: DestMAC  0-5
//  1: SrcMAC   6-11
//  2: EtherType 12-13
const ETHERNET_FIELDS: ByteRange[] = [
  { byteStart: 0, byteEnd: 6 },   // Dest MAC
  { byteStart: 6, byteEnd: 12 },  // Src MAC
  { byteStart: 12, byteEnd: 14 }, // EtherType
];

// IP header: 20 bytes (14–33)
//  0: Version    byte 14 (upper nibble)
//  1: IHL        byte 14 (lower nibble)
//  2: DSCP       byte 15 (upper 6 bits)
//  3: ECN        byte 15 (lower 2 bits)
//  4: Total Len  bytes 16-17
//  5: Ident      bytes 18-19
//  6: Flags      byte 20 (upper 3 bits)
//  7: FragOffset  bytes 20-21 (lower 13 bits)
//  8: TTL        byte 22
//  9: Protocol   byte 23
// 10: Checksum   bytes 24-25
// 11: Source IP  bytes 26-29
// 12: Dest IP    bytes 30-33
const IP_FIELDS: ByteRange[] = [
  { byteStart: 14, byteEnd: 15 }, // Version (shares byte 14 with IHL)
  { byteStart: 14, byteEnd: 15 }, // IHL
  { byteStart: 15, byteEnd: 16 }, // DSCP (shares byte 15 with ECN)
  { byteStart: 15, byteEnd: 16 }, // ECN
  { byteStart: 16, byteEnd: 18 }, // Total Length
  { byteStart: 18, byteEnd: 20 }, // Identification
  { byteStart: 20, byteEnd: 21 }, // Flags (shares byte 20 with FragOffset)
  { byteStart: 20, byteEnd: 22 }, // Fragment Offset
  { byteStart: 22, byteEnd: 23 }, // TTL
  { byteStart: 23, byteEnd: 24 }, // Protocol
  { byteStart: 24, byteEnd: 26 }, // Header Checksum
  { byteStart: 26, byteEnd: 30 }, // Source IP
  { byteStart: 30, byteEnd: 34 }, // Dest IP
];

// TCP header: 20 bytes (34–53)
//  0: Src Port    bytes 34-35
//  1: Dst Port    bytes 36-37
//  2: Sequence    bytes 38-41
//  3: ACK Number  bytes 42-45
//  4: Data Offset byte 46 (upper nibble)
//  5: Reserved    byte 46 (lower nibble)
//  6-11: Flags (URG,ACK,PSH,RST,SYN,FIN) all in byte 47
// 12: Window      bytes 48-49
// 13: Checksum    bytes 50-51
// 14: Urg Ptr     bytes 52-53
const TCP_FIELDS: ByteRange[] = [
  { byteStart: 34, byteEnd: 36 }, // Src Port
  { byteStart: 36, byteEnd: 38 }, // Dst Port
  { byteStart: 38, byteEnd: 42 }, // Sequence
  { byteStart: 42, byteEnd: 46 }, // ACK Number
  { byteStart: 46, byteEnd: 47 }, // Data Offset (shares byte 46)
  { byteStart: 46, byteEnd: 47 }, // Reserved
  { byteStart: 47, byteEnd: 48 }, // URG flag
  { byteStart: 47, byteEnd: 48 }, // ACK flag
  { byteStart: 47, byteEnd: 48 }, // PSH flag
  { byteStart: 47, byteEnd: 48 }, // RST flag
  { byteStart: 47, byteEnd: 48 }, // SYN flag
  { byteStart: 47, byteEnd: 48 }, // FIN flag
  { byteStart: 48, byteEnd: 50 }, // Window Size
  { byteStart: 50, byteEnd: 52 }, // Checksum
  { byteStart: 52, byteEnd: 54 }, // Urgent Pointer
];

// UDP header: 8 bytes (34–41)
//  0: Src Port   bytes 34-35
//  1: Dst Port   bytes 36-37
//  2: Length     bytes 38-39
//  3: Checksum   bytes 40-41
const UDP_FIELDS: ByteRange[] = [
  { byteStart: 34, byteEnd: 36 }, // Src Port
  { byteStart: 36, byteEnd: 38 }, // Dst Port
  { byteStart: 38, byteEnd: 40 }, // Length
  { byteStart: 40, byteEnd: 42 }, // Checksum
];

const LAYER_MAP: Record<string, ByteRange[]> = {
  ethernet: ETHERNET_FIELDS,
  ip: IP_FIELDS,
  tcp: TCP_FIELDS,
  udp: UDP_FIELDS,
};

/**
 * Returns the absolute byte range for a given field in the hex dump.
 * For payload, computes dynamically based on whether TCP or UDP is present.
 */
export function getFieldByteRange(
  layer: string,
  fieldIndex: number,
  hasTcp: boolean,
): ByteRange | null {
  if (layer === "payload") {
    const payloadStart = hasTcp ? 54 : 42;
    // Payload is a single field (index 0) spanning to end — we don't know end,
    // so return start with a large end. The HexViewer will clamp to actual byte count.
    return fieldIndex === 0 ? { byteStart: payloadStart, byteEnd: Infinity } : null;
  }

  const fields = LAYER_MAP[layer];
  if (!fields || fieldIndex < 0 || fieldIndex >= fields.length) return null;
  return fields[fieldIndex];
}
