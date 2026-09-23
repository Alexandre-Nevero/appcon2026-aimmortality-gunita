import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";

import "dotenv/config";
import { eq, inArray } from "drizzle-orm";

import { db } from "./index";
import {
  activity,
  aiCall,
  consent,
  contribution,
  event,
  item,
  itemPerson,
  itemRevision,
  membership,
  person,
  question,
  recap,
  recipeStep,
  source,
  sourceSegment,
  space,
} from "./schema";
import { DEFAULT_FIXTURE_PATH, familyFixture } from "./seed-fixture";

// Deletes one space and everything under it in FK-safe order (children before parents), rather
// than relying on `space`'s ON DELETE CASCADE alone. Several tables RESTRICT-reference `membership`
// (source.uploadedByMembershipId, item_revision.changedByMembershipId, ...); if Postgres happened to
// process the `membership` cascade before the tables that RESTRICT-reference it, the delete would
// fail. Deleting explicitly, in dependency order, sidesteps that ordering hazard entirely.
async function deleteSpaceTree(spaceId: string) {
  const itemRows = await db.query.item.findMany({ where: eq(item.spaceId, spaceId) });
  const itemIds = itemRows.map((row) => row.id);
  const sourceRows = await db.query.source.findMany({ where: eq(source.spaceId, spaceId) });
  const sourceIds = sourceRows.map((row) => row.id);

  if (itemIds.length > 0) {
    await db.delete(itemRevision).where(inArray(itemRevision.itemId, itemIds));
    await db.delete(recipeStep).where(inArray(recipeStep.itemId, itemIds));
    await db.delete(itemPerson).where(inArray(itemPerson.itemId, itemIds));
  }
  await db.delete(aiCall).where(eq(aiCall.spaceId, spaceId));
  await db.delete(event).where(eq(event.spaceId, spaceId));
  await db.delete(activity).where(eq(activity.spaceId, spaceId));
  await db.delete(recap).where(eq(recap.spaceId, spaceId));
  await db.delete(contribution).where(eq(contribution.spaceId, spaceId));
  await db.delete(question).where(eq(question.spaceId, spaceId));
  await db.delete(item).where(eq(item.spaceId, spaceId));
  await db.delete(consent).where(eq(consent.spaceId, spaceId));
  if (sourceIds.length > 0) {
    await db.delete(sourceSegment).where(inArray(sourceSegment.sourceId, sourceIds));
  }
  await db.delete(source).where(eq(source.spaceId, spaceId));
  await db.delete(membership).where(eq(membership.spaceId, spaceId));
  await db.delete(person).where(eq(person.spaceId, spaceId));
  await db.delete(space).where(eq(space.id, spaceId));
}

// docs/ops.md: `pnpm --filter web db:seed` is idempotent; `--reset` wipes the space first.
export async function seed(options: { reset?: boolean; fixturePath?: string } = {}) {
  const fixturePath = options.fixturePath ?? DEFAULT_FIXTURE_PATH;
  const raw = JSON.parse(await readFile(fixturePath, "utf-8"));
  const fixture = familyFixture.parse(raw);

  const matches = await db.query.space.findMany({ where: eq(space.name, fixture.space.name) });
  if (matches.length > 1) {
    throw new Error(
      `${matches.length} spaces are named "${fixture.space.name}" — refusing to guess which one ` +
        "to reset. Delete the duplicates manually first.",
    );
  }
  const existing = matches[0];
  if (existing) {
    if (!options.reset) {
      console.log(`Space "${fixture.space.name}" already seeded. Pass --reset to reseed.`);
      if (existing.memorialToken) console.log(`Memorial: /m/${existing.memorialToken}/memories`);
      return { spaceId: existing.id, reseeded: false };
    }
    await deleteSpaceTree(existing.id);
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
        disputeNote: i.disputeNote ?? null,
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

  if (fixture.publishMemorial) {
    // System Design: token is 128-bit random base64url, generated here so it is never committed.
    const token = randomBytes(16).toString("base64url");
    const now = new Date();
    await db
      .update(space)
      .set({ lifecycleMode: "memorial", memorialToken: token, memorialActivatedAt: now })
      .where(eq(space.id, createdSpace.id));
    await db.insert(recap).values({
      spaceId: createdSpace.id,
      status: "published",
      publishedAt: now,
      publishedByMembershipId: firstMembershipId,
    });
    await db.insert(activity).values([
      { spaceId: createdSpace.id, membershipId: firstMembershipId, type: "memorial_activated" },
      { spaceId: createdSpace.id, membershipId: firstMembershipId, type: "memorial_published" },
    ]);
    console.log(`Memorial published: /m/${token}  ·  photo memories: /m/${token}/memories`);
  }

  // Fixture order becomes submission order, which is S-033's display order.
  const firstSubmittedAt = Date.now() - fixture.contributions.length * 1000;
  for (const [index, c] of fixture.contributions.entries()) {
    await db.insert(contribution).values({
      spaceId: createdSpace.id,
      displayName: c.displayName,
      relationship: c.relationship,
      textContent: c.textContent ?? null,
      photoBlobPathname: c.photoBlobPathname ?? null,
      audioBlobPathname: c.audioBlobPathname ?? null,
      status: c.status,
      submittedIpHash: "seed",
      submittedAt: new Date(firstSubmittedAt + index * 1000),
      reviewedByMembershipId: c.status === "pending" ? null : firstMembershipId,
      reviewedAt: c.status === "pending" ? null : new Date(),
    });
  }

  console.log(`Seeded space "${createdSpace.name}" (${createdSpace.id}).`);
  return { spaceId: createdSpace.id, reseeded: Boolean(existing) };
}
