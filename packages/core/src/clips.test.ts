import { describe, expect, it } from "vitest";

import { computeClipSpan } from "./clips";

// TC-014 — Clip span from segments (Methods EQ-006)
describe("computeClipSpan", () => {
  it("pads 0.3s around the min start and max end of the cited segments", () => {
    const span = computeClipSpan([
      { startSeconds: 12.4, endSeconds: 15.0 },
      { startSeconds: 15.0, endSeconds: 18.2 },
    ]);
    expect(span.start).toBeCloseTo(12.1);
    expect(span.end).toBeCloseTo(18.5);
  });

  it("clamps the start at 0", () => {
    const span = computeClipSpan([{ startSeconds: 0.1, endSeconds: 1 }]);
    expect(span.start).toBe(0);
  });

  it("clamps the end at the source duration", () => {
    const span = computeClipSpan([{ startSeconds: 10, endSeconds: 19.9 }], {
      durationSeconds: 20,
    });
    expect(span.end).toBe(20);
  });
});
