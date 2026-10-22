import { describe, expect, it } from "vitest";
import { sanitizeNextPath } from "../auth-redirect";

describe("sanitizeNextPath", () => {
  it("falls back to /account for missing/empty input", () => {
    expect(sanitizeNextPath(null)).toBe("/account");
    expect(sanitizeNextPath(undefined)).toBe("/account");
    expect(sanitizeNextPath("")).toBe("/account");
    expect(sanitizeNextPath("   ")).toBe("/account");
  });

  it("accepts valid internal paths", () => {
    expect(sanitizeNextPath("/pricing")).toBe("/pricing");
    expect(sanitizeNextPath("/ziwei/synastry")).toBe("/ziwei/synastry");
    expect(sanitizeNextPath("/sophies-journey/ch01-laozi")).toBe("/sophies-journey/ch01-laozi");
    expect(sanitizeNextPath("/iching/qian")).toBe("/iching/qian");
  });

  it("rejects external and protocol-relative URLs", () => {
    expect(sanitizeNextPath("https://evil.com")).toBe("/account");
    expect(sanitizeNextPath("http://evil.com/x")).toBe("/account");
    expect(sanitizeNextPath("//evil.com")).toBe("/account");
    expect(sanitizeNextPath("/\\evil.com")).toBe("/account");
    expect(sanitizeNextPath("https:////evil.com")).toBe("/account");
  });

  it("rejects encoded bypasses", () => {
    expect(sanitizeNextPath("%2F%2Fevil.com")).toBe("/account");
    expect(sanitizeNextPath("%2F%2F%2F%2Fevil.com")).toBe("/account");
    expect(sanitizeNextPath("https%3A%2F%2Fevil.com")).toBe("/account");
    expect(sanitizeNextPath("%2F%2Fevil.com%2F%2F")).toBe("/account");
  });

  it("rejects login loops and internal endpoints", () => {
    expect(sanitizeNextPath("/login")).toBe("/account");
    expect(sanitizeNextPath("/login?next=/pricing")).toBe("/account");
    expect(sanitizeNextPath("/auth/callback")).toBe("/account");
    expect(sanitizeNextPath("/auth/callback?next=/auth/callback")).toBe("/account");
    expect(sanitizeNextPath("/api/checkout")).toBe("/account");
  });

  it("rejects dangerous schemes and oversized input", () => {
    expect(sanitizeNextPath("javascript:alert(1)")).toBe("/account");
    expect(sanitizeNextPath("data:text/html,x")).toBe("/account");
    expect(sanitizeNextPath("/" + "a".repeat(600))).toBe("/account");
  });

  describe("adversarial encodings and control chars", () => {
    it("rejects CRLF injection in query component", () => {
      expect(sanitizeNextPath("/x?next=%0d%0aSet-Cookie:x=1")).toBe("/account");
    });

    it("rejects control chars in query component", () => {
      expect(sanitizeNextPath("/x?q=%09tab")).toBe("/account");
    });

    it("rejects triple-slash host smuggling", () => {
      expect(sanitizeNextPath("///evil.com")).toBe("/account");
    });

    it("rejects malformed UTF-8 percent-encoding", () => {
      expect(sanitizeNextPath("/%c0%afevil.com")).toBe("/account");
    });

    it("rejects triple-encoded input", () => {
      expect(sanitizeNextPath("%25252Fevil.com")).toBe("/account");
    });

    it("rejects dot-segments", () => {
      expect(sanitizeNextPath("/../../evil.com")).toBe("/account");
    });

    it("rejects backslash anywhere", () => {
      expect(sanitizeNextPath("/a\\b")).toBe("/account");
    });
  });

  it("returns the input unchanged when valid (idempotent)", () => {
    expect(sanitizeNextPath("/pricing")).toBe(sanitizeNextPath(sanitizeNextPath("/pricing")));
  });
});

describe("sanitizeNextPath with anchor (login return keeps #oracle)", () => {
  it("preserves the #oracle hash on a chapter path", () => {
    expect(sanitizeNextPath("/sophies-journey/prologue-zhougong#oracle")).toBe(
      "/sophies-journey/prologue-zhougong#oracle"
    );
  });
});
