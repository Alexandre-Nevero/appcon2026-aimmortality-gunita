import { describe, expect, it } from "vitest";

import {
  hashVisitorId,
  isVisitorId,
  newVisitorId,
  VISITOR_COOKIE_MAX_AGE_SECONDS,
} from "../src/memories/visitor";

// TC-058: tributes key on an anonymous cookie; only its HMAC is stored.
describe("visitor key", () => {
  it("issues distinct 128-bit base64url ids", () => {
    const id = newVisitorId();
    expect(isVisitorId(id)).toBe(true);
    expect(newVisitorId()).not.toBe(id);
  });

  it("rejects missing or tampered cookie values", () => {
    expect(isVisitorId(undefined)).toBe(false);
    expect(isVisitorId("short")).toBe(false);
    expect(isVisitorId(`${"a".repeat(21)}!`)).toBe(false);
  });

  it("stores a keyed hash that is stable per secret and hides the id", () => {
    const hash = hashVisitorId("abc", "s1");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashVisitorId("abc", "s1")).toBe(hash);
    expect(hashVisitorId("abc", "s2")).not.toBe(hash);
    expect(hash).not.toContain("abc");
  });

  it("remembers the phone for 14 days, not a year (ADR-008)", () => {
    expect(VISITOR_COOKIE_MAX_AGE_SECONDS).toBe(14 * 24 * 60 * 60);
  });

  it("fails loudly without a secret", () => {
    expect(() => hashVisitorId("abc", "")).toThrow(/IP_HASH_SECRET/);
  });
});
