import type { ReviewAction, ReviewState } from "./enums";

const REVIEW_ACTION_RESULT: Record<ReviewAction, ReviewState> = {
  confirm: "verified",
  correct: "corrected",
  reject: "rejected",
  dispute: "disputed",
  uncertain: "uncertain",
};

// PRD BR-020: any reviewed item can be re-reviewed into another state, so `state` doesn't
// currently constrain the result — kept as a parameter to match System Design's documented call
// (`core.reviewTransition(state, action)`) and to leave room for a future restriction without
// changing the signature again. Dispute always requires a note, regardless of current state.
export function reviewTransition(
  _state: ReviewState,
  action: ReviewAction,
  opts: { note?: string } = {},
): ReviewState {
  if (action === "dispute" && !opts.note?.trim()) {
    throw new Error("Dispute requires a note (BR-020)");
  }
  return REVIEW_ACTION_RESULT[action];
}
