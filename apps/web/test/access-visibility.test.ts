import { describe, expect, it } from "vitest";

import { ARCHIVE_REVIEW_STATES, allowedVisibilitiesFor } from "../src/access/visibility";

// TC-022 — Visibility matrix (unit portion already covered at packages/core; this checks the
// access-layer wrapper derives the same answer, not a re-implementation of the rule)
describe("allowedVisibilitiesFor", () => {
  it("never lets a family member see Private", () => {
    expect(allowedVisibilitiesFor("family")).toEqual(["family", "memorial"]);
  });

  it("lets a steward see every visibility", () => {
    expect(allowedVisibilitiesFor("steward")).toEqual(["private", "family", "memorial"]);
  });
});

// BR-022 — only reviewed, non-rejected items appear in the archive/search/Ask/memorial
describe("ARCHIVE_REVIEW_STATES", () => {
  it("excludes ai_suggestion and rejected", () => {
    expect(ARCHIVE_REVIEW_STATES).not.toContain("ai_suggestion");
    expect(ARCHIVE_REVIEW_STATES).not.toContain("rejected");
  });

  it("includes every reviewed, non-rejected state", () => {
    expect(ARCHIVE_REVIEW_STATES.sort()).toEqual(
      ["corrected", "disputed", "uncertain", "verified"].sort(),
    );
  });
});
