import type { LanguageModel } from "ai";
import { generateObject } from "ai";
import { z } from "zod";

export const visionOutputSchema = z.object({
  visible: z.array(z.string()),
  missing: z.array(z.string()),
  questions: z.array(z.string()),
});

export type VisionOutput = z.infer<typeof visionOutputSchema>;

const VISION_PROMPT = `Describe what is visible in this photo and what context is missing about
it (who, where, when, why it mattered, any unreadable handwritten text). Then propose one or more
questions the family could answer to fill the gaps.

Never guess or state a person's name or identity from their face or appearance — you may describe
what is visible (e.g. "three people, outdoors, a handwritten date on the back") but names come only
from what a human already told you.`;

// System Design: photo -> Gemini vision -> {visible[], missing[], questions[]}, no names (BR-011).
export async function analyzePhoto(
  model: LanguageModel,
  image: ArrayBuffer,
  mediaType: string,
  knownContext?: string,
): Promise<VisionOutput> {
  const { object } = await generateObject({
    model,
    schema: visionOutputSchema,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: knownContext ? `${VISION_PROMPT}\n\nKnown context: ${knownContext}` : VISION_PROMPT },
          { type: "file", data: image, mediaType },
        ],
      },
    ],
  });
  return object;
}

// Title-Case word (or run of them) not at the very start of the string — a heuristic proxy for "the
// model stated a name," since legitimate descriptions rarely open with an unrelated proper noun.
const NAME_LIKE_PATTERN = /(?<!^)\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/g;

// PRD BR-011 / TC-016: a model output containing a proper name not in the known context or people
// list is dropped — the AI never assigns identity, only a human answer does. Applied to every
// field, since BR-011 is a blanket rule, not just for questions/missing.
export function sanitizeVisionOutput(output: VisionOutput, knownNames: string[]): VisionOutput {
  const known = new Set(knownNames.map((name) => name.toLowerCase()));
  const isSafe = (line: string): boolean => {
    const matches = line.matchAll(NAME_LIKE_PATTERN);
    for (const [, candidate] of matches) {
      if (!known.has(candidate.toLowerCase())) return false;
    }
    return true;
  };
  return {
    visible: output.visible.filter(isSafe),
    missing: output.missing.filter(isSafe),
    questions: output.questions.filter(isSafe),
  };
}
