import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { DEFAULT_FIXTURE_PATH, familyFixture } from "../src/db/seed-fixture";

// Mirrors packages/core's normalize+substring check (Methods EQ-004). Duplicated instead of
// imported: that module is TASK-003's, which branches *from* this task, not the reverse.
function isVerbatimSubstring(candidate: string, sourceTexts: string[]): boolean {
  const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();
  const needle = normalize(candidate);
  return sourceTexts.some((source) => normalize(source).includes(needle));
}

describe("seed/data/family.json", () => {
  it("matches the loader's fixture schema", async () => {
    const raw = JSON.parse(await readFile(DEFAULT_FIXTURE_PATH, "utf-8"));
    const fixture = familyFixture.parse(raw);

    expect(fixture.people.some((p) => p.isFeatured)).toBe(true);
    expect(fixture.memberships.length).toBeGreaterThan(0);
  });

  it("only lets items and recipe steps cite segments that exist on their own source", async () => {
    const raw = JSON.parse(await readFile(DEFAULT_FIXTURE_PATH, "utf-8"));
    const fixture = familyFixture.parse(raw);

    const segmentIndexesBySourceKey = new Map(
      fixture.sources.map((s) => [s.key, new Set(s.segments.map((seg) => seg.index))]),
    );

    for (const item of fixture.items) {
      const validIndexes = segmentIndexesBySourceKey.get(item.sourceKey);
      expect(validIndexes, `item cites unknown source "${item.sourceKey}"`).toBeDefined();
      for (const idx of item.segmentIndexes) {
        expect(validIndexes!.has(idx), `item cites unknown segment ${item.sourceKey}:${idx}`).toBe(
          true,
        );
      }
      for (const step of item.recipeSteps) {
        for (const idx of step.segmentIndexes) {
          expect(
            validIndexes!.has(idx),
            `recipe step cites unknown segment ${item.sourceKey}:${idx}`,
          ).toBe(true);
        }
      }
    }
  });

  it("only carries a recipe quantity that's actually verbatim in its cited segments (EQ-004)", async () => {
    const raw = JSON.parse(await readFile(DEFAULT_FIXTURE_PATH, "utf-8"));
    const fixture = familyFixture.parse(raw);

    const segmentTextsBySourceKey = new Map(
      fixture.sources.map((s) => [s.key, new Map(s.segments.map((seg) => [seg.index, seg.text]))]),
    );

    for (const item of fixture.items) {
      const textByIndex = segmentTextsBySourceKey.get(item.sourceKey)!;
      for (const step of item.recipeSteps) {
        if (step.kind !== "measured" || !step.quantityVerbatim) continue;
        const citedTexts = step.segmentIndexes.map((idx) => textByIndex.get(idx)!);
        expect(
          isVerbatimSubstring(step.quantityVerbatim, citedTexts),
          `"${step.quantityVerbatim}" isn't verbatim in any segment cited by ${item.sourceKey} step ${step.index}`,
        ).toBe(true);
      }
    }
  });
});
