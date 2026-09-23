import { createHmac, randomBytes } from "node:crypto";

// ADR-007: anonymous per-device id for soft tributes. Only its HMAC is ever stored.
export const VISITOR_COOKIE = "gunita_visitor";
// ADR-008: 14 days from first set. A lamay can run past a week. Not refreshed on later taps.
export const VISITOR_COOKIE_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;

const VISITOR_ID_RE = /^[A-Za-z0-9_-]{22}$/;

export function newVisitorId(): string {
  return randomBytes(16).toString("base64url");
}

export function isVisitorId(value: string | undefined): value is string {
  return value != null && VISITOR_ID_RE.test(value);
}

export function hashVisitorId(visitorId: string, secret = process.env.IP_HASH_SECRET): string {
  if (!secret) {
    throw new Error("IP_HASH_SECRET is not set (see docs/ops.md § Configuration & secrets)");
  }
  return createHmac("sha256", secret).update(visitorId).digest("hex");
}
