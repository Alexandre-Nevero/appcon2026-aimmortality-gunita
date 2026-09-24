import { reviewActionSchema, visibilitySchema } from "@gunita/core";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ReviewError, applyItemReview } from "@/src/access/review";
import { requireMembership } from "@/src/access/session";
import { errorResponse } from "@/src/auth/http";
import { models } from "@/src/ai/models";
import { db } from "@/src/db";
import { item } from "@/src/db/schema";

const reviewBodySchema = z.object({
  action: reviewActionSchema,
  note: z.string().nullable().optional(),
  edits: z.object({ title: z.string().optional(), body: z.string().optional() }).optional(),
  visibility: visibilitySchema.optional(),
  withFeaturedPerson: z.boolean().default(false),
});

const REVIEW_ERROR_STATUS: Record<ReviewError["code"], number> = {
  item_not_found: 404,
  dispute_needs_note: 400,
  memorial_not_consented: 403,
  consent_ceiling: 403,
};

// PATCH /api/items/:id/review {action, note?, edits?, visibility?, withFeaturedPerson?}
// Steward-only (System Design "Security & access": review is a steward-only action; BR-021 —
// review always records the steward, with or without the featured person present).
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: itemId } = await context.params;

    const target = await db.query.item.findFirst({ where: eq(item.id, itemId) });
    if (!target) {
      return NextResponse.json({ error: "item_not_found" }, { status: 404 });
    }

    const membership = await requireMembership(request, target.spaceId);
    if (membership.role !== "steward") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    const parsed = reviewBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
    }

    try {
      const updated = await applyItemReview(
        db,
        target,
        {
          action: parsed.data.action,
          note: parsed.data.note ?? undefined,
          edits: parsed.data.edits,
          visibility: parsed.data.visibility,
          withFeaturedPerson: parsed.data.withFeaturedPerson,
        },
        { reviewerMembershipId: membership.membershipId, embedModel: models.embed },
      );
      return NextResponse.json({ item: updated });
    } catch (error) {
      if (error instanceof ReviewError) {
        return NextResponse.json({ error: error.code }, { status: REVIEW_ERROR_STATUS[error.code] });
      }
      throw error;
    }
  } catch (error) {
    return errorResponse(error);
  }
}
