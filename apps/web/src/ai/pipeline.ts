import type { LanguageModel, TranscriptionModel } from "ai";
import { eq, inArray } from "drizzle-orm";

import type { db as Database } from "../db";
import {
  item,
  itemPerson,
  person,
  question,
  recipeStep,
  source,
  sourceSegment,
  space,
} from "../db/schema";
import { extractItemsWithFallback, validateExtractedItems, type ExtractionSegment } from "./extract";
import { transcribeAudio } from "./transcribe";
import { analyzePhoto, sanitizeVisionOutput } from "./vision";

export interface PipelineModels {
  transcribe: TranscriptionModel;
  text: LanguageModel;
  textFallback: LanguageModel;
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

// POST /sources/:id/retry re-runs this from scratch. source_segment has a unique (sourceId, index)
// index, so without clearing what a previous (failed) attempt already wrote, retrying would hit a
// duplicate-key error on the very first insert and could never succeed. Wipes everything this
// pipeline itself creates for the source — items, their recipe steps, and any questions it
// triggered — so re-processing starts clean. (If a steward already reviewed an item from a partial
// prior attempt before retrying, that review is lost; acceptable for now since retry follows a
// processing failure, not a successful run — worth revisiting if that race becomes a real problem.)
async function resetSourceDerivedData(db: Db, sourceId: string) {
  const itemRows = await db.query.item.findMany({ where: eq(item.sourceId, sourceId) });
  const itemIds = itemRows.map((row) => row.id);
  if (itemIds.length > 0) {
    await db.delete(recipeStep).where(inArray(recipeStep.itemId, itemIds));
    await db.delete(itemPerson).where(inArray(itemPerson.itemId, itemIds));
    await db.delete(item).where(inArray(item.id, itemIds));
  }
  await db.delete(question).where(eq(question.triggeredBySourceId, sourceId));
  await db.delete(sourceSegment).where(eq(sourceSegment.sourceId, sourceId));
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
  fallbackModel: LanguageModel,
) {
  const segments = await fetchSegments(db, sourceId);
  const segmentDbIdByIndex = await fetchSegmentDbIdByIndex(db, sourceId);

  const raw = await extractItemsWithFallback(model, fallbackModel, segments);
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
// round trips — but resetSourceDerivedData() above makes a partial failure safe to retry via
// POST /sources/:id/retry: every run starts by clearing whatever the previous attempt wrote.
export async function processSource(db: Db, models: PipelineModels, sourceId: string): Promise<void> {
  const sourceRow = await db.query.source.findFirst({ where: eq(source.id, sourceId) });
  if (!sourceRow) throw new Error(`Source ${sourceId} not found`);

  await resetSourceDerivedData(db, sourceId);
  await db.update(source).set({ status: "processing" }).where(eq(source.id, sourceId));

  try {
    if (sourceRow.type === "audio") {
      const audio = await (await fetch(sourceRow.blobPathname)).arrayBuffer();
      const transcription = await transcribeAudio(models.transcribe, audio);
      await insertTimedSegments(db, sourceId, transcription.segments);
      await insertExtractedItems(db, sourceRow.spaceId, sourceId, sourceRow.origin, models.text, models.textFallback);
    } else if (sourceRow.type === "text") {
      const fullText = await (await fetch(sourceRow.blobPathname)).text();
      await insertTextSegments(db, sourceId, splitParagraphs(fullText));
      await insertExtractedItems(db, sourceRow.spaceId, sourceId, sourceRow.origin, models.text, models.textFallback);
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
      // `missing` and `questions` are independent lists (visionOutputSchema), not a parallel/zipped
      // structure — pairing them by index would attach an unrelated "why" to most questions, so
      // every question here cites the same general reason instead of a guessed-at specific one.
      for (const questionText of vision.questions) {
        await db.insert(question).values({
          spaceId: sourceRow.spaceId,
          text: questionText,
          locale: spaceRow?.locale ?? "fil",
          reason: "Missing context on this photo",
          originKind: "artifact_gap",
          triggeredBySourceId: sourceId,
        });
      }
    } else if (sourceRow.type === "document") {
      // System Design: "document → Gemini Flash-Lite (image/PDF) → AI-read text, stored as
      // segments" — not yet implemented. Failing loudly (rather than silently reaching "ready"
      // with zero segments/items) until this lands.
      throw new Error("document source processing is not yet implemented");
    }

    await db.update(source).set({ status: "ready" }).where(eq(source.id, sourceId));
  } catch (error) {
    await fail(db, sourceId, sourceRow.type, error instanceof Error ? error.message : String(error));
  }
}
