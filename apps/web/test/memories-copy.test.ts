import { describe, expect, it } from "vitest";

import { MEMORIES_COPY, position } from "../src/components/memories/copy";

describe("photo memories copy (BR-014)", () => {
  it("has fil and en for every string", () => {
    for (const label of Object.values(MEMORIES_COPY)) {
      expect(label.fil).toBeTruthy();
      expect(label.en).toBeTruthy();
    }
  });

  it("does not ship a tribute-count string (ADR-008)", () => {
    const copy = JSON.stringify(MEMORIES_COPY);
    expect(copy).not.toContain("remembered this");
    expect(copy).not.toContain("nakaalala");
  });

  it("shows a 1-based position", () => {
    expect(position(0, 5)).toBe("1 / 5");
  });
});
