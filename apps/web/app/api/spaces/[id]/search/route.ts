import { and, asc, cosineDistance, eq, isNotNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { requireMembership } from "@/src/access/session";
import { archiveReviewStateFilter, visibilityFilter } from "@/src/access/visibility";
import { embedText } from "@/src/ai/embed";
import { models } from "@/src/ai/models";
import { errorResponse } from "@/src/auth/http";
import { db } from "@/src/db";
import { item } from "@/src/db/schema";

const SEARCH_RESULT_LIMIT = 20;

// GET /api/spaces/:id/search?q=... — F-011: meaning-based search over reviewed items. Same
// BR-022/BR-033 filter shape as the archive (packages/core canViewerSeeVisibility, derived, not
// re-encoded). Similarity scores are Methods "internal; never displayed" — used only to order the
// query, never returned in the response.
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: spaceId } = await context.params;
    const membership = await requireMembership(request, spaceId);

    const q = request.nextUrl.searchParams.get("q")?.trim();
    if (!q) {
      return NextResponse.json({ error: "missing_query" }, { status: 400 });
    }

    const queryEmbedding = await embedText(models.embed, q, "RETRIEVAL_QUERY");

    const rows = await db.query.item.findMany({
      // The embedding itself is internal (Methods: similarity scores "are internal; they are never
      // displayed") — excluded from the response, only used server-side to order the query.
      columns: { embedding: false },
      where: and(
        eq(item.spaceId, spaceId),
        archiveReviewStateFilter(),
        isNotNull(item.visibility),
        isNotNull(item.embedding),
        visibilityFilter(membership.role),
      ),
      orderBy: asc(cosineDistance(item.embedding, queryEmbedding)),
      limit: SEARCH_RESULT_LIMIT,
    });

    // No match → empty state, never generated text (F-011 acceptance criteria).
    return NextResponse.json({ items: rows });
  } catch (error) {
    return errorResponse(error);
  }
}
