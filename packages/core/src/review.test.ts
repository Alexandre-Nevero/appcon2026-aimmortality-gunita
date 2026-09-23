import { describe, expect, it } from "vitest";

import { reviewTransition } from "./review";

// TC-020 — Review transitions (PRD BR-020, BR-021)
describe("reviewTransition", () => {
  it("maps each action to its PRD state", () => {
    expect(reviewTransition("ai_suggestion", "confirm")).toBe("verified");
    expect(reviewTransition("ai_suggestion", "correct")).toBe("corrected");
    expect(reviewTransition("ai_suggestion", "reject")).toBe("rejected");
    expect(reviewTransition("ai_suggestion", "uncertain")).toBe("uncertain");
    expect(reviewTransition("ai_suggestion", "dispute", { note: "Hindi ito tama" })).toBe(
      "disputed",
    );
  });

  it("rejects a dispute with no note", () => {
    expect(() => reviewTransition("ai_suggestion", "dispute")).toThrow(/note/i);
    expect(() => reviewTransition("ai_suggestion", "dispute", { note: "   " })).toThrow(/note/i);
  });

  it("allows re-reviewing an already-reviewed item into another state", () => {
    expect(reviewTransition("verified", "correct")).toBe("corrected");
    expect(reviewTransition("disputed", "confirm")).toBe("verified");
  });
});
