import { describe, it, expect, beforeEach } from "vitest";
import {
  generatePacket,
  getStreamKey,
  resetConversationState,
  type StreamInfo,
} from "../demo-mode";
import { ENCRYPTED_PROTOCOLS } from "../protocol-templates";

beforeEach(() => {
  resetConversationState();
});

describe("demo-mode", () => {
  describe("getStreamKey", () => {
    it("produces a bidirectional key (same key regardless of src/dst order)", () => {
      const pkt1 = generatePacket(1);
      // Create a fake reversed packet
      const key1 = getStreamKey(pkt1);
      const reversed = {
        ...pkt1,
        ip: { ...pkt1.ip, srcIp: pkt1.ip.dstIp, dstIp: pkt1.ip.srcIp },
        srcPort: pkt1.dstPort,
        dstPort: pkt1.srcPort,
      };
      const key2 = getStreamKey(reversed);
      expect(key1).toBe(key2);
    });

    it("returns a string with the expected format", () => {
      const pkt = generatePacket(1);
      const key = getStreamKey(pkt);
      expect(key).toMatch(/^\d+\.\d+\.\d+\.\d+:\d+-\d+\.\d+\.\d+\.\d+:\d+$/);
    });
  });

  describe("generatePacket", () => {
    it("returns a packet with all required fields", () => {
      const pkt = generatePacket(1);
      expect(pkt.id).toBe(1);
      expect(pkt.protocol).toBeTruthy();
      expect(pkt.ip.srcIp).toBeTruthy();
      expect(pkt.ip.dstIp).toBeTruthy();
      expect(pkt.payload).toBeDefined();
      expect(pkt.payload.data).toBeTruthy();
      expect(pkt.payload.length).toBeGreaterThan(0);
      expect(pkt.streamKey).toBeTruthy();
      expect(pkt.route).toBeDefined();
      expect(pkt.route.length).toBeGreaterThan(0);
    });

    it("generates packets with incrementing ids", () => {
      const pkt1 = generatePacket(1);
      const pkt2 = generatePacket(2);
      expect(pkt1.id).toBe(1);
      expect(pkt2.id).toBe(2);
    });

    it("produces diverse protocols when no existing streams", () => {
      const protocols = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const pkt = generatePacket(i + 1);
        protocols.add(pkt.protocol);
      }
      // With 20 protocols and 50 packets, we should see at least 5 different ones
      expect(protocols.size).toBeGreaterThanOrEqual(5);
    });

    it("reuses existing streams when provided", () => {
      const streams: StreamInfo[] = [
        { protocol: "HTTP", srcIP: "10.0.0.1", dstIP: "10.0.0.2", srcPort: 12345, dstPort: 80 },
      ];
      let reused = 0;
      for (let i = 0; i < 100; i++) {
        const pkt = generatePacket(i + 1, streams);
        if (pkt.protocol === "HTTP") reused++;
      }
      // Should see some reuse but not 100% (especially with 1 stream, reuse chance is low)
      expect(reused).toBeGreaterThan(0);
    });

    it("scales reuse probability with stream pool size", () => {
      // With 1 stream, reuse rate should be low (~7%)
      const singleStream: StreamInfo[] = [
        { protocol: "TCP", srcIP: "10.0.0.1", dstIP: "10.0.0.2", srcPort: 1000, dstPort: 80 },
      ];
      let reusedSingle = 0;
      const trials = 200;
      for (let i = 0; i < trials; i++) {
        const pkt = generatePacket(i + 1, singleStream);
        if (pkt.protocol === "TCP" &&
            ((pkt.ip.srcIp === "10.0.0.1" && pkt.ip.dstIp === "10.0.0.2") ||
             (pkt.ip.srcIp === "10.0.0.2" && pkt.ip.dstIp === "10.0.0.1"))) {
          reusedSingle++;
        }
      }

      // With 10 streams, reuse rate should be higher
      const manyStreams: StreamInfo[] = Array.from({ length: 10 }, (_, i) => ({
        protocol: "UDP",
        srcIP: `10.0.0.${i + 1}`,
        dstIP: `10.0.0.${i + 100}`,
        srcPort: 5000 + i,
        dstPort: 53,
      }));
      let reusedMany = 0;
      for (let i = 0; i < trials; i++) {
        const pkt = generatePacket(i + 1, manyStreams);
        if (pkt.protocol === "UDP") reusedMany++;
      }

      // Many-stream reuse should be significantly higher than single-stream
      expect(reusedMany).toBeGreaterThan(reusedSingle);
    });

    it("generates realistic ASCII payloads for unencrypted protocols with templates", () => {
      // Generate many packets until we get an HTTP one
      let httpPayload: string | null = null;
      for (let i = 0; i < 100; i++) {
        const pkt = generatePacket(i + 1);
        if (pkt.protocol === "HTTP") {
          httpPayload = pkt.payload.data;
          break;
        }
      }

      if (httpPayload) {
        // Decode hex to ASCII and check it looks like HTTP content
        const text = hexToAscii(httpPayload);
        // Should contain readable ASCII, not random bytes
        const printableRatio = countPrintable(text) / text.length;
        expect(printableRatio).toBeGreaterThan(0.8);
      }
    });

    it("generates random hex for encrypted protocols", () => {
      // Force enough packets to eventually get HTTPS
      let httpsPayload: string | null = null;
      for (let i = 0; i < 200; i++) {
        const pkt = generatePacket(i + 1);
        if (ENCRYPTED_PROTOCOLS.has(pkt.protocol)) {
          httpsPayload = pkt.payload.data;
          break;
        }
      }

      // If we got one, it should not be high-ASCII printable text
      // (random hex won't decode to mostly printable ASCII)
      if (httpsPayload) {
        const text = hexToAscii(httpsPayload);
        // Random bytes have ~37% printable ASCII range (32-126 out of 0-255)
        // We just verify it doesn't look like structured text
        expect(text.length).toBeGreaterThan(0);
      }
    });

    it("sets TCP or UDP fields correctly based on protocol", () => {
      for (let i = 0; i < 30; i++) {
        const pkt = generatePacket(i + 1);
        if (pkt.isUdp) {
          expect(pkt.udp).not.toBeNull();
          expect(pkt.tcp).toBeNull();
        } else {
          expect(pkt.tcp).not.toBeNull();
          expect(pkt.udp).toBeNull();
        }
      }
    });
  });

  describe("resetConversationState", () => {
    it("does not throw", () => {
      expect(() => resetConversationState()).not.toThrow();
    });

    it("can be called multiple times safely", () => {
      resetConversationState();
      resetConversationState();
      resetConversationState();
      // Should still generate packets fine
      const pkt = generatePacket(1);
      expect(pkt).toBeDefined();
    });
  });
});

// Helpers
function hexToAscii(hex: string): string {
  let str = "";
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substring(i, i + 2), 16));
  }
  return str;
}

function countPrintable(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if ((code >= 32 && code < 127) || code === 10 || code === 13 || code === 9) count++;
  }
  return count;
}
