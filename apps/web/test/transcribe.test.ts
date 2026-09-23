import { MockTranscriptionModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";

import { transcribeAudio } from "../src/ai/transcribe";

// TC-011 (integration, mock transcription): transcribeAudio maps the provider's segments into
// GUNITA's zero-indexed, seconds-based shape.
describe("transcribeAudio", () => {
  it("maps provider segments to indexed segments with seconds", async () => {
    const model = new MockTranscriptionModelV4({
      doGenerate: async () => ({
        text: "Noong bata pa ako, lumipat kami ng Maynila.",
        segments: [
          { text: "Noong bata pa ako,", startSecond: 0, endSecond: 1.8 },
          { text: "lumipat kami ng Maynila.", startSecond: 1.8, endSecond: 3.5 },
        ],
        language: "fil",
        durationInSeconds: 3.5,
        warnings: [],
        response: { timestamp: new Date(), modelId: "whisper-large-v3" },
      }),
    });

    const result = await transcribeAudio(model, new ArrayBuffer(0));

    expect(result.fullText).toBe("Noong bata pa ako, lumipat kami ng Maynila.");
    expect(result.durationSeconds).toBe(3.5);
    expect(result.segments).toEqual([
      { index: 0, text: "Noong bata pa ako,", startSeconds: 0, endSeconds: 1.8 },
      { index: 1, text: "lumipat kami ng Maynila.", startSeconds: 1.8, endSeconds: 3.5 },
    ]);
  });
});
