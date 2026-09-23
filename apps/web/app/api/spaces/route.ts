import { localeSchema } from "@gunita/core";
import { z } from "zod";

import { createSpaceForSteward } from "@/src/auth/store";
import { errorResponse, jsonResponse, parseJsonBody } from "@/src/auth/http";
import { requireSession } from "@/src/auth/session";

const createSpaceSchema = z
  .object({
    featuredPersonName: z.string().trim().min(1).max(120),
    locale: localeSchema,
  });

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await requireSession(request);
    const body = await parseJsonBody(request, createSpaceSchema);
    const result = await createSpaceForSteward({
      featuredPersonName: body.featuredPersonName,
      locale: body.locale,
      userId: session.user.id,
    });

    return jsonResponse(
      {
        space: result.space,
        membership: result.membership,
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
