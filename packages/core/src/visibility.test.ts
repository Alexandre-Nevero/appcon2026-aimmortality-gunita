import { describe, expect, it } from "vitest";

import { canChangeVisibility, canSetMemorialVisibility, canViewerSeeVisibility } from "./visibility";

// TC-022 — Visibility matrix (unit portion: viewer role × visibility; PRD BR-030, BR-033)
describe("canViewerSeeVisibility", () => {
  it("never lets a family member see a Private item", () => {
    expect(canViewerSeeVisibility("private", "family")).toBe(false);
  });

  it("lets a steward see everything in their own space", () => {
    expect(canViewerSeeVisibility("private", "steward")).toBe(true);
    expect(canViewerSeeVisibility("family", "steward")).toBe(true);
    expect(canViewerSeeVisibility("memorial", "steward")).toBe(true);
  });

  it("lets a family member see Family and Memorial items", () => {
    expect(canViewerSeeVisibility("family", "family")).toBe(true);
    expect(canViewerSeeVisibility("memorial", "family")).toBe(true);
  });
});

describe("canSetMemorialVisibility", () => {
  it("requires consent to have allowed memorial use (BR-031)", () => {
    expect(canSetMemorialVisibility({ memorialUseAllowed: false })).toBe(false);
    expect(canSetMemorialVisibility({ memorialUseAllowed: true })).toBe(true);
  });
});

// TC-023 — Consent ceiling (PRD BR-032)
describe("canChangeVisibility", () => {
  it("allows setting visibility for the first time", () => {
    expect(
      canChangeVisibility({
        currentVisibility: null,
        currentVisibilitySetBy: null,
        nextVisibility: "family",
        withFeaturedPerson: false,
      }),
    ).toBe(true);
  });

  it("blocks the steward from raising a Private item the featured person set, even after death", () => {
    const request = {
      currentVisibility: "private" as const,
      currentVisibilitySetBy: "featured_person" as const,
      nextVisibility: "family" as const,
      withFeaturedPerson: false,
    };
    expect(canChangeVisibility(request)).toBe(false);
  });

  it("allows the featured person themself to raise it", () => {
    expect(
      canChangeVisibility({
        currentVisibility: "private",
        currentVisibilitySetBy: "featured_person",
        nextVisibility: "family",
        withFeaturedPerson: true,
      }),
    ).toBe(true);
  });

  it("allows the steward to raise a Private item the steward themself set", () => {
    expect(
      canChangeVisibility({
        currentVisibility: "private",
        currentVisibilitySetBy: "steward",
        nextVisibility: "family",
        withFeaturedPerson: false,
      }),
    ).toBe(true);
  });

  it("always allows lowering visibility", () => {
    expect(
      canChangeVisibility({
        currentVisibility: "memorial",
        currentVisibilitySetBy: "featured_person",
        nextVisibility: "private",
        withFeaturedPerson: false,
      }),
    ).toBe(true);
  });
});
