import { describe, expect, it } from "vitest";

import { checkRecipeStepQuantity } from "./recipe";

// TC-012 — Recipe quantity only if verbatim (Methods EQ-004)
describe("checkRecipeStepQuantity", () => {
  it("keeps a measured quantity present in the cited segments", () => {
    const result = checkRecipeStepQuantity(
      { kind: "measured", quantityVerbatim: "1 tasa ng suka" },
      ["Maglagay ng 1 tasa ng suka sa kaldero."],
    );
    expect(result).toEqual({ quantityVerbatim: "1 tasa ng suka", flaggedForReview: false });
  });

  it("removes and flags an invented quantity not found in the segments", () => {
    const result = checkRecipeStepQuantity(
      { kind: "measured", quantityVerbatim: "2 tbsp" },
      ["Maglagay ng suka hanggang sa gusto mo."],
    );
    expect(result).toEqual({ quantityVerbatim: null, flaggedForReview: true });
  });

  it("never shows a quantity for a judgement step, even if one was extracted", () => {
    const result = checkRecipeStepQuantity(
      { kind: "judgement", quantityVerbatim: "1 cup" },
      ["1 cup"],
    );
    expect(result).toEqual({ quantityVerbatim: null, flaggedForReview: false });
  });
});
