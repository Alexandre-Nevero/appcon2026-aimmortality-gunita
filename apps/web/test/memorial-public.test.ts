import { describe, expect, it } from "vitest";

import {
  contributionWindowStart,
  hashSubmittedIp,
  isContributionRateLimited,
} from "../src/memorial/public";

describe("memorial public helpers", () => {
  it("hashes visitor IPs with a daily salt and never stores the raw IP (EQ-010)", () => {
    const hash = hashSubmittedIp("203.0.113.4", new Date("2026-09-24T00:00:00Z"), "secret");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("203.0.113.4");
    expect(hashSubmittedIp("203.0.113.4", new Date("2026-09-24T12:00:00Z"), "secret")).toBe(hash);
    expect(hashSubmittedIp("203.0.113.4", new Date("2026-09-25T00:00:00Z"), "secret")).not.toBe(hash);
  });

  it("rate-limits the sixth contribution inside the 10-minute window (TC-052)", () => {
    expect(isContributionRateLimited(4)).toBe(false);
    expect(isContributionRateLimited(5)).toBe(true);

    const start = contributionWindowStart(new Date("2026-09-24T11:10:00Z"));
    expect(start.toISOString()).toBe("2026-09-24T11:00:00.000Z");
  });
});
