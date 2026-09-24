import { put } from "@vercel/blob";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";

import { models } from "../ai/models";
import type { db as Database } from "../db";
import {
  activity,
  contribution,
  consent,
  event,
  item,
  person,
  recap,
  recipeStep,
  source,
  sourceSegment,
  space,
} from "../db/schema";
import { sniffFileKind, sourceTypeFromMime, validateUpload } from "../media/validate";
import { buildDraftSnapshot, type CaptionInput, type MemorialDraftItem } from "./cards";
import { generateMemorialCaption } from "./captions";
import {
  contributionWindowStart,
  getClientIp,
  hashSubmittedIp,
  isContributionRateLimited,
} from "./public";
import { buildMemorialUrl, newMemorialToken, renderQrSvg } from "./qr";
import { memorialCardSchema, type MemorialCard } from "./schema";

type Db = typeof Database;
type ItemRow = NonNullable<Awaited<ReturnType<Db["query"]["item"]["findFirst"]>>>;

export class MemorialError extends Error {
  constructor(
    public readonly code:
      | "space_not_found"
      | "featured_person_not_found"
      | "invalid_confirmation_name"
      | "no_items_selected"
      | "invalid_item_selection"
      | "invalid_snapshot"
      | "contribution_not_found"
      | "rate_limited",
    message: string,
  ) {
    super(message);
  }
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function parseDurationSeconds(value: string | null): number | null {
  return value == null ? null : Number(value);
}

export function isEligibleMemorialItem(
  row: Pick<ItemRow, "reviewState" | "visibility">,
  memorialUseAllowed: boolean,
) {
  return row.visibility === "memorial" && memorialUseAllowed && row.reviewState !== "ai_suggestion" && row.reviewState !== "rejected";
}

async function findFeaturedPerson(db: Db, spaceId: string) {
  return db.query.person.findFirst({
    where: and(eq(person.spaceId, spaceId), eq(person.isFeatured, true)),
  });
}

async function findSpace(db: Db, spaceId: string) {
  return db.query.space.findFirst({ where: eq(space.id, spaceId) });
}

async function upsertRecapDraft(
  db: Db,
  input: { spaceId: string; cards: MemorialCard[] },
) {
  const existing = await db.query.recap.findFirst({ where: eq(recap.spaceId, input.spaceId) });
  if (existing) {
    const [updated] = await db
      .update(recap)
      .set({
        status: "draft",
        snapshot: input.cards,
        updatedAt: new Date(),
      })
      .where(eq(recap.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(recap)
    .values({
      spaceId: input.spaceId,
      status: "draft",
      snapshot: input.cards,
    })
    .returning();
  return created;
}

function captionPromptFromInput(input: CaptionInput): string {
  return [
    `Card type: ${input.cardType}`,
    `Featured person: ${input.featuredName}`,
    `Reviewed item title: ${input.item.title}`,
    `Reviewed item body: ${input.item.body}`,
    `Item type: ${input.item.type}`,
    `Origin: ${input.item.origin}`,
    `Source type: ${input.item.source.type}`,
  ].join("\n");
}

async function loadDraftItems(db: Db, spaceId: string, itemIds: string[]) {
  const uniqueIds = [...new Set(itemIds)];
  if (uniqueIds.length === 0) {
    throw new MemorialError("no_items_selected", "Select at least one item before drafting the memorial.");
  }

  const [spaceRow, consentRow, featuredPerson, itemRows] = await Promise.all([
    findSpace(db, spaceId),
    db.query.consent.findFirst({ where: eq(consent.spaceId, spaceId) }),
    findFeaturedPerson(db, spaceId),
    db.query.item.findMany({
      where: and(eq(item.spaceId, spaceId), inArray(item.id, uniqueIds)),
    }),
  ]);

  if (!spaceRow) {
    throw new MemorialError("space_not_found", "This family space could not be found.");
  }
  if (!featuredPerson) {
    throw new MemorialError("featured_person_not_found", "The featured person for this space could not be found.");
  }

  const byId = new Map(itemRows.map((row) => [row.id, row]));
  const ineligible = uniqueIds.filter((id) => {
    const row = byId.get(id);
    return !row || !isEligibleMemorialItem(row, consentRow?.memorialUseAllowed ?? false);
  });
  if (ineligible.length > 0) {
    throw new MemorialError(
      "invalid_item_selection",
      `Only reviewed, Memorial-visible, consent-allowed items can be selected. Refused: ${ineligible.join(", ")}`,
    );
  }

  const sourceIds = [...new Set(itemRows.map((row) => row.sourceId))];
  const [sourceRows, recipeStepRows, segmentRows] = await Promise.all([
    sourceIds.length > 0
      ? db.query.source.findMany({ where: inArray(source.id, sourceIds) })
      : Promise.resolve([]),
    uniqueIds.length > 0
      ? db.query.recipeStep.findMany({
          where: inArray(recipeStep.itemId, uniqueIds),
          orderBy: asc(recipeStep.index),
        })
      : Promise.resolve([]),
    sourceIds.length > 0
      ? db.query.sourceSegment.findMany({
          where: inArray(sourceSegment.sourceId, sourceIds),
          orderBy: asc(sourceSegment.index),
        })
      : Promise.resolve([]),
  ]);

  const sourceById = new Map(sourceRows.map((row) => [row.id, row]));
  const recipeStepsByItemId = new Map<string, typeof recipeStepRows>();
  for (const row of recipeStepRows) {
    const rows = recipeStepsByItemId.get(row.itemId) ?? [];
    rows.push(row);
    recipeStepsByItemId.set(row.itemId, rows);
  }

  const segmentsBySourceId = new Map<string, typeof segmentRows>();
  for (const row of segmentRows) {
    const rows = segmentsBySourceId.get(row.sourceId) ?? [];
    rows.push(row);
    segmentsBySourceId.set(row.sourceId, rows);
  }

  const itemsInSelectionOrder: MemorialDraftItem[] = uniqueIds.map((id) => {
    const itemRow = byId.get(id)!;
    const sourceRow = sourceById.get(itemRow.sourceId);
    if (!sourceRow) {
      throw new MemorialError("invalid_item_selection", `Selected item ${id} points to a missing source.`);
    }

    const segmentLookup = new Map(
      (segmentsBySourceId.get(sourceRow.id) ?? []).map((segment) => [segment.id, segment]),
    );
    const itemSegments = Array.isArray(itemRow.segmentIds)
      ? itemRow.segmentIds
          .map((segmentId) =>
            typeof segmentId === "string" ? segmentLookup.get(segmentId) : undefined,
          )
          .filter((segment): segment is NonNullable<typeof segment> => segment != null)
          .map((segment) => ({
            id: segment.id,
            text: segment.text,
            startSeconds:
              segment.startSeconds == null ? null : Number(segment.startSeconds),
            endSeconds: segment.endSeconds == null ? null : Number(segment.endSeconds),
          }))
      : [];

    const recipeSteps = (recipeStepsByItemId.get(itemRow.id) ?? []).map((step) => ({
      kind: step.kind,
      text: step.text,
      segmentIds: Array.isArray(step.segmentIds)
        ? step.segmentIds.filter((segmentId): segmentId is string => typeof segmentId === "string")
        : [],
    }));

    return {
      id: itemRow.id,
      title: itemRow.title,
      body: itemRow.body,
      type: itemRow.type,
      origin: itemRow.origin,
      reviewState: itemRow.reviewState,
      source: {
        id: sourceRow.id,
        type: sourceRow.type,
        blobUrl: sourceRow.blobPathname,
        durationSeconds: parseDurationSeconds(sourceRow.durationSeconds),
      },
      segments: itemSegments,
      recipeSteps,
    };
  });

  return {
    featuredName: featuredPerson.displayName,
    locale: spaceRow.locale,
    voiceClipsAllowed: consentRow?.voiceClipsAllowed ?? false,
    items: itemsInSelectionOrder,
  };
}

function validatePublishedCards(cards: MemorialCard[]) {
  const orders = new Set<number>();
  for (const card of cards) {
    if (orders.has(card.order)) {
      throw new MemorialError("invalid_snapshot", "Published memorial cards must have unique order values.");
    }
    orders.add(card.order);
  }
}

async function validateCardReferences(
  db: Db,
  spaceId: string,
  cards: MemorialCard[],
) {
  const itemIds = [...new Set(cards.flatMap((card) => (card.itemId ? [card.itemId] : [])))];
  if (itemIds.length === 0) {
    return;
  }

  const consentRow = await db.query.consent.findFirst({ where: eq(consent.spaceId, spaceId) });
  const rows = await db.query.item.findMany({
    where: and(eq(item.spaceId, spaceId), inArray(item.id, itemIds)),
  });
  const byId = new Map(rows.map((row) => [row.id, row]));

  for (const card of cards) {
    if (!card.itemId) continue;
    const row = byId.get(card.itemId);
    if (!row || !isEligibleMemorialItem(row, consentRow?.memorialUseAllowed ?? false)) {
      throw new MemorialError(
        "invalid_snapshot",
        `Card ${card.order} references an item that is no longer eligible for the memorial.`,
      );
    }
    if (card.sourceId && row.sourceId !== card.sourceId) {
      throw new MemorialError(
        "invalid_snapshot",
        `Card ${card.order} references a source that does not match item ${card.itemId}.`,
      );
    }
  }
}

function captionsByCardKey(cards: MemorialCard[]) {
  const map = new Map<string, string>();
  for (const card of cards) {
    if (!card.caption) continue;
    if (card.type === "cover") {
      map.set("cover", card.caption);
      continue;
    }
    if (card.itemId) {
      map.set(`${card.type}:${card.itemId}`, card.caption);
    }
  }
  return map;
}

function selectionOrderFromCards(cards: MemorialCard[]): string[] {
  const selected: string[] = [];
  const seen = new Set<string>();

  for (const card of cards) {
    if (card.type === "closing") {
      continue;
    }
    if (card.type !== "cover" && !card.itemId) {
      throw new MemorialError(
        "invalid_snapshot",
        `Card ${card.order} must reference a reviewed memorial item before it can be published.`,
      );
    }
    if (!card.itemId || seen.has(card.itemId)) {
      continue;
    }
    seen.add(card.itemId);
    selected.push(card.itemId);
  }

  if (selected.length === 0) {
    throw new MemorialError("no_items_selected", "Select at least one item before publishing the memorial.");
  }
  return selected;
}

export async function activateMemorialMode(
  db: Db,
  input: {
    spaceId: string;
    membershipId: string;
    action: "activate" | "reverse";
    typedName?: string;
  },
) {
  const [spaceRow, featuredPerson] = await Promise.all([
    findSpace(db, input.spaceId),
    findFeaturedPerson(db, input.spaceId),
  ]);

  if (!spaceRow) {
    throw new MemorialError("space_not_found", "This family space could not be found.");
  }
  if (!featuredPerson) {
    throw new MemorialError("featured_person_not_found", "The featured person for this space could not be found.");
  }

  if (
    input.action === "activate" &&
    normalizeName(input.typedName ?? "") !== normalizeName(featuredPerson.displayName)
  ) {
    throw new MemorialError("invalid_confirmation_name", "The typed confirmation name does not match the featured person.");
  }

  const now = new Date();
  const token = spaceRow.memorialToken ?? newMemorialToken();
  const [updated] = await db
    .update(space)
    .set(
      input.action === "activate"
        ? {
            lifecycleMode: "memorial",
            memorialToken: token,
            memorialActivatedAt: now,
            memorialLinkDisabled: false,
            memorialReversedAt: null,
            updatedAt: now,
          }
        : {
            lifecycleMode: "during",
            memorialReversedAt: now,
            updatedAt: now,
          },
    )
    .where(eq(space.id, input.spaceId))
    .returning();

  await db.insert(activity).values({
    spaceId: input.spaceId,
    membershipId: input.membershipId,
    type: input.action === "activate" ? "memorial_activated" : "memorial_reversed",
    targetType: "space",
    targetId: input.spaceId,
    metadata: {
      memorialToken: updated.memorialToken,
    },
  });

  return {
    lifecycleMode: updated.lifecycleMode,
    memorialToken: updated.memorialToken,
    memorialLinkDisabled: updated.memorialLinkDisabled,
    memorialActivatedAt: updated.memorialActivatedAt,
    memorialReversedAt: updated.memorialReversedAt,
    featuredName: featuredPerson.displayName,
  };
}

export async function draftMemorialRecap(
  db: Db,
  input: { spaceId: string; itemIds: string[] },
) {
  const loaded = await loadDraftItems(db, input.spaceId, input.itemIds);
  const cards = await buildDraftSnapshot({
    featuredName: loaded.featuredName,
    locale: loaded.locale,
    voiceClipsAllowed: loaded.voiceClipsAllowed,
    items: loaded.items,
    buildCaption: async (captionInput) =>
      captionInput.cardType === "quote" || captionInput.cardType === "closing"
        ? null
        : generateMemorialCaption(db, {
            primaryModel: models.text,
            fallbackModel: models.textFallback,
            spaceId: input.spaceId,
            itemId: captionInput.item.id,
            prompt: captionPromptFromInput(captionInput),
          }),
  });

  const recapRow = await upsertRecapDraft(db, { spaceId: input.spaceId, cards });
  return { recap: recapRow, cards };
}

export async function publishMemorialRecap(
  db: Db,
  input: { spaceId: string; membershipId: string; cards: MemorialCard[] },
) {
  validatePublishedCards(input.cards);
  const selectedItemIds = selectionOrderFromCards(input.cards);
  const captionOverrides = captionsByCardKey(input.cards);
  const loaded = await loadDraftItems(db, input.spaceId, selectedItemIds);
  const rebuiltCards = await buildDraftSnapshot({
    featuredName: loaded.featuredName,
    locale: loaded.locale,
    voiceClipsAllowed: loaded.voiceClipsAllowed,
    items: loaded.items,
    buildCaption: async (captionInput) => {
      if (captionInput.cardType === "quote" || captionInput.cardType === "closing") {
        return null;
      }
      if (captionInput.cardType === "cover") {
        return captionOverrides.get("cover") ?? null;
      }
      return captionOverrides.get(`${captionInput.cardType}:${captionInput.item.id}`) ?? null;
    },
  });
  await validateCardReferences(db, input.spaceId, rebuiltCards);

  const now = new Date();
  const existing = await db.query.recap.findFirst({ where: eq(recap.spaceId, input.spaceId) });
  const [saved] = existing
    ? await db
        .update(recap)
        .set({
          status: "published",
          snapshot: rebuiltCards,
          publishedAt: now,
          publishedByMembershipId: input.membershipId,
          updatedAt: now,
        })
        .where(eq(recap.id, existing.id))
        .returning()
    : await db
        .insert(recap)
        .values({
          spaceId: input.spaceId,
          status: "published",
          snapshot: rebuiltCards,
          publishedAt: now,
          publishedByMembershipId: input.membershipId,
        })
        .returning();

  await db.insert(activity).values({
    spaceId: input.spaceId,
    membershipId: input.membershipId,
    type: "memorial_published",
    targetType: "recap",
    targetId: saved.id,
  });

  return saved;
}

export async function setMemorialLinkState(
  db: Db,
  input: { spaceId: string; membershipId: string; disabled: boolean },
) {
  const [updated] = await db
    .update(space)
    .set({ memorialLinkDisabled: input.disabled, updatedAt: new Date() })
    .where(eq(space.id, input.spaceId))
    .returning();

  if (!updated) {
    throw new MemorialError("space_not_found", "This family space could not be found.");
  }

  await db.insert(activity).values({
    spaceId: input.spaceId,
    membershipId: input.membershipId,
    type: input.disabled ? "memorial_link_disabled" : "memorial_link_enabled",
    targetType: "space",
    targetId: input.spaceId,
    metadata: {
      memorialToken: updated.memorialToken,
    },
  });

  return updated;
}

export async function getMemorialQrState(db: Db, spaceId: string) {
  const [spaceRow, recapRow] = await Promise.all([
    findSpace(db, spaceId),
    db.query.recap.findFirst({ where: eq(recap.spaceId, spaceId) }),
  ]);

  if (!spaceRow) {
    throw new MemorialError("space_not_found", "This family space could not be found.");
  }
  if (!spaceRow.memorialToken) {
    throw new MemorialError("invalid_snapshot", "Activate Memorial Mode before generating a QR link.");
  }

  const url = buildMemorialUrl(spaceRow.memorialToken);
  const qrSvg = await renderQrSvg(url);
  return {
    token: spaceRow.memorialToken,
    url,
    qrSvg,
    enabled: !spaceRow.memorialLinkDisabled,
    lifecycleMode: spaceRow.lifecycleMode,
    recapStatus: recapRow?.status ?? null,
  };
}

export async function listModerationContributions(
  db: Db,
  input: { spaceId: string; status?: "pending" | "approved" | "rejected" },
) {
  return db.query.contribution.findMany({
    where: and(
      eq(contribution.spaceId, input.spaceId),
      input.status ? eq(contribution.status, input.status) : undefined,
    ),
    orderBy: [desc(contribution.submittedAt), desc(contribution.id)],
  });
}

export async function moderateContribution(
  db: Db,
  input: {
    spaceId: string;
    membershipId: string;
    contributionId: string;
    status: "approved" | "rejected";
  },
) {
  const existing = await db.query.contribution.findFirst({
    where: and(eq(contribution.id, input.contributionId), eq(contribution.spaceId, input.spaceId)),
  });
  if (!existing) {
    throw new MemorialError("contribution_not_found", "That memorial contribution could not be found.");
  }

  const [updated] = await db
    .update(contribution)
    .set({
      status: input.status,
      reviewedByMembershipId: input.membershipId,
      reviewedAt: new Date(),
    })
    .where(eq(contribution.id, input.contributionId))
    .returning();

  await db.insert(activity).values({
    spaceId: input.spaceId,
    membershipId: input.membershipId,
    type: input.status === "approved" ? "contribution_approved" : "contribution_rejected",
    targetType: "contribution",
    targetId: input.contributionId,
  });

  return updated;
}

async function uploadContributionFile(
  spaceId: string,
  prefix: "photo" | "audio",
  file: File,
): Promise<string> {
  const result = await put(`contributions/${spaceId}/${prefix}`, file, {
    access: "public",
    contentType: file.type,
  });
  return result.url;
}

function inputTypesForContribution(input: {
  textContent: string | null;
  photoBlobPathname: string | null;
  audioBlobPathname: string | null;
}) {
  return [
    input.textContent ? "text" : null,
    input.photoBlobPathname ? "photo" : null,
    input.audioBlobPathname ? "audio" : null,
  ].filter((value): value is "text" | "photo" | "audio" => value != null);
}

export async function submitPublicContribution(
  db: Db,
  input: { request: Request; spaceId: string; visitId?: string | null },
) {
  const form = await input.request.formData();

  const displayName = String(form.get("displayName") ?? "").trim();
  const relationship = String(form.get("relationship") ?? "").trim();
  const textContentRaw = form.get("text");
  const textContent =
    typeof textContentRaw === "string" && textContentRaw.trim() ? textContentRaw.trim() : null;

  if (!displayName || !relationship) {
    throw new MemorialError(
      "invalid_snapshot",
      "Display name and relationship are required for a memorial contribution.",
    );
  }

  const submittedIpHash = hashSubmittedIp(getClientIp(input.request));
  const [rateRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(contribution)
    .where(
      and(
        eq(contribution.spaceId, input.spaceId),
        eq(contribution.submittedIpHash, submittedIpHash),
        gte(contribution.submittedAt, contributionWindowStart()),
      ),
    );
  const recentCount = Number(rateRow?.count ?? 0);
  if (isContributionRateLimited(recentCount)) {
    throw new MemorialError("rate_limited", "Please wait a few minutes before sharing another memory.");
  }

  const photo = form.get("photo");
  const audio = form.get("audio");

  let photoBlobPathname: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    const sourceType = sourceTypeFromMime(photo.type);
    if (sourceType !== "photo") {
      throw new MemorialError("invalid_snapshot", "Photo uploads must be a supported image type.");
    }

    const validationError = validateUpload({
      sourceType,
      mimeType: photo.type,
      byteSize: photo.size,
    });
    if (validationError) {
      throw new MemorialError("invalid_snapshot", validationError.message);
    }

    const bytes = new Uint8Array(await photo.arrayBuffer());
    if (sniffFileKind(bytes) !== "photo") {
      throw new MemorialError("invalid_snapshot", "Photo upload bytes do not match the declared image type.");
    }

    photoBlobPathname = await uploadContributionFile(input.spaceId, "photo", photo);
  }

  let audioBlobPathname: string | null = null;
  if (audio instanceof File && audio.size > 0) {
    const sourceType = sourceTypeFromMime(audio.type);
    if (sourceType !== "audio") {
      throw new MemorialError("invalid_snapshot", "Voice-note uploads must be a supported audio type.");
    }

    const validationError = validateUpload({
      sourceType,
      mimeType: audio.type,
      byteSize: audio.size,
    });
    if (validationError) {
      throw new MemorialError("invalid_snapshot", validationError.message);
    }

    const bytes = new Uint8Array(await audio.arrayBuffer());
    if (sniffFileKind(bytes) !== "audio") {
      throw new MemorialError("invalid_snapshot", "Audio upload bytes do not match the declared audio type.");
    }

    audioBlobPathname = await uploadContributionFile(input.spaceId, "audio", audio);
  }

  if (!textContent && !photoBlobPathname && !audioBlobPathname) {
    throw new MemorialError(
      "invalid_snapshot",
      "A contribution needs text, photo, or audio before it can be submitted.",
    );
  }

  const [created] = await db
    .insert(contribution)
    .values({
      spaceId: input.spaceId,
      displayName,
      relationship,
      textContent,
      photoBlobPathname,
      audioBlobPathname,
      submittedIpHash,
    })
    .returning();

  await db.insert(event).values({
    spaceId: input.spaceId,
    type: "share_submitted",
    visitId: input.visitId ?? null,
    properties: {
      inputTypes: inputTypesForContribution({ textContent, photoBlobPathname, audioBlobPathname }),
    },
  });

  return created;
}

export async function listApprovedPublicContributions(db: Db, spaceId: string) {
  return db.query.contribution.findMany({
    where: and(eq(contribution.spaceId, spaceId), eq(contribution.status, "approved")),
    orderBy: [asc(contribution.submittedAt), asc(contribution.id)],
  });
}

export async function getPublicMemorialSnapshot(db: Db, token: string) {
  const [row] = await db
    .select({
      spaceId: space.id,
      locale: space.locale,
      featuredName: person.displayName,
      lifecycleMode: space.lifecycleMode,
      memorialLinkDisabled: space.memorialLinkDisabled,
      memorialUseAllowed: consent.memorialUseAllowed,
      withdrawnAt: consent.withdrawnAt,
      recapStatus: recap.status,
      snapshot: recap.snapshot,
    })
    .from(space)
    .leftJoin(recap, eq(recap.spaceId, space.id))
    .leftJoin(consent, eq(consent.spaceId, space.id))
    .leftJoin(person, and(eq(person.spaceId, space.id), eq(person.isFeatured, true)))
    .where(eq(space.memorialToken, token))
    .limit(1);

  if (
    !row ||
    row.lifecycleMode !== "memorial" ||
    row.memorialLinkDisabled ||
    !row.memorialUseAllowed ||
    row.withdrawnAt != null ||
    row.recapStatus !== "published"
  ) {
    return null;
  }

  const parsed = memorialCardSchema.array().safeParse(row.snapshot);
  if (!parsed.success) {
    throw new MemorialError("invalid_snapshot", "The published memorial snapshot is invalid.");
  }

  const contributions = await listApprovedPublicContributions(db, row.spaceId);
  return {
    spaceId: row.spaceId,
    locale: row.locale,
    featuredName: row.featuredName,
    cards: parsed.data.sort((a, b) => a.order - b.order),
    contributions: contributions.map((entry) => ({
      id: entry.id,
      displayName: entry.displayName,
      relationship: entry.relationship,
      textContent: entry.textContent,
      photoBlobPathname: entry.photoBlobPathname,
      audioBlobPathname: entry.audioBlobPathname,
      origin: "about_them" as const,
      status: entry.status,
      submittedAt: entry.submittedAt,
    })),
  };
}
