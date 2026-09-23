import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { DEFAULT_FIXTURE_PATH, familyFixture } from "../src/db/seed-fixture";

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
});
