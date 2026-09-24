import { visibilitySchema } from "@gunita/core";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ReviewError, applyVisibilityChange } from "@/src/access/review";
import { requireMembership } from "@/src/access/session";
import { errorResponse } from "@/src/auth/http";
import { db } from "@/src/db";
import { item } from "@/src/db/schema";

const visibilityBodySchema = z.object({
  visibility: visibilitySchema,
  withFeaturedPerson: z.boolean().default(false),
});

const VISIBILITY_ERROR_STATUS: Record<ReviewError["code"], number> = {
  item_not_found: 404,
  dispute_needs_note: 400,
  memorial_not_consented: 403,
  consent_ceiling: 403,
};

// PATCH /api/items/:id/visibility {visibility, withFeaturedPerson?} — steward-only (System Design
// "Security & access": visibility changes are a steward-only action).
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
    const parsed = visibilityBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
    }

    try {
      const updated = await applyVisibilityChange(
        db,
        target,
        { nextVisibility: parsed.data.visibility, withFeaturedPerson: parsed.data.withFeaturedPerson },
        { actingMembershipId: membership.membershipId },
      );
      return NextResponse.json({ item: updated });
    } catch (error) {
      if (error instanceof ReviewError) {
        return NextResponse.json({ error: error.code }, { status: VISIBILITY_ERROR_STATUS[error.code] });
      }
      throw error;
    }
  } catch (error) {
    return errorResponse(error);
  }
}
