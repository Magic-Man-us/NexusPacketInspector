import { describe, it, expect } from "vitest";
import { reassembleStream, formatHexDump } from "../stream-reassembly";
import type { StreamData } from "../../types/stream";
import type { ParsedPacket } from "../../types/packet";

// Helper to create a minimal packet with hex-encoded ASCII payload
function makePacket(
  srcIp: string,
  dstIp: string,
  payloadText: string,
  id: number = 1
): ParsedPacket {
  const hexData = Array.from(payloadText)
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0").toUpperCase())
    .join("");

  return {
    id,
    timestamp: new Date().toISOString(),
    time: Date.now(),
    protocol: "HTTP",
    isUdp: false,
    ethernet: { destMac: "00:00:00:00:00:00", srcMac: "00:00:00:00:00:00", etherType: "0800" },
    ip: {
      version: 4, ihl: 5, dscp: 0, ecn: 0, totalLength: 100,
      identification: "0000", flags: { reserved: false, dontFragment: true, moreFragments: false },
      fragmentOffset: 0, ttl: 64, protocol: 6, headerChecksum: "0000",
      srcIp, dstIp,
    },
    tcp: { srcPort: 12345, dstPort: 80, sequenceNumber: 0, ackNumber: 0, dataOffset: 5, reserved: 0, flags: { urg: false, ack: true, psh: true, rst: false, syn: false, fin: false }, windowSize: 65535, checksum: "0000", urgentPointer: 0 },
    udp: null,
    payload: { length: payloadText.length, data: hexData, preview: "" },
    srcPort: 12345,
    dstPort: 80,
    length: 100,
    info: `${srcIp}:12345 → ${dstIp}:80`,
    streamKey: "test-stream",
  };
}

function makeStream(packets: ParsedPacket[], protocol: string = "HTTP"): StreamData {
  return {
    packets,
    srcIP: "10.0.0.1",
    dstIP: "10.0.0.2",
    srcPort: 12345,
    dstPort: 80,
    protocol,
    startTime: Date.now(),
    lastTime: Date.now(),
    color: "#00ff9f",
    totalBytes: packets.reduce((sum, p) => sum + p.length, 0),
  };
}

describe("stream-reassembly", () => {
  describe("reassembleStream", () => {
    it("separates client and server payloads by direction", () => {
      const packets = [
        makePacket("10.0.0.1", "10.0.0.2", "CLIENT_DATA", 1),
        makePacket("10.0.0.2", "10.0.0.1", "SERVER_DATA", 2),
      ];
      const stream = makeStream(packets);
      const result = reassembleStream("test", stream);

      expect(result.clientText).toContain("CLIENT_DATA");
      expect(result.serverText).toContain("SERVER_DATA");
      expect(result.clientText).not.toContain("SERVER_DATA");
      expect(result.serverText).not.toContain("CLIENT_DATA");
    });

    it("concatenates payloads from multiple packets in same direction", () => {
      const packets = [
        makePacket("10.0.0.1", "10.0.0.2", "PART1_", 1),
        makePacket("10.0.0.1", "10.0.0.2", "PART2_", 2),
        makePacket("10.0.0.1", "10.0.0.2", "PART3", 3),
      ];
      const stream = makeStream(packets);
      const result = reassembleStream("test", stream);

      expect(result.clientText).toBe("PART1_PART2_PART3");
    });

    it("reports correct totalBytes and packetCount", () => {
      const packets = [
        makePacket("10.0.0.1", "10.0.0.2", "Hello", 1),
        makePacket("10.0.0.2", "10.0.0.1", "World!", 2),
      ];
      const stream = makeStream(packets);
      const result = reassembleStream("test", stream);

      expect(result.totalBytes).toBe(11); // "Hello" (5) + "World!" (6)
      expect(result.packetCount).toBe(2);
    });

    it("marks encrypted protocols as encrypted", () => {
      const packets = [makePacket("10.0.0.1", "10.0.0.2", "encrypted_data", 1)];
      const stream = makeStream(packets, "HTTPS");
      const result = reassembleStream("test", stream);

      expect(result.isEncrypted).toBe(true);
      expect(result.content).toBeNull();
    });

    it("marks SSH as encrypted", () => {
      const stream = makeStream([], "SSH");
      const result = reassembleStream("test", stream);
      expect(result.isEncrypted).toBe(true);
    });

    it("marks RDP as encrypted", () => {
      const stream = makeStream([], "RDP");
      const result = reassembleStream("test", stream);
      expect(result.isEncrypted).toBe(true);
    });

    it("handles empty packet list", () => {
      const stream = makeStream([]);
      const result = reassembleStream("test", stream);

      expect(result.totalBytes).toBe(0);
      expect(result.packetCount).toBe(0);
      expect(result.clientText).toBe("");
      expect(result.serverText).toBe("");
    });
  });

  describe("HTTP parsing", () => {
    it("parses a GET request and 200 response", () => {
      const reqText = "GET /index.html HTTP/1.1\r\nHost: example.com\r\n\r\n";
      const respText = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<h1>Hello</h1>";

      const packets = [
        makePacket("10.0.0.1", "10.0.0.2", reqText, 1),
        makePacket("10.0.0.2", "10.0.0.1", respText, 2),
      ];
      const stream = makeStream(packets);
      const result = reassembleStream("test", stream);

      expect(result.content).not.toBeNull();
      expect(result.content!.type).toBe("http");
      if (result.content!.type === "http") {
        expect(result.content.exchanges.length).toBe(1);
        const ex = result.content.exchanges[0];
        expect(ex.request.method).toBe("GET");
        expect(ex.request.path).toBe("/index.html");
        expect(ex.request.headers["Host"]).toBe("example.com");
        expect(ex.response).not.toBeNull();
        expect(ex.response!.status).toBe(200);
        expect(ex.response!.body).toContain("<h1>Hello</h1>");
      }
    });

    it("parses POST request with JSON body", () => {
      const reqText = 'POST /api/data HTTP/1.1\r\nContent-Type: application/json\r\n\r\n{"key":"value"}';

      const packets = [makePacket("10.0.0.1", "10.0.0.2", reqText, 1)];
      const stream = makeStream(packets);
      const result = reassembleStream("test", stream);

      expect(result.content!.type).toBe("http");
      if (result.content!.type === "http") {
        expect(result.content.exchanges[0].request.method).toBe("POST");
        expect(result.content.exchanges[0].request.body).toContain('{"key":"value"}');
      }
    });
  });

  describe("SMTP parsing", () => {
    it("extracts envelope fields from SMTP exchange", () => {
      const clientText =
        "EHLO client.test\r\nMAIL FROM:<alice@test.com>\r\nRCPT TO:<bob@test.com>\r\nDATA\r\nFrom: Alice\r\nSubject: Test Subject\r\n\r\nThis is the body.\r\n.\r\n";
      const serverText = "250 OK\r\n";

      const packets = [
        makePacket("10.0.0.1", "10.0.0.2", clientText, 1),
        makePacket("10.0.0.2", "10.0.0.1", serverText, 2),
      ];
      const stream = makeStream(packets, "SMTP");
      const result = reassembleStream("test", stream);

      expect(result.content!.type).toBe("smtp");
      if (result.content!.type === "smtp") {
        expect(result.content.envelope.from).toBe("alice@test.com");
        expect(result.content.envelope.to).toContain("bob@test.com");
        expect(result.content.envelope.subject).toBe("Test Subject");
        expect(result.content.envelope.body).toContain("This is the body");
      }
    });
  });

  describe("FTP parsing", () => {
    it("parses FTP commands and responses", () => {
      const clientText = "USER admin\r\nPASS secret\r\n";
      const serverText = "220 FTP Ready\r\n331 Password required\r\n230 Login OK\r\n";

      const packets = [
        makePacket("10.0.0.1", "10.0.0.2", clientText, 1),
        makePacket("10.0.0.2", "10.0.0.1", serverText, 2),
      ];
      const stream = makeStream(packets, "FTP");
      const result = reassembleStream("test", stream);

      expect(result.content!.type).toBe("ftp");
      if (result.content!.type === "ftp") {
        expect(result.content.commands.length).toBeGreaterThan(0);
        const serverLines = result.content.commands.filter((c) => c.direction === "server");
        const clientLines = result.content.commands.filter((c) => c.direction === "client");
        expect(serverLines.length).toBeGreaterThan(0);
        expect(clientLines.length).toBeGreaterThan(0);
      }
    });
  });

  describe("TELNET parsing", () => {
    it("returns session text for telnet", () => {
      const serverText = "login: user\r\nPassword: \r\nWelcome!\r\n$ ";

      const packets = [makePacket("10.0.0.2", "10.0.0.1", serverText, 1)];
      const stream = makeStream(packets, "TELNET");
      const result = reassembleStream("test", stream);

      expect(result.content!.type).toBe("telnet");
      if (result.content!.type === "telnet") {
        expect(result.content.session).toContain("Welcome!");
      }
    });
  });

  describe("MQTT parsing", () => {
    it("identifies MQTT message types", () => {
      const clientText = "CONNECT clientId=test\r\nSUBSCRIBE topic=sensors/temp qos=1\r\n";
      const serverText = 'CONNACK returnCode=0\r\nPUBLISH topic=sensors/temp payload={"t":72}\r\n';

      const packets = [
        makePacket("10.0.0.1", "10.0.0.2", clientText, 1),
        makePacket("10.0.0.2", "10.0.0.1", serverText, 2),
      ];
      const stream = makeStream(packets, "MQTT");
      const result = reassembleStream("test", stream);

      expect(result.content!.type).toBe("mqtt");
      if (result.content!.type === "mqtt") {
        const types = result.content.messages.map((m) => m.type);
        expect(types).toContain("CONNECT");
        expect(types).toContain("CONNACK");
        expect(types).toContain("PUBLISH");
        expect(types).toContain("SUBSCRIBE");
      }
    });
  });

  describe("DNS parsing", () => {
    it("parses DNS queries and responses", () => {
      const clientText = "QUERY id=0x1234 type=A class=IN name=example.com\r\n";
      const serverText = "RESPONSE id=0x1234 status=NOERROR answers=1\r\n  example.com. 300 IN A 93.184.216.34\r\n";

      const packets = [
        makePacket("10.0.0.1", "10.0.0.2", clientText, 1),
        makePacket("10.0.0.2", "10.0.0.1", serverText, 2),
      ];
      const stream = makeStream(packets, "DNS");
      const result = reassembleStream("test", stream);

      expect(result.content!.type).toBe("dns");
      if (result.content!.type === "dns") {
        const q = result.content.queries.find((q) => q.direction === "query");
        expect(q).toBeDefined();
        expect(q!.name).toBe("example.com");
        expect(q!.type).toBe("A");

        const r = result.content.queries.find((q) => q.direction === "response");
        expect(r).toBeDefined();
        expect(r!.answers).toContain("93.184.216.34");
      }
    });
  });

  describe("raw fallback", () => {
    it("falls back to raw for unknown protocols with data", () => {
      const packets = [makePacket("10.0.0.1", "10.0.0.2", "some data", 1)];
      const stream = makeStream(packets, "TCP");
      const result = reassembleStream("test", stream);

      expect(result.content).not.toBeNull();
      expect(result.content!.type).toBe("raw");
      if (result.content!.type === "raw") {
        expect(result.content.text).toContain("some data");
      }
    });
  });

  describe("formatHexDump", () => {
    it("formats bytes into hex dump with offset, hex, and ASCII", () => {
      const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
      const dump = formatHexDump(bytes);

      expect(dump).toContain("00000000");
      expect(dump).toContain("48 65 6c 6c 6f");
      expect(dump).toContain("|Hello");
    });

    it("handles empty input", () => {
      const dump = formatHexDump(new Uint8Array(0));
      expect(dump).toBe("");
    });

    it("replaces non-printable chars with dots in ASCII column", () => {
      const bytes = new Uint8Array([0x00, 0x41, 0x01, 0x42]); // \0 A \1 B
      const dump = formatHexDump(bytes);
      expect(dump).toContain("|.A.B");
    });

    it("formats 16+ bytes across multiple lines", () => {
      const bytes = new Uint8Array(32);
      bytes.fill(0x41); // "AAAA..."
      const dump = formatHexDump(bytes);
      const lines = dump.split("\n");
      expect(lines.length).toBe(2);
      expect(lines[0]).toContain("00000000");
      expect(lines[1]).toContain("00000010");
    });
  });
});
