import { and, eq, isNotNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { archiveReviewStateFilter, visibilityFilter } from "@/src/access/visibility";
import { requireMembership } from "@/src/access/session";
import { errorResponse } from "@/src/auth/http";
import { db } from "@/src/db";
import { item } from "@/src/db/schema";

// GET /api/spaces/:id/items?reviewState=ai_suggestion
//
// Two modes, matching the two UI surfaces this endpoint serves (S-011 review queue, S-012 archive):
//  - reviewState=ai_suggestion → the review queue. Steward-only (BR-010: unreviewed items are never
//    shown to anyone as fact, and family members never see them at all pre-review).
//  - no reviewState (default) → the archive. BR-022 (reviewed, non-rejected only) + BR-033
//    (visibility checked in the query itself, not after) via packages/core's canViewerSeeVisibility.
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: spaceId } = await context.params;
    const membership = await requireMembership(request, spaceId);

    const reviewStateParam = request.nextUrl.searchParams.get("reviewState");

    if (reviewStateParam === "ai_suggestion") {
      if (membership.role !== "steward") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      const rows = await db.query.item.findMany({
        where: and(eq(item.spaceId, spaceId), eq(item.reviewState, "ai_suggestion")),
      });
      return NextResponse.json({ items: rows });
    }

    if (reviewStateParam != null) {
      return NextResponse.json({ error: "unsupported_review_state_filter" }, { status: 400 });
    }

    const rows = await db.query.item.findMany({
      where: and(
        eq(item.spaceId, spaceId),
        archiveReviewStateFilter(),
        isNotNull(item.visibility),
        visibilityFilter(membership.role),
      ),
    });
    return NextResponse.json({ items: rows });
  } catch (error) {
    return errorResponse(error);
  }
}
