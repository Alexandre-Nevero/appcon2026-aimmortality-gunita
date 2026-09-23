import { describe, expect, it } from "vitest";

import { formatItemDate } from "./dates";

// TC-013 — Dates verbatim with precision (Methods EQ-005)
describe("formatItemDate", () => {
  it("renders an approximate date with a c. prefix", () => {
    expect(formatItemDate({ text: "1972", precision: "approximate" })).toBe("c. 1972");
  });

  it("renders an exact date verbatim", () => {
    expect(formatItemDate({ text: "March 1972", precision: "exact" })).toBe("March 1972");
  });

  it("renders nothing for an unknown date", () => {
    expect(formatItemDate({ text: "", precision: "unknown" })).toBeNull();
  });
});
