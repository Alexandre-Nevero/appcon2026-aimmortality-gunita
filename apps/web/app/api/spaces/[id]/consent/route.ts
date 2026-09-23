import { z } from "zod";

import {
  recordConsentForSpace,
  requireSpace,
  requireStewardMembership,
  withdrawConsentForSpace,
} from "@/src/auth/store";
import { ApiError } from "@/src/auth/errors";
import { errorResponse, jsonResponse, parseJsonBody } from "@/src/auth/http";
import { requireSession } from "@/src/auth/session";

const recordConsentSchema = z.object({
  action: z.literal("record").optional().default("record"),
  evidenceType: z.enum(["voice", "written"]),
  evidenceText: z.string().trim().min(1).max(4_000),
  evidenceMediaReferenceId: z.string().trim().min(1).max(255).optional(),
  participationApproved: z.boolean().default(true),
  aiProcessingAllowed: z.boolean(),
  familyVisibilityDefault: z.enum(["family", "private"]).default("family"),
  memorialUseAllowed: z.boolean(),
  voiceClipsAllowed: z.boolean(),
  stewardAttestation: z.boolean(),
});

const withdrawConsentSchema = z.object({
  action: z.literal("withdraw"),
  reason: z.string().trim().min(1).max(500).optional(),
});

const consentSchema = z.union([recordConsentSchema, withdrawConsentSchema]);

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const session = await requireSession(request);
    const { id: spaceId } = await context.params;
    const body = await parseJsonBody(request, consentSchema);

    requireSpace(spaceId);
    requireStewardMembership(spaceId, session.user.id);

    if (body.action === "withdraw") {
      const consent = withdrawConsentForSpace({
        spaceId,
        reason: body.reason,
      });

      return jsonResponse({ consent });
    }

    if (!body.stewardAttestation) {
      throw new ApiError(
        400,
        "STEWARD_ATTESTATION_REQUIRED",
        "The steward must attest that the featured person understood the consent.",
      );
    }

    if (!body.participationApproved) {
      throw new ApiError(
        400,
        "PARTICIPATION_APPROVAL_REQUIRED",
        "Consent must explicitly approve the featured person's participation.",
      );
    }

    if (body.evidenceType === "voice" && !body.evidenceMediaReferenceId) {
      throw new ApiError(
        400,
        "VOICE_EVIDENCE_REFERENCE_REQUIRED",
        "Voice consent evidence must include a private audio source reference.",
      );
    }

    if (body.voiceClipsAllowed && !body.memorialUseAllowed) {
      throw new ApiError(
        400,
        "VOICE_CLIPS_REQUIRE_MEMORIAL_USE",
        "Voice clips cannot be enabled when memorial use is declined.",
      );
    }

    const result = recordConsentForSpace({
      spaceId,
      userId: session.user.id,
      evidenceType: body.evidenceType,
      evidenceText: body.evidenceText,
      evidenceMediaReferenceId: body.evidenceMediaReferenceId,
      participationApproved: body.participationApproved,
      aiProcessingAllowed: body.aiProcessingAllowed,
      familyVisibilityDefault: body.familyVisibilityDefault,
      memorialUseAllowed: body.memorialUseAllowed,
      voiceClipsAllowed: body.voiceClipsAllowed,
      stewardAttestation: body.stewardAttestation,
    });

    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
