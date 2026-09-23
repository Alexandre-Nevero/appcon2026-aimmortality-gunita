import type { LanguageModel, TranscriptionModel } from "ai";
import { eq } from "drizzle-orm";

import type { db as Database } from "../db";
import { item, person, question, recipeStep, source, sourceSegment, space } from "../db/schema";
import { extractItems, validateExtractedItems, type ExtractionSegment } from "./extract";
import { transcribeAudio } from "./transcribe";
import { analyzePhoto, sanitizeVisionOutput } from "./vision";

export interface PipelineModels {
  transcribe: TranscriptionModel;
  text: LanguageModel;
  vision: LanguageModel;
}

type Db = typeof Database;

// One step of System Design's source status machine: uploaded → processing → ready | failed(step).
async function fail(db: Db, sourceId: string, step: string, reason: string) {
  await db
    .update(source)
    .set({ status: "failed", statusReason: `failed(${step}): ${reason}` })
    .where(eq(source.id, sourceId));
}

// Splits a plain-text source into one segment per paragraph (System Design: "text → one segment
// per paragraph").
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

interface TimedSegment {
  index: number;
  text: string;
  startSeconds: number;
  endSeconds: number;
}

async function insertTimedSegments(db: Db, sourceId: string, segments: TimedSegment[]) {
  if (segments.length === 0) return;
  await db.insert(sourceSegment).values(
    segments.map((seg) => ({
      sourceId,
      index: seg.index,
      text: seg.text,
      startSeconds: String(seg.startSeconds),
      endSeconds: String(seg.endSeconds),
    })),
  );
}

async function insertTextSegments(db: Db, sourceId: string, texts: string[]) {
  if (texts.length === 0) return;
  await db
    .insert(sourceSegment)
    .values(texts.map((text, index) => ({ sourceId, index, text })));
}

async function fetchSegments(db: Db, sourceId: string): Promise<ExtractionSegment[]> {
  const rows = await db.query.sourceSegment.findMany({ where: eq(sourceSegment.sourceId, sourceId) });
  return rows.map((row) => ({ index: row.index, text: row.text }));
}

async function fetchSegmentDbIdByIndex(db: Db, sourceId: string): Promise<Map<number, string>> {
  const rows = await db.query.sourceSegment.findMany({ where: eq(sourceSegment.sourceId, sourceId) });
  return new Map(rows.map((row) => [row.index, row.id]));
}

async function insertExtractedItems(
  db: Db,
  spaceId: string,
  sourceId: string,
  origin: "from_them" | "about_them",
  model: LanguageModel,
) {
  const segments = await fetchSegments(db, sourceId);
  const segmentDbIdByIndex = await fetchSegmentDbIdByIndex(db, sourceId);

  const raw = await extractItems(model, segments);
  const validated = validateExtractedItems(raw, segments);

  for (const extracted of validated) {
    const segmentIds = extracted.segmentIndexes.map((i) => segmentDbIdByIndex.get(i)!);
    const [itemRow] = await db
      .insert(item)
      .values({
        spaceId,
        sourceId,
        type: extracted.type,
        title: extracted.title,
        body: extracted.body,
        origin,
        segmentIds,
        rawPeople: extracted.people,
        places: extracted.places,
        dates: extracted.dates,
      })
      .returning();

    for (const step of extracted.recipeSteps) {
      await db.insert(recipeStep).values({
        itemId: itemRow.id,
        index: step.index,
        kind: step.kind,
        text: step.text,
        quantityVerbatim: step.quantityVerbatim,
        segmentIds: step.segmentIndexes.map((i) => segmentDbIdByIndex.get(i)!),
      });
    }
  }
}

// System Design data flow "Capture → structure". Runs after the source row exists (status
// 'uploaded'); moves it to 'ready' on success or 'failed(step, reason)' on any error. No
// transaction wraps the writes below — the Neon HTTP driver doesn't support one across this many
// round trips; a partially-written failure is safe to retry via POST /sources/:id/retry since every
// insert here is additive and re-processing overwrites source.status/aiVisibleDescription.
export async function processSource(db: Db, models: PipelineModels, sourceId: string): Promise<void> {
  const sourceRow = await db.query.source.findFirst({ where: eq(source.id, sourceId) });
  if (!sourceRow) throw new Error(`Source ${sourceId} not found`);

  await db.update(source).set({ status: "processing" }).where(eq(source.id, sourceId));

  try {
    if (sourceRow.type === "audio") {
      const audio = await (await fetch(sourceRow.blobPathname)).arrayBuffer();
      const transcription = await transcribeAudio(models.transcribe, audio);
      await insertTimedSegments(db, sourceId, transcription.segments);
      await insertExtractedItems(db, sourceRow.spaceId, sourceId, sourceRow.origin, models.text);
    } else if (sourceRow.type === "text") {
      const fullText = await (await fetch(sourceRow.blobPathname)).text();
      await insertTextSegments(db, sourceId, splitParagraphs(fullText));
      await insertExtractedItems(db, sourceRow.spaceId, sourceId, sourceRow.origin, models.text);
    } else if (sourceRow.type === "photo") {
      const image = await (await fetch(sourceRow.blobPathname)).arrayBuffer();
      const knownContext =
        sourceRow.artifactContext != null ? JSON.stringify(sourceRow.artifactContext) : undefined;
      const rawVision = await analyzePhoto(models.vision, image, sourceRow.mimeType, knownContext);

      const knownPeople = await db.query.person.findMany({ where: eq(person.spaceId, sourceRow.spaceId) });
      const knownNames = knownPeople.flatMap((p) => [p.displayName, ...(p.aliases as string[])]);
      const vision = sanitizeVisionOutput(rawVision, knownNames);

      await db.update(source).set({ aiVisibleDescription: vision }).where(eq(source.id, sourceId));

      const spaceRow = await db.query.space.findFirst({ where: eq(space.id, sourceRow.spaceId) });
      // F-005/F-014: each vision question becomes a GUNITA Question, citing this source + why.
      for (let i = 0; i < vision.questions.length; i++) {
        await db.insert(question).values({
          spaceId: sourceRow.spaceId,
          text: vision.questions[i],
          locale: spaceRow?.locale ?? "fil",
          reason: vision.missing[i] ?? "Missing context on this photo",
          originKind: "artifact_gap",
          triggeredBySourceId: sourceId,
        });
      }
    }
    // "document" sources (AI-read text via vision, stored as segments) follow the same shape as
    // "text" once read; deferred here since it needs the same vision call as photos plus the text
    // segmenting above — flagged as a follow-up once TASK-008's core paths are reviewed.

    await db.update(source).set({ status: "ready" }).where(eq(source.id, sourceId));
  } catch (error) {
    await fail(db, sourceId, sourceRow.type, error instanceof Error ? error.message : String(error));
  }
}
