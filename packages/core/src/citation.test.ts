import { describe, expect, it } from "vitest";

import { keepSentence, stripUnverifiedQuotes } from "./citation";

// TC-030 — Citation validation (Methods EQ-003)
describe("keepSentence", () => {
  const candidates = ["item-1", "item-2"];

  it("drops a sentence with no cited items", () => {
    expect(keepSentence([], candidates)).toBe(false);
  });

  it("drops a sentence citing an item outside the candidate set", () => {
    expect(keepSentence(["item-1", "item-99"], candidates)).toBe(false);
  });

  it("keeps a sentence whose citations are all in the candidate set", () => {
    expect(keepSentence(["item-1", "item-2"], candidates)).toBe(true);
  });
});

// TC-031 — Quote check (PRD BR-024)
describe("stripUnverifiedQuotes", () => {
  it("keeps quotation marks when the quoted text is verbatim in a cited source", () => {
    const text = 'She said "hindi pa ito luto" during the interview.';
    const result = stripUnverifiedQuotes(text, ["Sabi niya, hindi pa ito luto, balik ka mamaya."]);
    expect(result).toBe(text);
  });

  it("strips quotation marks when the quoted text isn't found in any cited source", () => {
    const text = 'She said "the secret ingredient is love" during the interview.';
    const result = stripUnverifiedQuotes(text, ["Sabi niya, hindi pa ito luto, balik ka mamaya."]);
    expect(result).toBe("She said the secret ingredient is love during the interview.");
  });
});
