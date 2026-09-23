import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";

import { extractItems } from "../src/ai/extract";

// TC-011 (integration, mock LLM fixture): extractItems calls generateObject against the strict
// schema and returns items citing real segment indexes.
describe("extractItems", () => {
  it("parses a structured extraction response into typed items", async () => {
    const payload = {
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

    const model = new MockLanguageModelV4({
      doGenerate: {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
          outputTokens: { total: 10, text: 10, reasoning: undefined },
        },
        warnings: [],
      },
    });

    const result = await extractItems(model, [
      { index: 0, text: "Noong bata pa ako, lumipat kami ng Maynila." },
    ]);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe("Paglipat sa Maynila");
    expect(result.items[0].segmentIndexes).toEqual([0]);
  });
});
