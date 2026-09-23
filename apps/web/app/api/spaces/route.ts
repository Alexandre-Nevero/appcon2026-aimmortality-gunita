import { z } from "zod";

import { createSpaceForSteward } from "@/src/auth/store";
import { errorResponse, jsonResponse, parseJsonBody } from "@/src/auth/http";
import { requireSession } from "@/src/auth/session";

const createSpaceSchema = z
  .object({
    featuredPersonName: z.string().trim().min(1).max(120).optional(),
    name: z.string().trim().min(1).max(120).optional(),
    locale: z.enum(["fil", "en"]),
  })
  .superRefine((value, context) => {
    if (!value.featuredPersonName && !value.name) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["featuredPersonName"],
        message: "Provide the featured person's name.",
      });
    }
  });

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await requireSession(request);
    const body = await parseJsonBody(request, createSpaceSchema);
    const featuredPersonName = body.featuredPersonName ?? body.name!;
    const result = createSpaceForSteward({
      featuredPersonName,
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
