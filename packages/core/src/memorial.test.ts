import { describe, expect, it } from "vitest";

import { isMemorialPublic } from "./memorial";

const open = { lifecycleMode: "memorial", memorialLinkDisabled: false, recapStatus: "published" } as const;

// TC-057 (rule half): every /m/[token] surface uses this gate.
describe("isMemorialPublic", () => {
  it("is public when activated, published, and enabled", () => {
    expect(isMemorialPublic(open)).toBe(true);
  });

  it("hides a memorial whose link the steward disabled (BR-055)", () => {
    expect(isMemorialPublic({ ...open, memorialLinkDisabled: true })).toBe(false);
  });

  it("hides a draft or missing recap (BR-052)", () => {
    expect(isMemorialPublic({ ...open, recapStatus: "draft" })).toBe(false);
    expect(isMemorialPublic({ ...open, recapStatus: null })).toBe(false);
  });

  it("hides a reversed activation (BR-051)", () => {
    expect(isMemorialPublic({ ...open, lifecycleMode: "during" })).toBe(false);
  });
});
