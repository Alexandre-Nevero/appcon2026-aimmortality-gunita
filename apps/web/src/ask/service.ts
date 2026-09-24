import {
  HINDI_PA_ALAM,
  containsFirstPersonAsSubject,
  keepSentence,
  matchesRoleplayRequest,
  stripUnverifiedQuotes,
  type Locale,
  type MembershipRole,
  type Origin,
  type ReviewState,
} from "@gunita/core";
import type { LanguageModel } from "ai";
import { APICallError, generateObject } from "ai";
import { and, asc, cosineDistance, eq, inArray, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { archiveReviewStateFilter, visibilityFilter } from "../access/visibility";
import { embedText } from "../ai/embed";
import type { db as Database } from "../db";
import { aiCall, event, item, person, source, sourceSegment, space } from "../db/schema";

type Db = typeof Database;
type AskModels = Pick<typeof import("../ai/models").models, "embed" | "text" | "textFallback">;
type GeneratedAskResult = z.infer<typeof askModelResultSchema>;
type AiCallProvider = "groq" | "gemini";

class AskUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "AskUnavailableError";
    if (options && "cause" in options) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

const DEFAULT_ASK_TOP_K = 8;
const DEFAULT_ASK_TAU = 0.6;
const PRIMARY_MODEL_ID = process.env.MODEL_TEXT ?? "openai/gpt-oss-120b";
const FALLBACK_MODEL_ID = process.env.MODEL_TEXT_FALLBACK ?? "gemini-2.5-flash-lite";
const REFUSAL_FIL =
  "Hindi puwedeng magpanggap o magsalita bilang siya. Maibabahagi ko lang ang talagang naitala niya o ng pamilya.";
const REFUSAL_EN =
  "I can't pretend to be them or speak in their voice. I can only share what they or the family actually recorded.";
const ANSWER_ERROR_FIL = "Hindi masagot ngayon. Pakisubukang muli.";
const ANSWER_ERROR_EN = "Couldn't answer right now. Please try again.";
const ABSTAIN_REASON_FIL = "Wala pang naitalang sagot sa archive.";
const ABSTAIN_REASON_EN = "This question is not yet answered in the archive.";

export const askRequestSchema = z.object({
  question: z.string().trim().min(1).max(500),
});

const askSentenceSchema = z.object({
  text: z.string().trim().min(1),
  itemIds: z.array(z.string().trim().min(1)).default([]),
});

export const askModelResultSchema = z.object({
  refusal: z.string().trim().min(1).optional(),
  sentences: z.array(askSentenceSchema).default([]),
  unsupportedParts: z.array(z.string().trim().min(1)).default([]),
});

export interface AskSegment {
  id: string;
  text: string;
  startSeconds: number | null;
  endSeconds: number | null;
}

export interface AskCandidateSource {
  id: string;
  type: "audio" | "text" | "photo" | "document";
  blobPathname: string;
  mimeType: string;
  contributorDisplayName: string | null;
  contributorRelationship: string | null;
}

export interface AskCandidate {
  id: string;
  title: string;
  body: string;
  origin: Origin;
  reviewState: ReviewState;
  similarity: number;
  segmentIds: string[];
  source: AskCandidateSource;
  segments: AskSegment[];
}

export interface AskAnswerSentence {
  text: string;
  itemIds: string[];
}

export interface AskEvidenceCard {
  itemId: string;
  title: string;
  body: string;
  origin: Origin;
  reviewState: ReviewState;
  source: AskCandidateSource;
  segments: AskSegment[];
}

export interface AskEvidenceGroups {
  fromThem: AskEvidenceCard[];
  othersRemember: AskEvidenceCard[];
}

export interface AskQuestionDraft {
  text: string;
  locale: Locale;
  reason: string;
  originKind: "ask_abstain";
}

export interface AskOutcomePayload {
  outcome: "answered" | "abstained" | "refused" | "error";
  text: string;
  sentences: AskAnswerSentence[];
  unsupportedParts: string[];
  abstentionText: string | null;
  evidenceGroups: AskEvidenceGroups;
  canAddQuestion: boolean;
  questionDraft: AskQuestionDraft | null;
}

export interface AskSpaceQuestionInput {
  spaceId: string;
  membershipId: string;
  membershipRole: MembershipRole;
  locale: Locale;
  lifecycleMode: "during" | "memorial";
  featuredName: string | null;
  question: string;
}

interface ValidatedGeneratedAnswer {
  sentences: AskAnswerSentence[];
  unsupportedParts: string[];
  evidenceGroups: AskEvidenceGroups;
  hasFirstPersonAsSubject: boolean;
}

type GenerateAnswerFn = (
  correction?: string,
) => Promise<{ result: GeneratedAskResult }>;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseUnitInterval(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
}

function getAskTopK(): number {
  return parsePositiveInt(process.env.ASK_TOP_K, DEFAULT_ASK_TOP_K);
}

function getAskTau(): number {
  return parseUnitInterval(process.env.ASK_TAU, DEFAULT_ASK_TAU);
}

function refusalCopy(locale: Locale): string {
  return locale === "fil" ? REFUSAL_FIL : REFUSAL_EN;
}

function errorCopy(locale: Locale): string {
  return locale === "fil" ? ANSWER_ERROR_FIL : ANSWER_ERROR_EN;
}

function abstainReason(locale: Locale): string {
  return locale === "fil" ? ABSTAIN_REASON_FIL : ABSTAIN_REASON_EN;
}

function buildQuestionDraft(
  question: string,
  locale: Locale,
  lifecycleMode: "during" | "memorial",
): AskQuestionDraft | null {
  if (lifecycleMode !== "during") {
    return null;
  }

  return {
    text: question,
    locale,
    reason: abstainReason(locale),
    originKind: "ask_abstain",
  };
}

function emptyEvidenceGroups(): AskEvidenceGroups {
  return { fromThem: [], othersRemember: [] };
}

function buildEvidenceGroups(
  candidateMap: Map<string, AskCandidate>,
  citedItemIds: string[],
): AskEvidenceGroups {
  const seen = new Set<string>();
  const groups = emptyEvidenceGroups();

  for (const itemId of citedItemIds) {
    if (seen.has(itemId)) continue;
    seen.add(itemId);

    const candidate = candidateMap.get(itemId);
    if (!candidate) continue;

    const card: AskEvidenceCard = {
      itemId: candidate.id,
      title: candidate.title,
      body: candidate.body,
      origin: candidate.origin,
      reviewState: candidate.reviewState,
      source: candidate.source,
      segments: candidate.segments,
    };

    if (candidate.origin === "from_them") {
      groups.fromThem.push(card);
    } else {
      groups.othersRemember.push(card);
    }
  }

  return groups;
}

export function validateGeneratedAnswer(
  result: GeneratedAskResult,
  candidates: AskCandidate[],
): ValidatedGeneratedAnswer {
  const candidateIds = new Set(candidates.map((candidate) => candidate.id));
  const candidateMap = new Map(candidates.map((candidate) => [candidate.id, candidate]));

  const sentences: AskAnswerSentence[] = [];
  const citedItemIds: string[] = [];

  for (const sentence of result.sentences) {
    if (!keepSentence(sentence.itemIds, candidateIds)) continue;

    const citedTexts = sentence.itemIds.flatMap((itemId) =>
      candidateMap.get(itemId)?.segments.map((segment) => segment.text) ?? [],
    );
    const text = stripUnverifiedQuotes(sentence.text, citedTexts).trim();

    if (!text) continue;

    sentences.push({ text, itemIds: sentence.itemIds });
    citedItemIds.push(...sentence.itemIds);
  }

  return {
    sentences,
    unsupportedParts: result.unsupportedParts.map((part) => part.trim()).filter(Boolean),
    evidenceGroups: buildEvidenceGroups(candidateMap, citedItemIds),
    hasFirstPersonAsSubject: containsFirstPersonAsSubject(
      sentences.map((sentence) => sentence.text).join(" "),
    ),
  };
}

function answeredPayload(
  text: string,
  validated: ValidatedGeneratedAnswer,
): AskOutcomePayload {
  return {
    outcome: "answered",
    text,
    sentences: validated.sentences,
    unsupportedParts: validated.unsupportedParts,
    abstentionText: validated.unsupportedParts.length > 0 ? HINDI_PA_ALAM : null,
    evidenceGroups: validated.evidenceGroups,
    canAddQuestion: false,
    questionDraft: null,
  };
}

function abstainedPayload(
  question: string,
  locale: Locale,
  lifecycleMode: "during" | "memorial",
): AskOutcomePayload {
  const questionDraft = buildQuestionDraft(question, locale, lifecycleMode);
  return {
    outcome: "abstained",
    text: HINDI_PA_ALAM,
    sentences: [],
    unsupportedParts: [],
    abstentionText: HINDI_PA_ALAM,
    evidenceGroups: emptyEvidenceGroups(),
    canAddQuestion: questionDraft != null,
    questionDraft,
  };
}

function refusedPayload(locale: Locale): AskOutcomePayload {
  return {
    outcome: "refused",
    text: refusalCopy(locale),
    sentences: [],
    unsupportedParts: [],
    abstentionText: null,
    evidenceGroups: emptyEvidenceGroups(),
    canAddQuestion: false,
    questionDraft: null,
  };
}

function errorPayload(locale: Locale): AskOutcomePayload {
  return {
    outcome: "error",
    text: errorCopy(locale),
    sentences: [],
    unsupportedParts: [],
    abstentionText: null,
    evidenceGroups: emptyEvidenceGroups(),
    canAddQuestion: false,
    questionDraft: null,
  };
}

function buildPrompt(
  question: string,
  locale: Locale,
  featuredName: string | null,
  candidates: AskCandidate[],
  correction: string | undefined,
): string {
  const answerLanguage =
    locale === "fil"
      ? "Filipino or Taglish, with respectful wording when natural."
      : "English.";
  const personLabel = featuredName ?? "the featured person";
  const correctionBlock = correction
    ? `\nAdditional correction from validation: ${correction}`
    : "";
  const candidateBlocks = candidates
    .map((candidate) => {
      const contributor =
        candidate.source.contributorDisplayName || candidate.source.contributorRelationship
          ? ` contributor=${candidate.source.contributorDisplayName ?? "unknown"} (${candidate.source.contributorRelationship ?? "unknown relationship"})`
          : "";
      const segments =
        candidate.segments.length === 0
          ? "  Source excerpts: none"
          : [
              "  Source excerpts:",
              ...candidate.segments.map((segment) => {
                const timing =
                  segment.startSeconds == null && segment.endSeconds == null
                    ? ""
                    : ` (${segment.startSeconds ?? "?"}-${segment.endSeconds ?? "?"}s)`;
                return `  - [${segment.id}]${timing} ${segment.text}`;
              }),
            ].join("\n");

      return [
        `Item ${candidate.id}`,
        `  Origin: ${candidate.origin}`,
        `  Review state: ${candidate.reviewState}`,
        `  Source type: ${candidate.source.type}${contributor}`,
        `  Title: ${candidate.title}`,
        `  Body: ${candidate.body}`,
        segments,
      ].join("\n");
    })
    .join("\n\n");

  return `You are answering a family question about ${personLabel} using only the provided reviewed archive items.

Return JSON matching this schema:
- refusal?: short explanation when the request asks for role-play, voice mimicry, or an unrecorded opinion.
- sentences: supported answer sentences only; each sentence must cite one or more itemIds from the provided candidates.
- unsupportedParts: short unsupported sub-parts, if any.

Rules:
- Write in ${answerLanguage}
- Speak in third person about ${personLabel}; never as them.
- First-person wording is allowed only inside verbatim quotes from cited source excerpts.
- Use only facts supported by the provided candidates.
- Quote text only when it appears verbatim in the cited source excerpts.
- If part of the question is unsupported, answer only the supported part and list the unsupported parts.
- If the request asks to pretend to be ${personLabel}, speak in their voice, or predict what they would think/say/feel without a recorded source, set refusal and leave sentences empty.
- Do not mention any itemIds except real cited IDs from the candidate list.
${correctionBlock}

Question:
${question}

Candidates:
${candidateBlocks}`;
}

async function recordAskEvent(
  db: Db,
  input: AskSpaceQuestionInput,
  outcome: AskOutcomePayload["outcome"],
) {
  await db.insert(event).values({
    spaceId: input.spaceId,
    membershipId: input.membershipId,
    type: "ask_answered",
    outcome,
    properties: {},
  });
}

async function recordAiCall(
  db: Db,
  input: AskSpaceQuestionInput,
  provider: AiCallProvider,
  modelId: string,
  status: "ok" | "error",
  latencyMs: number,
  usage?: { inputTokens?: number; outputTokens?: number },
  error?: unknown,
) {
  await db.insert(aiCall).values({
    spaceId: input.spaceId,
    purpose: "ask",
    provider,
    model: modelId,
    status,
    latencyMs,
    inputTokens: usage?.inputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
    errorMessage:
      status === "error"
        ? error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error)
        : null,
  });
}

async function runModel(
  model: LanguageModel,
  prompt: string,
): Promise<{
  object: GeneratedAskResult;
  usage: { inputTokens?: number; outputTokens?: number } | undefined;
  latencyMs: number;
}> {
  const startedAt = Date.now();
  const response = await generateObject({
    model,
    schema: askModelResultSchema,
    prompt,
  });

  return {
    object: response.object,
    usage: response.usage,
    latencyMs: Date.now() - startedAt,
  };
}

async function generateStructuredAnswer(
  db: Db,
  input: AskSpaceQuestionInput,
  models: AskModels,
  candidates: AskCandidate[],
  correction?: string,
): Promise<{ result: GeneratedAskResult }> {
  const prompt = buildPrompt(input.question, input.locale, input.featuredName, candidates, correction);
  const primaryStartedAt = Date.now();
  try {
    const primary = await runModel(models.text, prompt);
    await recordAiCall(db, input, "groq", PRIMARY_MODEL_ID, "ok", primary.latencyMs, primary.usage);
    return { result: primary.object };
  } catch (error) {
    const primaryLatencyMs = Date.now() - primaryStartedAt;
    await recordAiCall(db, input, "groq", PRIMARY_MODEL_ID, "error", primaryLatencyMs, undefined, error);

    if (!APICallError.isInstance(error) || !error.isRetryable) {
      throw error;
    }
  }

  const fallbackStartedAt = Date.now();
  try {
    const fallback = await runModel(models.textFallback, prompt);
    await recordAiCall(
      db,
      input,
      "gemini",
      FALLBACK_MODEL_ID,
      "ok",
      fallback.latencyMs,
      fallback.usage,
    );
    return { result: fallback.object };
  } catch (error) {
    const fallbackLatencyMs = Date.now() - fallbackStartedAt;
    await recordAiCall(
      db,
      input,
      "gemini",
      FALLBACK_MODEL_ID,
      "error",
      fallbackLatencyMs,
      undefined,
      error,
    );
    throw new AskUnavailableError("Ask providers were unavailable.", { cause: error });
  }
}

export async function answerQuestionFromCandidates(
  input: AskSpaceQuestionInput,
  candidates: AskCandidate[],
  generate: GenerateAnswerFn,
): Promise<AskOutcomePayload> {
  if (matchesRoleplayRequest(input.question)) {
    return refusedPayload(input.locale);
  }

  const tau = getAskTau();
  const topSimilarity = candidates[0]?.similarity ?? -1;
  if (candidates.length === 0 || topSimilarity < tau) {
    return abstainedPayload(input.question, input.locale, input.lifecycleMode);
  }

  let pass = 0;
  let correction: string | undefined;
  while (pass < 2) {
    const { result } = await generate(correction);

    if (result.refusal) {
      return refusedPayload(input.locale);
    }

    const validated = validateGeneratedAnswer(result, candidates);
    if (validated.sentences.length === 0) {
      return abstainedPayload(input.question, input.locale, input.lifecycleMode);
    }

    if (!validated.hasFirstPersonAsSubject) {
      return answeredPayload(
        validated.sentences.map((sentence) => sentence.text).join(" "),
        validated,
      );
    }

    pass += 1;
    correction =
      "Rewrite strictly in third person about the featured person. Keep first person only inside verbatim quoted source text.";
  }

  return abstainedPayload(input.question, input.locale, input.lifecycleMode);
}

export async function askSpaceQuestion(
  db: Db,
  input: AskSpaceQuestionInput,
  models: AskModels,
): Promise<AskOutcomePayload> {
  if (matchesRoleplayRequest(input.question)) {
    const payload = refusedPayload(input.locale);
    await recordAskEvent(db, input, payload.outcome);
    return payload;
  }

  const topK = getAskTopK();
  const queryEmbedding = await embedText(models.embed, input.question, "RETRIEVAL_QUERY");

  const candidateRows = await db
    .select({
      id: item.id,
      title: item.title,
      body: item.body,
      origin: item.origin,
      reviewState: item.reviewState,
      segmentIds: item.segmentIds,
      sourceId: source.id,
      sourceType: source.type,
      blobPathname: source.blobPathname,
      mimeType: source.mimeType,
      contributorDisplayName: person.displayName,
      contributorRelationship: person.relationshipToFeatured,
      distance: cosineDistance(item.embedding, queryEmbedding),
    })
    .from(item)
    .innerJoin(source, eq(source.id, item.sourceId))
    .leftJoin(person, eq(person.id, source.contributorPersonId))
    .where(
      and(
        eq(item.spaceId, input.spaceId),
        archiveReviewStateFilter(),
        isNotNull(item.visibility),
        isNotNull(item.embedding),
        visibilityFilter(input.membershipRole),
      ),
    )
    .orderBy(asc(cosineDistance(item.embedding, queryEmbedding)))
    .limit(topK);

  const segmentIdSet = new Set(
    candidateRows.flatMap((row) =>
      Array.isArray(row.segmentIds)
        ? row.segmentIds.filter((segmentId): segmentId is string => typeof segmentId === "string")
        : [],
    ),
  );

  const segmentRows =
    segmentIdSet.size === 0
      ? []
      : await db.query.sourceSegment.findMany({
          where: inArray(sourceSegment.id, [...segmentIdSet]),
        });
  const segmentsById = new Map(
    segmentRows.map((row) => [
      row.id,
      {
        id: row.id,
        text: row.text,
        startSeconds: row.startSeconds == null ? null : Number(row.startSeconds),
        endSeconds: row.endSeconds == null ? null : Number(row.endSeconds),
      } satisfies AskSegment,
    ]),
  );

  const candidates: AskCandidate[] = candidateRows.map((row) => {
    const segmentIds = Array.isArray(row.segmentIds)
      ? row.segmentIds.filter((segmentId): segmentId is string => typeof segmentId === "string")
      : [];

    return {
      id: row.id,
      title: row.title,
      body: row.body,
      origin: row.origin,
      reviewState: row.reviewState,
      similarity: 1 - Number(row.distance),
      segmentIds,
      source: {
        id: row.sourceId,
        type: row.sourceType,
        blobPathname: row.blobPathname,
        mimeType: row.mimeType,
        contributorDisplayName: row.contributorDisplayName,
        contributorRelationship: row.contributorRelationship,
      },
      segments: segmentIds.flatMap((segmentId) => {
        const segment = segmentsById.get(segmentId);
        return segment ? [segment] : [];
      }),
    };
  });

  let payload: AskOutcomePayload;
  try {
    payload = await answerQuestionFromCandidates(input, candidates, (correction) =>
      generateStructuredAnswer(db, input, models, candidates, correction),
    );
  } catch (error) {
    if (!(error instanceof AskUnavailableError)) {
      throw error;
    }
    payload = errorPayload(input.locale);
  }

  await recordAskEvent(db, input, payload.outcome);
  return payload;
}
