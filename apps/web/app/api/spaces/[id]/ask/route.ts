import { ApiError } from "@/src/auth/errors";
import { errorResponse, jsonResponse, parseJsonBody } from "@/src/auth/http";
import { requireSession } from "@/src/auth/session";
import { assertSpaceAllowsAiProcessing, findMembership, requireSpace } from "@/src/auth/store";
import { models } from "@/src/ai/models";
import { db } from "@/src/db";
import { askRequestSchema, askSpaceQuestion } from "@/src/ask/service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

// POST /api/spaces/:id/ask {question} — F-012/F-013/F-022: family-only Ask GUNITA
// (retrieve → τ → generate → validate → abstain).
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const session = await requireSession(request);
    const { id: spaceId } = await context.params;
    const body = await parseJsonBody(request, askRequestSchema);

    const spaceRow = await requireSpace(spaceId);
    const membership = await findMembership(spaceId, session.user.id);

    if (!membership) {
      throw new ApiError(403, "SPACE_ACCESS_DENIED", "You are not a member of this family space.");
    }

    await assertSpaceAllowsAiProcessing(spaceId);

    const featuredPerson = await db.query.person.findFirst({
      where: (person, { and, eq }) => and(eq(person.spaceId, spaceId), eq(person.isFeatured, true)),
      columns: { displayName: true },
    });

    const answer = await askSpaceQuestion(
      db,
      {
        spaceId,
        membershipId: membership.id,
        membershipRole: membership.role,
        locale: membership.localeOverride ?? spaceRow.locale,
        lifecycleMode: spaceRow.lifecycleMode,
        featuredName: featuredPerson?.displayName ?? null,
        question: body.question,
      },
      models,
    );

    return jsonResponse(answer);
  } catch (error) {
    return errorResponse(error);
  }
}
