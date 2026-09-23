import { z } from "zod";

import { createInviteForSpace, requireSpace, requireStewardMembership } from "@/src/auth/store";
import { errorResponse, jsonResponse, parseJsonBody } from "@/src/auth/http";
import { requireSession } from "@/src/auth/session";

const createInviteSchema = z.object({
  expiresInDays: z.coerce.number().int().min(1).max(30).default(7),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const session = await requireSession(request);
    const { id: spaceId } = await context.params;
    const body = await parseJsonBody(request, createInviteSchema, {
      allowEmpty: true,
      emptyValue: {},
    });

    await requireSpace(spaceId);
    const stewardMembership = await requireStewardMembership(spaceId, session.user.id);

    const invite = await createInviteForSpace({
      spaceId,
      createdByMembership: stewardMembership,
      expiresInDays: body.expiresInDays,
    });

    return jsonResponse({ invite }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
