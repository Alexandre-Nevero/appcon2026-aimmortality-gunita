import { describe, expect, it } from "vitest";

import { validateExtractedItems, type ExtractionResult } from "../src/ai/extract";

const segments = [
  { index: 0, text: "Noong bata pa ako, lumipat kami ng Maynila." },
  { index: 1, text: "Maglagay ng 1 tasa ng suka sa kaldero." },
];

// TC-011 — extraction cites existing segment IDs (PRD BR-010, F-006)
describe("validateExtractedItems", () => {
  it("keeps an item whose segment citations exist", () => {
    const result: ExtractionResult = {
      items: [
        {
          type: "story",
          title: "Paglipat sa Maynila",
          body: "Lumipat sila ng Maynila noong bata pa siya.",
          segmentIndexes: [0],
          people: [],
          places: ["Maynila"],
          dates: [],
          recipeSteps: [],
        },
      ],
    };
    const validated = validateExtractedItems(result, segments);
    expect(validated).toHaveLength(1);
    expect(validated[0].segmentIndexes).toEqual([0]);
  });

  it("drops a citation to a segment index that doesn't exist, keeping any valid ones", () => {
    const result: ExtractionResult = {
      items: [
        {
          type: "story",
          title: "Paglipat sa Maynila",
          body: "...",
          segmentIndexes: [0, 99],
          people: [],
          places: [],
          dates: [],
          recipeSteps: [],
        },
      ],
    };
    const validated = validateExtractedItems(result, segments);
    expect(validated[0].segmentIndexes).toEqual([0]);
  });

  it("drops the whole item when it cites no real segment anywhere", () => {
    const result: ExtractionResult = {
      items: [
        {
          type: "fact",
          title: "Invented",
          body: "...",
          segmentIndexes: [42],
          people: [],
          places: [],
          dates: [],
          recipeSteps: [],
        },
      ],
    };
    expect(validateExtractedItems(result, segments)).toHaveLength(0);
  });

  it("strips an invented recipe quantity via the shared verbatim check (Methods EQ-004)", () => {
    const result: ExtractionResult = {
      items: [
        {
          type: "recipe",
          title: "Adobo",
          body: "...",
          segmentIndexes: [1],
          people: [],
          places: [],
          dates: [],
          recipeSteps: [
            {
              index: 0,
              kind: "measured",
              text: "Add vinegar",
              quantityVerbatim: "2 tbsp",
              segmentIndexes: [1],
            },
          ],
        },
      ],
    };
    const validated = validateExtractedItems(result, segments);
    expect(validated[0].recipeSteps[0].quantityVerbatim).toBeNull();
  });

  it("keeps a recipe quantity that appears verbatim in its cited segment", () => {
    const result: ExtractionResult = {
      items: [
        {
          type: "recipe",
          title: "Adobo",
          body: "...",
          segmentIndexes: [1],
          people: [],
          places: [],
          dates: [],
          recipeSteps: [
            {
              index: 0,
              kind: "measured",
              text: "Add vinegar",
              quantityVerbatim: "1 tasa ng suka",
              segmentIndexes: [1],
            },
          ],
        },
      ],
    };
    const validated = validateExtractedItems(result, segments);
    expect(validated[0].recipeSteps[0].quantityVerbatim).toBe("1 tasa ng suka");
  });
});
