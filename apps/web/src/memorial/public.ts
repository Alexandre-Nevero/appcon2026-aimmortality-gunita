import { createHash } from "node:crypto";

export const CONTRIBUTION_RATE_LIMIT_MAX = 5;
export const CONTRIBUTION_RATE_LIMIT_WINDOW_MINUTES = 10;

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]!.trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp?.trim()) {
    return realIp.trim();
  }

  return "unknown";
}

export function hashSubmittedIp(
  ip: string,
  date = new Date(),
  secret = process.env.IP_HASH_SECRET,
): string {
  if (!secret) {
    throw new Error("IP_HASH_SECRET is not set (see docs/ops.md § Configuration & secrets)");
  }

  const day = date.toISOString().slice(0, 10);
  return createHash("sha256")
    .update(`${ip}\n${day}\n${secret}`)
    .digest("hex");
}

export function isContributionRateLimited(recentSubmissionCount: number): boolean {
  return recentSubmissionCount >= CONTRIBUTION_RATE_LIMIT_MAX;
}

export function contributionWindowStart(date = new Date()): Date {
  return new Date(date.getTime() - CONTRIBUTION_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
}
