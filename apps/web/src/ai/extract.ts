import {
  checkRecipeStepQuantity,
  datePrecisionSchema,
  itemTypeSchema,
  recipeStepKindSchema,
} from "@gunita/core";
import type { LanguageModel } from "ai";
import { generateObject } from "ai";
import { z } from "zod";

const recipeStepFixtureSchema = z.object({
  index: z.number().int().min(0),
  kind: recipeStepKindSchema,
  text: z.string(),
  quantityVerbatim: z.string().nullable().optional(),
  segmentIndexes: z.array(z.number().int().min(0)),
});

// Mirrors System Design's extraction JSON exactly: items reference segments by index into the
// source's own segment list (`segmentIndexes`), not by DB id — the caller resolves indexes to real
// `source_segment.id`s once validation (below) passes.
const extractedItemSchema = z.object({
  type: itemTypeSchema,
  title: z.string(),
  body: z.string(),
  segmentIndexes: z.array(z.number().int().min(0)),
  people: z.array(z.string()).default([]),
  places: z.array(z.string()).default([]),
  dates: z.array(z.object({ text: z.string(), precision: datePrecisionSchema })).default([]),
  recipeSteps: z.array(recipeStepFixtureSchema).default([]),
});

export const extractionResultSchema = z.object({ items: z.array(extractedItemSchema) });

export type ExtractedItem = z.infer<typeof extractedItemSchema>;
export type ExtractionResult = z.infer<typeof extractionResultSchema>;

export interface ExtractionSegment {
  index: number;
  text: string;
}

const EXTRACTION_PROMPT = `Extract memory items (story, recipe, tradition, lesson, fact) from these
transcript segments. Every item and every recipe step must cite the segmentIndexes it came from —
never state something the segments don't support. Recipe steps are "measured" (a quantity, time, or
temperature given verbatim in a segment) or "judgement" (a call made by smell, feel, look, or
taste) — a judgement step never gets an invented quantity. Dates are copied verbatim with a
precision (exact/approximate/unknown), never computed.`;

// System Design: Groq gpt-oss-120b (fallback Gemini) strict JSON schema. `model` is injected so
// tests can pass `MockLanguageModelV4` (ai/test) instead of a live provider.
export async function extractItems(
  model: LanguageModel,
  segments: ExtractionSegment[],
): Promise<ExtractionResult> {
  const segmentsText = segments.map((s) => `[${s.index}] ${s.text}`).join("\n");
  const { object } = await generateObject({
    model,
    schema: extractionResultSchema,
    prompt: `${EXTRACTION_PROMPT}\n\nSegments:\n${segmentsText}`,
  });
  return object;
}

export interface ValidatedRecipeStep {
  index: number;
  kind: ExtractedItem["recipeSteps"][number]["kind"];
  text: string;
  quantityVerbatim: string | null;
  segmentIndexes: number[];
}

export interface ValidatedItem extends Omit<ExtractedItem, "recipeSteps"> {
  recipeSteps: ValidatedRecipeStep[];
}

// System Design server validation (Methods EQ-004–EQ-006): segment indexes must exist; recipe
// quantities must appear verbatim in their cited segments (EQ-004, packages/core). An item with no
// surviving citation anywhere is dropped entirely — every item must stay linked to its source
// (F-007), so an item with zero real citations is a hallucination, not a demotable claim.
export function validateExtractedItems(
  result: ExtractionResult,
  segments: ExtractionSegment[],
): ValidatedItem[] {
  const availableIndexes = new Set(segments.map((s) => s.index));
  const textByIndex = new Map(segments.map((s) => [s.index, s.text]));

  const validated: ValidatedItem[] = [];
  for (const item of result.items) {
    const segmentIndexes = item.segmentIndexes.filter((i) => availableIndexes.has(i));

    const recipeSteps: ValidatedRecipeStep[] = item.recipeSteps.map((step) => {
      const stepSegmentIndexes = step.segmentIndexes.filter((i) => availableIndexes.has(i));
      const citedTexts = stepSegmentIndexes.map((i) => textByIndex.get(i)!);
      const quantityCheck = checkRecipeStepQuantity(
        { kind: step.kind, quantityVerbatim: step.quantityVerbatim ?? null },
        citedTexts,
      );
      return {
        index: step.index,
        kind: step.kind,
        text: step.text,
        quantityVerbatim: quantityCheck.quantityVerbatim,
        segmentIndexes: stepSegmentIndexes,
      };
    });

    const hasAnyCitation =
      segmentIndexes.length > 0 || recipeSteps.some((step) => step.segmentIndexes.length > 0);
    if (!hasAnyCitation) continue;

    validated.push({ ...item, segmentIndexes, recipeSteps });
  }
  return validated;
}
