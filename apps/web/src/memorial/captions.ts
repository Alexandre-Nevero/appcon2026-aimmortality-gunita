import type { LanguageModel } from "ai";
import { APICallError, generateObject } from "ai";
import { z } from "zod";

import type { db as Database } from "../db";
import { aiCall } from "../db/schema";

type Db = typeof Database;

const captionResultSchema = z.object({
  caption: z.string().trim().min(1).max(140),
});

const PRIMARY_CAPTION_MODEL = process.env.MODEL_TEXT ?? "openai/gpt-oss-120b";
const FALLBACK_CAPTION_MODEL = process.env.MODEL_TEXT_FALLBACK ?? "gemini-2.5-flash-lite";

const CAPTION_PROMPT = `Write one short memorial card caption in third person.

Rules:
- at most 140 characters
- use only the provided reviewed details
- keep the same language as the reviewed item
- do not invent names, dates, places, or feelings
- never speak as the person
- do not use quotation marks unless the text is already a verbatim quote`;

async function logAiCall(
  db: Db,
  input: {
    spaceId: string;
    itemId: string | null;
    provider: "groq" | "gemini";
    model: string;
    startedAt: number;
    usage?: { inputTokens?: number; outputTokens?: number };
    error?: unknown;
  },
) {
  const errorMessage =
    input.error instanceof Error
      ? `${input.error.name}: ${input.error.message}`
      : input.error != null
        ? String(input.error)
        : undefined;

  await db.insert(aiCall).values({
    spaceId: input.spaceId,
    itemId: input.itemId ?? undefined,
    purpose: "caption",
    provider: input.provider,
    model: input.model,
    status: input.error ? "error" : "ok",
    latencyMs: Date.now() - input.startedAt,
    inputTokens: input.usage?.inputTokens,
    outputTokens: input.usage?.outputTokens,
    errorMessage,
  });
}

async function generateCaptionOnce(
  db: Db,
  input: {
    model: LanguageModel;
    provider: "groq" | "gemini";
    modelName: string;
    spaceId: string;
    itemId: string | null;
    prompt: string;
  },
) {
  const startedAt = Date.now();
  try {
    const { object, usage } = await generateObject({
      model: input.model,
      schema: captionResultSchema,
      prompt: `${CAPTION_PROMPT}\n\n${input.prompt}`,
    });
    await logAiCall(db, {
      spaceId: input.spaceId,
      itemId: input.itemId,
      provider: input.provider,
      model: input.modelName,
      startedAt,
      usage,
    });
    return object.caption;
  } catch (error) {
    await logAiCall(db, {
      spaceId: input.spaceId,
      itemId: input.itemId,
      provider: input.provider,
      model: input.modelName,
      startedAt,
      error,
    });
    throw error;
  }
}

export async function generateMemorialCaption(
  db: Db,
  input: {
    primaryModel: LanguageModel;
    fallbackModel: LanguageModel;
    spaceId: string;
    itemId: string | null;
    prompt: string;
  },
): Promise<string> {
  try {
    return await generateCaptionOnce(db, {
      model: input.primaryModel,
      provider: "groq",
      modelName: PRIMARY_CAPTION_MODEL,
      spaceId: input.spaceId,
      itemId: input.itemId,
      prompt: input.prompt,
    });
  } catch (error) {
    if (APICallError.isInstance(error) && error.isRetryable) {
      return generateCaptionOnce(db, {
        model: input.fallbackModel,
        provider: "gemini",
        modelName: FALLBACK_CAPTION_MODEL,
        spaceId: input.spaceId,
        itemId: input.itemId,
        prompt: input.prompt,
      });
    }
    throw error;
  }
}
