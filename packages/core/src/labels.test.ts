import { describe, expect, it } from "vitest";

import {
  ORIGIN_VALUES,
  REVIEW_STATE_VALUES,
  VISIBILITY_VALUES,
} from "./enums";
import { HINDI_PA_ALAM, ORIGIN_LABELS, REVIEW_STATE_LABELS, VISIBILITY_LABELS } from "./labels";

// F-015: badge labels exist for every enum value and carry both fil and en text (BR-014).
describe("labels", () => {
  it("has an origin label for every origin value", () => {
    for (const value of ORIGIN_VALUES) {
      expect(ORIGIN_LABELS[value].fil).toBeTruthy();
      expect(ORIGIN_LABELS[value].en).toBeTruthy();
    }
  });

  it("has a review-state label for every review state value", () => {
    for (const value of REVIEW_STATE_VALUES) {
      expect(REVIEW_STATE_LABELS[value].fil).toBeTruthy();
      expect(REVIEW_STATE_LABELS[value].en).toBeTruthy();
    }
  });

  it("has a visibility label for every visibility value", () => {
    for (const value of VISIBILITY_VALUES) {
      expect(VISIBILITY_LABELS[value].fil).toBeTruthy();
      expect(VISIBILITY_LABELS[value].en).toBeTruthy();
    }
  });

  it("keeps Hindi pa alam fixed in Filipino (BR-014)", () => {
    expect(HINDI_PA_ALAM).toBe("Hindi pa alam");
  });
});
