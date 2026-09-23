import { readFile } from "node:fs/promises";

import "dotenv/config";
import { eq } from "drizzle-orm";

import { db } from "./index";
import {
  consent,
  item,
  itemPerson,
  membership,
  person,
  recipeStep,
  source,
  sourceSegment,
  space,
} from "./schema";
import { DEFAULT_FIXTURE_PATH, familyFixture } from "./seed-fixture";

// docs/ops.md: `pnpm --filter web db:seed` is idempotent; `--reset` wipes the space first.
export async function seed(options: { reset?: boolean; fixturePath?: string } = {}) {
  const fixturePath = options.fixturePath ?? DEFAULT_FIXTURE_PATH;
  const raw = JSON.parse(await readFile(fixturePath, "utf-8"));
  const fixture = familyFixture.parse(raw);

  const existing = await db.query.space.findFirst({ where: eq(space.name, fixture.space.name) });
  if (existing) {
    if (!options.reset) {
      console.log(`Space "${fixture.space.name}" already seeded. Pass --reset to reseed.`);
      return { spaceId: existing.id, reseeded: false };
    }
    // Every other table cascades from space_id (docs/data-model.md), so this clears the whole tree.
    await db.delete(space).where(eq(space.id, existing.id));
  }

  const [createdSpace] = await db
    .insert(space)
    .values({ name: fixture.space.name, locale: fixture.space.locale })
    .returning();

  const personIdByKey = new Map<string, string>();
  for (const p of fixture.people) {
    const [row] = await db
      .insert(person)
      .values({
        spaceId: createdSpace.id,
        displayName: p.displayName,
        aliases: p.aliases,
        relationshipToFeatured: p.relationshipToFeatured ?? null,
        isFeatured: p.isFeatured,
      })
      .returning();
    personIdByKey.set(p.key, row.id);
  }

  let firstMembershipId: string | null = null;
  for (const m of fixture.memberships) {
    const [row] = await db
      .insert(membership)
      .values({
        spaceId: createdSpace.id,
        userId: m.userId,
        role: m.role,
        localeOverride: m.localeOverride ?? null,
      })
      .returning();
    firstMembershipId ??= row.id;
  }
  if (!firstMembershipId) {
    throw new Error("Fixture must declare at least one membership (needed as source uploader)");
  }

  const sourceIdByKey = new Map<string, string>();
  const segmentIdBySourceKeyAndIndex = new Map<string, string>();
  for (const s of fixture.sources) {
    const [row] = await db
      .insert(source)
      .values({
        spaceId: createdSpace.id,
        type: s.type,
        origin: s.origin,
        status: s.status,
        visibility: s.visibility,
        contributorPersonId: s.contributorPersonKey
          ? (personIdByKey.get(s.contributorPersonKey) ?? null)
          : null,
        uploadedByMembershipId: firstMembershipId,
        blobPathname: s.blobPathname,
        mimeType: s.mimeType,
        byteSize: s.byteSize,
      })
      .returning();
    sourceIdByKey.set(s.key, row.id);

    for (const seg of s.segments) {
      const [segRow] = await db
        .insert(sourceSegment)
        .values({
          sourceId: row.id,
          index: seg.index,
          text: seg.text,
          startSeconds: seg.startSeconds != null ? String(seg.startSeconds) : null,
          endSeconds: seg.endSeconds != null ? String(seg.endSeconds) : null,
        })
        .returning();
      segmentIdBySourceKeyAndIndex.set(`${s.key}:${seg.index}`, segRow.id);
    }
  }

  if (fixture.consent) {
    await db.insert(consent).values({
      spaceId: createdSpace.id,
      participationConsented: fixture.consent.participationConsented,
      aiProcessingConsented: fixture.consent.aiProcessingConsented,
      memorialUseAllowed: fixture.consent.memorialUseAllowed,
      voiceClipsAllowed: fixture.consent.voiceClipsAllowed,
      evidenceSourceId: fixture.consent.evidenceSourceKey
        ? (sourceIdByKey.get(fixture.consent.evidenceSourceKey) ?? null)
        : null,
      recordedAt: new Date(),
      recordedByMembershipId: firstMembershipId,
    });
  }

  for (const i of fixture.items) {
    const sourceId = sourceIdByKey.get(i.sourceKey);
    if (!sourceId) throw new Error(`Item references unknown source key "${i.sourceKey}"`);

    const segmentIds = i.segmentIndexes.map((idx) => {
      const segId = segmentIdBySourceKeyAndIndex.get(`${i.sourceKey}:${idx}`);
      if (!segId) throw new Error(`Item cites unknown segment ${i.sourceKey}:${idx}`);
      return segId;
    });

    const [itemRow] = await db
      .insert(item)
      .values({
        spaceId: createdSpace.id,
        sourceId,
        type: i.type,
        title: i.title,
        body: i.body,
        origin: i.origin,
        segmentIds,
        rawPeople: i.rawPeople,
        places: i.places,
        dates: i.dates,
        reviewState: i.reviewState,
        visibility: i.visibility ?? null,
        reviewedByMembershipId: i.reviewState === "ai_suggestion" ? null : firstMembershipId,
        reviewedAt: i.reviewState === "ai_suggestion" ? null : new Date(),
      })
      .returning();

    for (const personKey of i.peopleKeys) {
      const personId = personIdByKey.get(personKey);
      if (!personId) throw new Error(`Item references unknown person key "${personKey}"`);
      await db.insert(itemPerson).values({ itemId: itemRow.id, personId });
    }

    for (const step of i.recipeSteps) {
      const stepSegmentIds = step.segmentIndexes.map((idx) => {
        const segId = segmentIdBySourceKeyAndIndex.get(`${i.sourceKey}:${idx}`);
        if (!segId) throw new Error(`Recipe step cites unknown segment ${i.sourceKey}:${idx}`);
        return segId;
      });
      await db.insert(recipeStep).values({
        itemId: itemRow.id,
        index: step.index,
        kind: step.kind,
        text: step.text,
        quantityVerbatim: step.quantityVerbatim ?? null,
        segmentIds: stepSegmentIds,
      });
    }
  }

  console.log(`Seeded space "${createdSpace.name}" (${createdSpace.id}).`);
  return { spaceId: createdSpace.id, reseeded: Boolean(existing) };
}
