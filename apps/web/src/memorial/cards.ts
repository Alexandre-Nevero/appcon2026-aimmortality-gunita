import { computeClipSpan, type Origin, type ReviewState } from "@gunita/core";

import type { MemorialCard } from "./schema";

export interface DraftSourceSegment {
  id: string;
  text: string;
  startSeconds: number | null;
  endSeconds: number | null;
}

export interface DraftRecipeStep {
  kind: "measured" | "judgement";
  text: string;
  segmentIds: string[];
}

export interface MemorialDraftItem {
  id: string;
  title: string;
  body: string;
  type: "story" | "recipe" | "tradition" | "lesson" | "fact";
  origin: Origin;
  reviewState: ReviewState;
  source: {
    id: string;
    type: "audio" | "text" | "photo" | "document";
    blobUrl: string;
    durationSeconds: number | null;
  };
  segments: DraftSourceSegment[];
  recipeSteps: DraftRecipeStep[];
}

export interface CaptionInput {
  cardType: MemorialCard["type"];
  featuredName: string;
  item: MemorialDraftItem;
}

export interface BuildDraftSnapshotInput {
  featuredName: string;
  locale: "fil" | "en";
  voiceClipsAllowed: boolean;
  items: MemorialDraftItem[];
  buildCaption(input: CaptionInput): Promise<string | null>;
}

function segmentMap(item: MemorialDraftItem) {
  return new Map(item.segments.map((segment) => [segment.id, segment]));
}

function clipForSegments(
  sourceDurationSeconds: number | null,
  segments: DraftSourceSegment[],
): MemorialCard["clip"] {
  const timedSegments = segments.flatMap((segment) =>
    segment.startSeconds != null && segment.endSeconds != null
      ? [{ startSeconds: segment.startSeconds, endSeconds: segment.endSeconds }]
      : [],
  );

  if (timedSegments.length === 0) {
    return null;
  }

  const clip = computeClipSpan(timedSegments, {
    durationSeconds: sourceDurationSeconds ?? undefined,
  });
  return { startSeconds: clip.start, endSeconds: clip.end };
}

function transcriptExcerpt(segments: DraftSourceSegment[]): string | null {
  const text = segments
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
  return text || null;
}

function quoteCardAllowed(item: MemorialDraftItem, voiceClipsAllowed: boolean) {
  return item.source.type === "audio" && item.origin === "from_them" && voiceClipsAllowed;
}

function chooseCardType(item: MemorialDraftItem, voiceClipsAllowed: boolean): MemorialCard["type"] {
  if (item.type === "recipe") return "recipe";
  if (quoteCardAllowed(item, voiceClipsAllowed)) return "quote";
  if (item.type === "lesson") return "lesson";
  return "life_moment";
}

function recipeClipDetails(item: MemorialDraftItem) {
  const byId = segmentMap(item);
  const judgementStep = item.recipeSteps.find((step) => step.kind === "judgement" && step.segmentIds.length > 0);
  if (!judgementStep) {
    return {
      clip: clipForSegments(item.source.durationSeconds, item.segments),
      excerpt: transcriptExcerpt(item.segments),
    };
  }

  const segments = judgementStep.segmentIds
    .map((segmentId) => byId.get(segmentId))
    .filter((segment): segment is DraftSourceSegment => segment != null);
  return {
    clip: clipForSegments(item.source.durationSeconds, segments),
    excerpt: judgementStep.text,
  };
}

export async function buildDraftSnapshot(input: BuildDraftSnapshotInput): Promise<MemorialCard[]> {
  const cards: MemorialCard[] = [];
  const coverItem = input.items.find((item) => item.source.type === "photo") ?? null;
  const coverCaption = coverItem
    ? await input.buildCaption({ cardType: "cover", featuredName: input.featuredName, item: coverItem })
    : null;

  cards.push({
    type: "cover",
    order: 0,
    itemId: coverItem?.id ?? null,
    sourceId: coverItem?.source.id ?? null,
    title: input.featuredName,
    body: null,
    caption: coverCaption,
    aiWritten: coverCaption != null,
    origin: coverItem?.origin ?? null,
    reviewState: coverItem?.reviewState ?? null,
    blobUrl: coverItem?.source.blobUrl ?? null,
    audioUrl: null,
    transcriptExcerpt: null,
    clip: null,
  });

  for (const item of input.items) {
    if (coverItem?.id === item.id) {
      continue;
    }

    const cardType = chooseCardType(item, input.voiceClipsAllowed);
    const needsCaption = cardType !== "quote";
    const caption = needsCaption
      ? await input.buildCaption({ cardType, featuredName: input.featuredName, item })
      : null;

    let clip: MemorialCard["clip"] = null;
    let audioUrl: string | null = null;
    let transcript: string | null = null;
    if (cardType === "quote") {
      clip = clipForSegments(item.source.durationSeconds, item.segments);
      audioUrl = item.source.blobUrl;
      transcript = transcriptExcerpt(item.segments) ?? item.body;
    } else if (cardType === "recipe" && item.source.type === "audio" && input.voiceClipsAllowed) {
      const recipeDetails = recipeClipDetails(item);
      clip = recipeDetails.clip;
      audioUrl = recipeDetails.clip ? item.source.blobUrl : null;
      transcript = recipeDetails.excerpt;
    }

    cards.push({
      type: cardType,
      order: cards.length,
      itemId: item.id,
      sourceId: item.source.id,
      title: item.title,
      body: item.body,
      caption,
      aiWritten: caption != null,
      origin: item.origin,
      reviewState: item.reviewState,
      blobUrl: item.source.type === "photo" ? item.source.blobUrl : null,
      audioUrl,
      transcriptExcerpt: transcript,
      clip,
    });
  }

  cards.push({
    type: "closing",
    order: cards.length,
    itemId: null,
    sourceId: null,
    title: input.locale === "fil" ? "Magbahagi ng alaala" : "Share a memory",
    body: null,
    caption: null,
    aiWritten: false,
    origin: null,
    reviewState: null,
    blobUrl: null,
    audioUrl: null,
    transcriptExcerpt: null,
    clip: null,
  });

  return cards.map((card, order) => ({ ...card, order }));
}
