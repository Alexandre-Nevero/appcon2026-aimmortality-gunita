import {
  canChangeVisibility,
  canSetMemorialVisibility,
  reviewTransition,
  type ReviewAction,
  type ReviewState,
  type Visibility,
  type VisibilitySetBy,
} from "@gunita/core";
import type { EmbeddingModel } from "ai";
import { eq } from "drizzle-orm";

import { embedText } from "../ai/embed";
import type { db as Database } from "../db";
import { activity, consent, item, itemRevision } from "../db/schema";

type Db = typeof Database;
// Derived from the query function's own return type rather than hand-duplicated, so this stays
// correct if the item table's shape changes.
type ItemRow = NonNullable<Awaited<ReturnType<Db["query"]["item"]["findFirst"]>>>;

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

export interface ReviewInput {
  action: ReviewAction;
  note?: string;
  edits?: { title?: string; body?: string };
  visibility?: Visibility; // only honored on an item's first review (BR-030 default is "family")
  withFeaturedPerson: boolean;
}

export interface ReviewDecision {
  nextState: ReviewState;
  title: string;
  body: string;
  disputeNote: string | null;
  nextVisibility: Visibility | null;
  nextVisibilitySetBy: VisibilitySetBy | null;
  shouldEmbed: boolean;
  previousValue: Record<string, unknown>;
}

const EMBEDDABLE_STATES: ReviewState[] = ["verified", "corrected", "uncertain", "disputed"];

// Pure: the whole BR-020/BR-030/BR-031 decision, given the item's current row and the request.
// Split out from the DB-writing applyItemReview() below so it's unit-testable without a database
// (same reasoning as apps/web/src/ai/extract.ts's extractItems/validateExtractedItems split).
export function computeReviewDecision(
  current: Pick<
    ItemRow,
    "reviewState" | "visibility" | "visibilitySetBy" | "title" | "body" | "disputeNote"
  >,
  input: ReviewInput,
  memorialUseAllowed: boolean,
): ReviewDecision {
  let nextState: ReviewState;
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

  // BR-020: edits are only meaningful for "correct" — applying them on confirm/reject/dispute/
  // uncertain would silently change content while recording the action as unmodified acceptance.
  const applyEdits = input.action === "correct";
  const title = applyEdits && input.edits?.title ? input.edits.title : current.title;
  const body = applyEdits && input.edits?.body ? input.edits.body : current.body;

  // BR-030: visibility defaults to Family the first time an item is reviewed; re-reviews never
  // change it here — that's the separate applyVisibilityChange()'s job (BR-032 consent ceiling).
  let nextVisibility: Visibility | null = current.visibility;
  let nextVisibilitySetBy: VisibilitySetBy | null = current.visibilitySetBy;
  if (current.visibility == null) {
    nextVisibility = input.visibility ?? "family";
    nextVisibilitySetBy = input.withFeaturedPerson ? "featured_person" : "steward";
    if (nextVisibility === "memorial" && !canSetMemorialVisibility({ memorialUseAllowed })) {
      throw new ReviewError(
        "memorial_not_consented",
        "Memorial visibility requires the featured person's consent (BR-031)",
      );
    }
  }

  return {
    nextState,
    title,
    body,
    disputeNote: input.action === "dispute" ? (input.note ?? null) : current.disputeNote,
    nextVisibility,
    nextVisibilitySetBy,
    shouldEmbed: EMBEDDABLE_STATES.includes(nextState),
    previousValue,
  };
}

// System Design "Review → searchable": persists computeReviewDecision()'s result, then embeds
// (confirm/correct/uncertain/dispute) or drops the embedding (reject), then writes item_revision
// (BR-071). The revision is written *before* the item update — if the process dies in between, an
// unconfirmed extra revision is a smaller problem than silently losing the "previous value" history
// BR-071 requires (there's still no cross-statement transaction; the Neon HTTP driver doesn't
// support one — see apps/web/src/ai/pipeline.ts).
export async function applyItemReview(
  db: Db,
  currentItem: ItemRow,
  input: ReviewInput,
  options: { reviewerMembershipId: string; embedModel: EmbeddingModel },
) {
  const consentRow = await db.query.consent.findFirst({ where: eq(consent.spaceId, currentItem.spaceId) });
  const decision = computeReviewDecision(currentItem, input, consentRow?.memorialUseAllowed ?? false);

  await db.insert(itemRevision).values({
    itemId: currentItem.id,
    action: input.action,
    note: input.note ?? null,
    previousValue: decision.previousValue,
    changedByMembershipId: options.reviewerMembershipId,
    changedWithFeaturedPerson: input.withFeaturedPerson,
  });

  const embedding = decision.shouldEmbed
    ? await embedText(options.embedModel, `${decision.title}\n${decision.body}`, "RETRIEVAL_DOCUMENT")
    : null;

  const [updated] = await db
    .update(item)
    .set({
      title: decision.title,
      body: decision.body,
      reviewState: decision.nextState,
      visibility: decision.nextVisibility,
      visibilitySetBy: decision.nextVisibilitySetBy,
      disputeNote: decision.disputeNote,
      reviewedByMembershipId: options.reviewerMembershipId,
      reviewedWithFeaturedPerson: input.withFeaturedPerson,
      reviewedAt: new Date(),
      embedding,
    })
    .where(eq(item.id, currentItem.id))
    .returning();

  return updated;
}

export interface VisibilityChangeInput {
  nextVisibility: Visibility;
  withFeaturedPerson: boolean;
}

// Pure: BR-031 (memorial needs consent) + BR-032 (the consent ceiling) decision.
export function checkVisibilityChange(
  current: { visibility: Visibility | null; visibilitySetBy: VisibilitySetBy | null },
  input: VisibilityChangeInput,
  memorialUseAllowed: boolean,
): void {
  if (input.nextVisibility === "memorial" && !canSetMemorialVisibility({ memorialUseAllowed })) {
    throw new ReviewError(
      "memorial_not_consented",
      "Memorial visibility requires the featured person's consent (BR-031)",
    );
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
}

// PATCH /api/items/:id/visibility — the frozen route contract's dedicated visibility-change
// endpoint (separate from review, System Design §0.1). Also writes an `activity` row (BR-021:
// actor identity must be recorded) — item_revision.action is one of BR-020's five review actions
// and a pure visibility change isn't any of them, so this uses the space-level audit log instead.
export async function applyVisibilityChange(
  db: Db,
  currentItem: ItemRow,
  input: VisibilityChangeInput,
  options: { actingMembershipId: string },
) {
  const consentRow = await db.query.consent.findFirst({ where: eq(consent.spaceId, currentItem.spaceId) });
  checkVisibilityChange(currentItem, input, consentRow?.memorialUseAllowed ?? false);

  const [updated] = await db
    .update(item)
    .set({
      visibility: input.nextVisibility,
      visibilitySetBy: input.withFeaturedPerson ? "featured_person" : "steward",
    })
    .where(eq(item.id, currentItem.id))
    .returning();

  await db.insert(activity).values({
    spaceId: currentItem.spaceId,
    membershipId: options.actingMembershipId,
    type: "item_visibility_changed",
    targetType: "item",
    targetId: currentItem.id,
    metadata: { from: currentItem.visibility, to: input.nextVisibility },
  });

  return updated;
}
