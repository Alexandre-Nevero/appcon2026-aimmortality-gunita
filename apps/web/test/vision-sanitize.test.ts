import { describe, expect, it } from "vitest";

import { sanitizeVisionOutput } from "../src/ai/vision";

// TC-016 — Photo analysis never names people (PRD BR-011)
describe("sanitizeVisionOutput", () => {
  it("drops a missing/question entry containing a name not in the known list", () => {
    const output = {
      visible: ["three people, outdoors, a handwritten date on the back"],
      missing: ["Who is Juan Dela Cruz in this photo?", "When was this taken?"],
      questions: ["Ask about Juan Dela Cruz", "What's the occasion?"],
    };
    const result = sanitizeVisionOutput(output, []);
    expect(result.missing).toEqual(["When was this taken?"]);
    expect(result.questions).toEqual(["What's the occasion?"]);
    // Still lists visible content and at least one question, per TC-016.
    expect(result.visible.length).toBeGreaterThan(0);
    expect(result.questions.length).toBeGreaterThan(0);
  });

  it("keeps an entry naming someone already in the known people/context list", () => {
    const output = {
      visible: ["Lola Nena standing beside a car"],
      missing: [],
      questions: ["Where was this photo of Lola Nena taken?"],
    };
    const result = sanitizeVisionOutput(output, ["Lola Nena"]);
    expect(result.questions).toEqual(["Where was this photo of Lola Nena taken?"]);
  });

  it("passes through descriptions with no proper names", () => {
    const output = {
      visible: ["three people, outdoors"],
      missing: ["No date visible"],
      questions: ["What year was this?"],
    };
    expect(sanitizeVisionOutput(output, [])).toEqual(output);
  });
});
