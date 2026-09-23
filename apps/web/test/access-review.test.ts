import { describe, expect, it } from "vitest";

import { ReviewError, checkVisibilityChange, computeReviewDecision } from "../src/access/review";

const baseItem = {
  reviewState: "ai_suggestion" as const,
  visibility: null,
  visibilitySetBy: null,
  title: "Original title",
  body: "Original body",
  disputeNote: null,
};

// TC-020 — Review transitions (BR-020), plus BR-030 default visibility (unit portion of TC-022)
describe("computeReviewDecision", () => {
  it("confirms into verified, sets default Family visibility, and embeds", () => {
    const decision = computeReviewDecision(baseItem, { action: "confirm", withFeaturedPerson: false }, false);
    expect(decision.nextState).toBe("verified");
    expect(decision.nextVisibility).toBe("family");
    expect(decision.nextVisibilitySetBy).toBe("steward");
    expect(decision.shouldEmbed).toBe(true);
  });

  it("ignores edits on confirm — only 'correct' may change content (BR-020)", () => {
    const decision = computeReviewDecision(
      baseItem,
      { action: "confirm", edits: { title: "Sneaky change" }, withFeaturedPerson: false },
      false,
    );
    expect(decision.title).toBe("Original title");
  });

  it("applies edits on correct", () => {
    const decision = computeReviewDecision(
      baseItem,
      { action: "correct", edits: { title: "Fixed title", body: "Fixed body" }, withFeaturedPerson: false },
      false,
    );
    expect(decision.nextState).toBe("corrected");
    expect(decision.title).toBe("Fixed title");
    expect(decision.body).toBe("Fixed body");
  });

  it("rejects a dispute with no note", () => {
    expect(() =>
      computeReviewDecision(baseItem, { action: "dispute", withFeaturedPerson: false }, false),
    ).toThrow(ReviewError);
  });

  it("accepts a dispute with a note and still embeds it", () => {
    const decision = computeReviewDecision(
      baseItem,
      { action: "dispute", note: "Hindi ito tama", withFeaturedPerson: false },
      false,
    );
    expect(decision.nextState).toBe("disputed");
    expect(decision.disputeNote).toBe("Hindi ito tama");
    expect(decision.shouldEmbed).toBe(true);
  });

  it("drops the embedding on reject", () => {
    const decision = computeReviewDecision(baseItem, { action: "reject", withFeaturedPerson: false }, false);
    expect(decision.nextState).toBe("rejected");
    expect(decision.shouldEmbed).toBe(false);
  });

  it("blocks first-review Memorial visibility without consent (BR-031)", () => {
    expect(() =>
      computeReviewDecision(
        baseItem,
        { action: "confirm", visibility: "memorial", withFeaturedPerson: false },
        false,
      ),
    ).toThrow(ReviewError);
  });

  it("allows first-review Memorial visibility with consent", () => {
    const decision = computeReviewDecision(
      baseItem,
      { action: "confirm", visibility: "memorial", withFeaturedPerson: false },
      true,
    );
    expect(decision.nextVisibility).toBe("memorial");
  });

  it("never changes visibility on a re-review — that's applyVisibilityChange's job", () => {
    const alreadyReviewed = { ...baseItem, reviewState: "verified" as const, visibility: "family" as const, visibilitySetBy: "steward" as const };
    const decision = computeReviewDecision(
      alreadyReviewed,
      { action: "correct", visibility: "memorial", withFeaturedPerson: false },
      true,
    );
    expect(decision.nextVisibility).toBe("family");
  });
});

// TC-023 — Consent ceiling (BR-032), plus BR-031 (unit portion, mirrors packages/core's own tests
// but through the access-layer function the routes actually call)
describe("checkVisibilityChange", () => {
  it("blocks raising to Memorial without consent", () => {
    expect(() =>
      checkVisibilityChange(
        { visibility: "family", visibilitySetBy: "steward" },
        { nextVisibility: "memorial", withFeaturedPerson: false },
        false,
      ),
    ).toThrow(ReviewError);
  });

  it("blocks the steward from raising a Private item the featured person set", () => {
    expect(() =>
      checkVisibilityChange(
        { visibility: "private", visibilitySetBy: "featured_person" },
        { nextVisibility: "family", withFeaturedPerson: false },
        true,
      ),
    ).toThrow(ReviewError);
  });

  it("allows the featured person themself to raise it", () => {
    expect(() =>
      checkVisibilityChange(
        { visibility: "private", visibilitySetBy: "featured_person" },
        { nextVisibility: "family", withFeaturedPerson: true },
        true,
      ),
    ).not.toThrow();
  });

  it("always allows lowering visibility", () => {
    expect(() =>
      checkVisibilityChange(
        { visibility: "memorial", visibilitySetBy: "featured_person" },
        { nextVisibility: "private", withFeaturedPerson: false },
        true,
      ),
    ).not.toThrow();
  });
});
