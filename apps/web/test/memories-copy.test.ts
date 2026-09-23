import { describe, expect, it } from "vitest";

import { MEMORIES_COPY, position, tributeCountLabel } from "../src/components/memories/copy";

describe("photo memories copy (BR-014)", () => {
  it("has fil and en for every string", () => {
    for (const label of Object.values(MEMORIES_COPY)) {
      expect(label.fil).toBeTruthy();
      expect(label.en).toBeTruthy();
    }
  });

  it("shows nothing for zero tributes so no photo looks unloved (BR-081)", () => {
    expect(tributeCountLabel(0, "en")).toBe("");
    expect(tributeCountLabel(0, "fil")).toBe("");
  });

  it("counts tributes gently in both languages (EQ-013)", () => {
    expect(tributeCountLabel(1, "en")).toBe("1 person remembered this");
    expect(tributeCountLabel(12, "en")).toBe("12 people remembered this");
    expect(tributeCountLabel(12, "fil")).toBe("12 ang nakaalala");
  });

  it("shows a 1-based position", () => {
    expect(position(0, 5)).toBe("1 / 5");
  });
});
