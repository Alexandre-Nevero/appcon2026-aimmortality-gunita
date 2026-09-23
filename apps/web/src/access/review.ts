import {
  canChangeVisibility,
  canSetMemorialVisibility,
  reviewTransition,
  type ReviewAction,
  type Visibility,
  type VisibilitySetBy,
} from "@gunita/core";
import type { EmbeddingModel } from "ai";
import { eq } from "drizzle-orm";

import { embedText } from "../ai/embed";
import type { db as Database } from "../db";
import { consent, item, itemRevision } from "../db/schema";

type Db = typeof Database;

export class ReviewError extends Error {
  constructor(
    public readonly code:
      | "dispute_needs_note"
      | "memorial_not_consented"
      | "item_not_found"
      | "consent_ceiling",
    message: string,
  ) {
    super(message);
  }
}

export interface ApplyReviewInput {
  itemId: string;
  action: ReviewAction;
  note?: string;
  edits?: { title?: string; body?: string };
  visibility?: Visibility; // only honored on an item's first review (BR-030 default is "family")
  reviewerMembershipId: string;
  withFeaturedPerson: boolean;
  embedModel: EmbeddingModel;
}

// System Design "Review → searchable": core.reviewTransition (BR-020) → item_revision (BR-071,
// previous value kept) → embed on confirm/correct/uncertain/dispute, drop the embedding on reject
// (BR-022: only reviewed, non-rejected items are retrievable).
export async function applyItemReview(db: Db, input: ApplyReviewInput) {
  const current = await db.query.item.findFirst({ where: eq(item.id, input.itemId) });
  if (!current) throw new ReviewError("item_not_found", `Item ${input.itemId} not found`);

  let nextState;
  try {
    nextState = reviewTransition(current.reviewState, input.action, { note: input.note });
  } catch {
    throw new ReviewError("dispute_needs_note", "Dispute cannot be saved without a note (BR-020)");
  }

  const previousValue = {
    title: current.title,
    body: current.body,
    reviewState: current.reviewState,
    visibility: current.visibility,
    visibilitySetBy: current.visibilitySetBy,
    disputeNote: current.disputeNote,
  };

  // BR-030: visibility defaults to Family the first time an item is reviewed; a caller may pass an
  // explicit initial value instead. Re-reviews never change visibility here — that's the separate
  // PATCH /api/items/:id/visibility endpoint's job (BR-032 consent ceiling applies there).
  let nextVisibility: Visibility | null = current.visibility;
  let nextVisibilitySetBy: VisibilitySetBy | null = current.visibilitySetBy;
  if (current.visibility == null) {
    nextVisibility = input.visibility ?? "family";
    nextVisibilitySetBy = input.withFeaturedPerson ? "featured_person" : "steward";
    if (nextVisibility === "memorial") {
      const consentRow = await db.query.consent.findFirst({ where: eq(consent.spaceId, current.spaceId) });
      if (!canSetMemorialVisibility({ memorialUseAllowed: consentRow?.memorialUseAllowed ?? false })) {
        throw new ReviewError(
          "memorial_not_consented",
          "Memorial visibility requires the featured person's consent (BR-031)",
        );
      }
    }
  }

  const embeddableStates = ["verified", "corrected", "uncertain", "disputed"];
  const embedding = embeddableStates.includes(nextState)
    ? await embedText(
        input.embedModel,
        `${input.edits?.title ?? current.title}\n${input.edits?.body ?? current.body}`,
        "RETRIEVAL_DOCUMENT",
      )
    : null;

  const [updated] = await db
    .update(item)
    .set({
      title: input.edits?.title ?? current.title,
      body: input.edits?.body ?? current.body,
      reviewState: nextState,
      visibility: nextVisibility,
      visibilitySetBy: nextVisibilitySetBy,
      disputeNote: input.action === "dispute" ? (input.note ?? null) : current.disputeNote,
      reviewedByMembershipId: input.reviewerMembershipId,
      reviewedWithFeaturedPerson: input.withFeaturedPerson,
      reviewedAt: new Date(),
      embedding,
    })
    .where(eq(item.id, input.itemId))
    .returning();

  await db.insert(itemRevision).values({
    itemId: input.itemId,
    action: input.action,
    note: input.note ?? null,
    previousValue,
    changedByMembershipId: input.reviewerMembershipId,
    changedWithFeaturedPerson: input.withFeaturedPerson,
  });

  return updated;
}

export interface ApplyVisibilityChangeInput {
  itemId: string;
  nextVisibility: Visibility;
  withFeaturedPerson: boolean;
}

// PATCH /api/items/:id/visibility — the frozen route contract's dedicated visibility-change
// endpoint (separate from review, System Design §0.1). Enforces BR-031 (memorial needs consent)
// and BR-032 (the consent ceiling: only the featured person, never the steward alone, can raise a
// Private item they set — before or after death).
export async function applyVisibilityChange(db: Db, input: ApplyVisibilityChangeInput) {
  const current = await db.query.item.findFirst({ where: eq(item.id, input.itemId) });
  if (!current) throw new ReviewError("item_not_found", `Item ${input.itemId} not found`);

  if (input.nextVisibility === "memorial") {
    const consentRow = await db.query.consent.findFirst({ where: eq(consent.spaceId, current.spaceId) });
    if (!canSetMemorialVisibility({ memorialUseAllowed: consentRow?.memorialUseAllowed ?? false })) {
      throw new ReviewError(
        "memorial_not_consented",
        "Memorial visibility requires the featured person's consent (BR-031)",
      );
    }
  }

  const allowed = canChangeVisibility({
    currentVisibility: current.visibility,
    currentVisibilitySetBy: current.visibilitySetBy,
    nextVisibility: input.nextVisibility,
    withFeaturedPerson: input.withFeaturedPerson,
  });
  if (!allowed) {
    throw new ReviewError(
      "consent_ceiling",
      "A Private item the featured person set can never be raised by the steward alone (BR-032)",
    );
  }

  const [updated] = await db
    .update(item)
    .set({
      visibility: input.nextVisibility,
      visibilitySetBy: input.withFeaturedPerson ? "featured_person" : "steward",
    })
    .where(eq(item.id, input.itemId))
    .returning();

  return updated;
}
