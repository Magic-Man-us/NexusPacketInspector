import { describe, it, expect } from "vitest";
import {
  PROTOCOL_TEMPLATES,
  ENCRYPTED_PROTOCOLS,
  getTemplateForProtocol,
} from "../protocol-templates";

describe("protocol-templates", () => {
  describe("PROTOCOL_TEMPLATES", () => {
    it("has templates for all expected unencrypted protocols", () => {
      const expected = ["HTTP", "FTP", "SMTP", "TELNET", "MQTT", "DNS", "MySQL", "PGSQL"];
      for (const proto of expected) {
        expect(PROTOCOL_TEMPLATES[proto]).toBeDefined();
        expect(PROTOCOL_TEMPLATES[proto].length).toBeGreaterThan(0);
      }
    });

    it("does not have templates for encrypted protocols", () => {
      for (const proto of ENCRYPTED_PROTOCOLS) {
        expect(PROTOCOL_TEMPLATES[proto]).toBeUndefined();
      }
    });

    it("every template has at least one message", () => {
      for (const [proto, templates] of Object.entries(PROTOCOL_TEMPLATES)) {
        for (const template of templates) {
          expect(template.length, `${proto} template should have messages`).toBeGreaterThan(0);
        }
      }
    });

    it("every message has valid direction and non-empty content", () => {
      for (const [proto, templates] of Object.entries(PROTOCOL_TEMPLATES)) {
        for (const template of templates) {
          for (const msg of template) {
            expect(["client", "server"]).toContain(msg.direction);
            expect(msg.content.length, `${proto} message content should be non-empty`).toBeGreaterThan(0);
          }
        }
      }
    });

    it("HTTP has both client and server messages", () => {
      for (const template of PROTOCOL_TEMPLATES["HTTP"]) {
        const dirs = new Set(template.map((m) => m.direction));
        expect(dirs.has("client")).toBe(true);
        expect(dirs.has("server")).toBe(true);
      }
    });

    it("HTTP has at least 2 template variants", () => {
      expect(PROTOCOL_TEMPLATES["HTTP"].length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("ENCRYPTED_PROTOCOLS", () => {
    it("contains HTTPS, SSH, and RDP", () => {
      expect(ENCRYPTED_PROTOCOLS.has("HTTPS")).toBe(true);
      expect(ENCRYPTED_PROTOCOLS.has("SSH")).toBe(true);
      expect(ENCRYPTED_PROTOCOLS.has("RDP")).toBe(true);
    });

    it("does not contain unencrypted protocols", () => {
      expect(ENCRYPTED_PROTOCOLS.has("HTTP")).toBe(false);
      expect(ENCRYPTED_PROTOCOLS.has("FTP")).toBe(false);
      expect(ENCRYPTED_PROTOCOLS.has("SMTP")).toBe(false);
    });
  });

  describe("getTemplateForProtocol", () => {
    it("returns a template for known protocols", () => {
      const template = getTemplateForProtocol("HTTP");
      expect(template).not.toBeNull();
      expect(template!.length).toBeGreaterThan(0);
    });

    it("returns null for encrypted protocols", () => {
      expect(getTemplateForProtocol("HTTPS")).toBeNull();
      expect(getTemplateForProtocol("SSH")).toBeNull();
    });

    it("returns null for unknown protocols", () => {
      expect(getTemplateForProtocol("UNKNOWN_PROTO")).toBeNull();
    });
  });
});
