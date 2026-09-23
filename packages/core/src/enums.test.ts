import { describe, expect, it } from "vitest";

import { ASK_OUTCOME_VALUES, VISIBILITY_VALUES, visibilitySchema } from "./enums";

describe("enums", () => {
  it("keeps the frozen visibility contract (docs/implementation-plan.md §0.1)", () => {
    expect(VISIBILITY_VALUES).toEqual(["private", "family", "memorial"]);
  });

  it("rejects a value outside the visibility contract", () => {
    expect(() => visibilitySchema.parse("public")).toThrow();
  });

  it("matches the ask_answered event outcomes (docs/user-flow.md §6)", () => {
    expect(ASK_OUTCOME_VALUES).toEqual(["answered", "abstained", "refused", "error"]);
  });
});
