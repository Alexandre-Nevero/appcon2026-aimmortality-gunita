import { isVerbatimSubstring } from "./text";
import type { RecipeStepKind } from "./enums";

export interface RecipeStepQuantityInput {
  kind: RecipeStepKind;
  quantityVerbatim: string | null;
}

export interface RecipeStepQuantityResult {
  quantityVerbatim: string | null;
  flaggedForReview: boolean;
}

// Methods EQ-004 / PRD BR-013: a `measured` step's quantity is shown only if it appears verbatim
// (normalized) in a cited segment; otherwise it's removed and the step is flagged for review.
// `judgement` steps never show a quantity, no matter what was extracted. A `measured` step with no
// quantity extracted at all is also flagged — "measured" means a quantity/time/temperature was
// given (BR-013), so extraction producing none is itself a classification/extraction gap worth a
// reviewer's attention, not a silent pass.
export function checkRecipeStepQuantity(
  step: RecipeStepQuantityInput,
  citedSegmentTexts: string[],
): RecipeStepQuantityResult {
  if (step.kind === "judgement") {
    return { quantityVerbatim: null, flaggedForReview: false };
  }
  if (!step.quantityVerbatim) {
    return { quantityVerbatim: null, flaggedForReview: true };
  }
  const verified = isVerbatimSubstring(step.quantityVerbatim, citedSegmentTexts);
  return { quantityVerbatim: verified ? step.quantityVerbatim : null, flaggedForReview: !verified };
}
