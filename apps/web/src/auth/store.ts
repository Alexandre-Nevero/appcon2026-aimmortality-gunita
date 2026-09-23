import { randomBytes, randomUUID } from "node:crypto";

import type { Locale, MembershipRole, Visibility } from "@gunita/core";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { ApiError } from "@/src/auth/errors";
import { db } from "@/src/db";
import {
  activity,
  authUser,
  authVerification,
  consent,
  membership,
  person,
  source,
  space,
} from "@/src/db/schema";
import { uploadSourceFile } from "@/src/media/blob";

const inviteCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const inviteCodeLength = 10;
const inviteIdentifierPrefix = "invite:";

const consentArtifactSchema = z.object({
  consent: z.object({
    evidenceType: z.enum(["voice", "written"]),
    transcript: z.string(),
    mediaReferenceId: z.string().nullable(),
    familyVisibilityDefault: z.enum(["family", "private"]),
    stewardAttestation: z.boolean(),
  }),
});

type MembershipRow = typeof membership.$inferSelect;
type SpaceRow = typeof space.$inferSelect;
type SourceRow = typeof source.$inferSelect;
type ConsentRow = typeof consent.$inferSelect;
type AuthUserRow = typeof authUser.$inferSelect;
type AuthVerificationRow = typeof authVerification.$inferSelect;

type ConsentEvidenceType = "voice" | "written";

const invitePayloadSchema = z.object({
  spaceId: z.string().uuid(),
  role: z.literal("family"),
  invitedByMembershipId: z.string().uuid(),
  createdByUserId: z.string(),
});

type InvitePayload = z.infer<typeof invitePayloadSchema>;

function now(): Date {
  return new Date();
}

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

function inviteIdentifier(code: string): string {
  return `${inviteIdentifierPrefix}${normalizeInviteCode(code)}`;
}

function createInviteCode(): string {
  let code = "";

  while (code.length < inviteCodeLength) {
    for (const byte of randomBytes(inviteCodeLength)) {
      const unbiasedMax = Math.floor(256 / inviteCodeAlphabet.length) * inviteCodeAlphabet.length;

      if (byte >= unbiasedMax) {
        continue;
      }

      code += inviteCodeAlphabet[byte % inviteCodeAlphabet.length];

      if (code.length === inviteCodeLength) {
        return code;
      }
    }
  }

  return code;
}

function parseConsentArtifact(row: SourceRow | undefined) {
  const parsed = consentArtifactSchema.safeParse(row?.artifactContext);

  return parsed.success ? parsed.data.consent : null;
}

function parseInvitePayload(row: AuthVerificationRow): InvitePayload {
  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(row.value);
  } catch (error) {
    throw new ApiError(
      500,
      "INVITE_DATA_INVALID",
      "Stored invite data is invalid JSON.",
      error instanceof Error ? { cause: error.message } : undefined,
    );
  }

  const parsed = invitePayloadSchema.safeParse(parsedValue);

  if (!parsed.success) {
    throw new ApiError(
      500,
      "INVITE_DATA_INVALID",
      "Stored invite data failed validation.",
      parsed.error.flatten(),
    );
  }

  return parsed.data;
}

function mapSpace(spaceRow: SpaceRow, featuredPersonName: string, createdByUserId: string) {
  return {
    id: spaceRow.id,
    featuredPersonName,
    locale: spaceRow.locale,
    createdAt: spaceRow.createdAt.toISOString(),
    updatedAt: spaceRow.updatedAt.toISOString(),
    createdByUserId,
  };
}

function mapMembership(row: MembershipRow) {
  return {
    id: row.id,
    spaceId: row.spaceId,
    userId: row.userId,
    role: row.role,
    createdAt: row.createdAt.toISOString(),
    invitedAt: toIso(row.invitedAt),
    joinedAt: toIso(row.joinedAt),
    invitedByMembershipId: row.invitedByMembershipId,
  };
}

function mapInvite(code: string, verificationRow: AuthVerificationRow, payload: InvitePayload) {
  return {
    id: verificationRow.id,
    spaceId: payload.spaceId,
    role: payload.role,
    code,
    createdAt: verificationRow.createdAt.toISOString(),
    createdByUserId: payload.createdByUserId,
    expiresAt: verificationRow.expiresAt.toISOString(),
    acceptedAt: null,
    acceptedByUserId: null,
    revokedAt: null,
  };
}

function mapEvidenceSource(row: SourceRow) {
  const consentArtifact = parseConsentArtifact(row);

  return {
    id: row.id,
    spaceId: row.spaceId,
    visibility: row.visibility,
    evidenceType: consentArtifact?.evidenceType ?? "written",
    text: consentArtifact?.transcript ?? "",
    mediaReferenceId: consentArtifact?.mediaReferenceId ?? null,
    createdAt: row.createdAt.toISOString(),
    createdByMembershipId: row.uploadedByMembershipId,
    blobPathname: row.blobPathname,
    mimeType: row.mimeType,
    byteSize: row.byteSize,
  };
}

function mapConsent(row: ConsentRow, evidenceSourceRow: SourceRow | undefined) {
  const consentArtifact = parseConsentArtifact(evidenceSourceRow);

  return {
    id: row.id,
    spaceId: row.spaceId,
    evidenceSourceId: row.evidenceSourceId,
    participationApproved: row.participationConsented,
    aiProcessingAllowed: row.aiProcessingConsented,
    familyVisibilityDefault: consentArtifact?.familyVisibilityDefault ?? "family",
    memorialUseAllowed: row.memorialUseAllowed,
    voiceClipsAllowed: row.voiceClipsAllowed,
    stewardAttestation: consentArtifact?.stewardAttestation ?? true,
    recordedAt: toIso(row.recordedAt),
    recordedByMembershipId: row.recordedByMembershipId,
    withdrawnAt: toIso(row.withdrawnAt),
    withdrawalReason: row.withdrawnReason,
  };
}

async function findInviteByCode(code: string): Promise<{
  code: string;
  payload: InvitePayload;
  verification: AuthVerificationRow;
} | null> {
  const normalizedCode = normalizeInviteCode(code);
  const verificationRow = await db.query.authVerification.findFirst({
    where: eq(authVerification.identifier, inviteIdentifier(normalizedCode)),
  });

  if (!verificationRow) {
    return null;
  }

  return {
    code: normalizedCode,
    payload: parseInvitePayload(verificationRow),
    verification: verificationRow,
  };
}

async function createUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = createInviteCode();
    const existing = await db.query.authVerification.findFirst({
      where: eq(authVerification.identifier, inviteIdentifier(code)),
    });

    if (!existing) {
      return code;
    }
  }

  throw new ApiError(500, "INVITE_CODE_GENERATION_FAILED", "Unable to generate a unique invite code.");
}

export async function findUserByEmail(email: string): Promise<AuthUserRow | undefined> {
  const normalizedEmail = email.trim().toLowerCase();
  const [userRow] = await db
    .select()
    .from(authUser)
    .where(sql`lower(${authUser.email}) = ${normalizedEmail}`)
    .limit(1);

  return userRow;
}

export async function findUserById(userId: string): Promise<AuthUserRow | undefined> {
  return db.query.authUser.findFirst({ where: eq(authUser.id, userId) });
}

export async function findSpaceById(spaceId: string): Promise<SpaceRow | undefined> {
  return db.query.space.findFirst({ where: eq(space.id, spaceId) });
}

export async function findMembership(
  spaceId: string,
  userId: string,
): Promise<MembershipRow | undefined> {
  return db.query.membership.findFirst({
    where: and(eq(membership.spaceId, spaceId), eq(membership.userId, userId)),
  });
}

export async function getMembershipForUser(userId: string): Promise<MembershipRow | undefined> {
  return db.query.membership.findFirst({ where: eq(membership.userId, userId) });
}

export async function listMembershipsForSpace(spaceId: string): Promise<MembershipRow[]> {
  return db.query.membership.findMany({ where: eq(membership.spaceId, spaceId) });
}

export async function createSpaceForSteward(input: {
  featuredPersonName: string;
  locale: Locale;
  userId: string;
}) {
  return db.transaction(async (tx) => {
    const existingMembership = await tx.query.membership.findFirst({
      where: eq(membership.userId, input.userId),
    });

    if (existingMembership) {
      throw new ApiError(
        409,
        "SPACE_ALREADY_EXISTS",
        "A user may only belong to one family space in the MVP.",
      );
    }

    const [spaceRow] = await tx
      .insert(space)
      .values({
        name: input.featuredPersonName,
        locale: input.locale,
      })
      .returning();

    await tx.insert(person).values({
      spaceId: spaceRow.id,
      displayName: input.featuredPersonName,
      aliases: [],
      isFeatured: true,
    });

    const [membershipRow] = await tx
      .insert(membership)
      .values({
        spaceId: spaceRow.id,
        userId: input.userId,
        role: "steward",
        joinedAt: now(),
      })
      .returning();

    return {
      space: mapSpace(spaceRow, input.featuredPersonName, input.userId),
      membership: mapMembership(membershipRow),
    };
  });
}

export async function requireStewardMembership(
  spaceId: string,
  userId: string,
): Promise<MembershipRow> {
  const membershipRow = await findMembership(spaceId, userId);

  if (!membershipRow) {
    throw new ApiError(403, "SPACE_ACCESS_DENIED", "You are not a member of this family space.");
  }

  if (membershipRow.role !== "steward") {
    throw new ApiError(403, "STEWARD_REQUIRED", "Only the steward can perform this action.");
  }

  return membershipRow;
}

export async function createInviteForSpace(input: {
  spaceId: string;
  createdByMembership: MembershipRow;
  expiresInDays: number;
}) {
  const code = await createUniqueInviteCode();
  const expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);
  const payload: InvitePayload = {
    spaceId: input.spaceId,
    role: "family",
    invitedByMembershipId: input.createdByMembership.id,
    createdByUserId: input.createdByMembership.userId,
  };

  const [verificationRow] = await db
    .insert(authVerification)
    .values({
      id: randomUUID(),
      identifier: inviteIdentifier(code),
      value: JSON.stringify(payload),
      expiresAt,
    })
    .returning();

  await db.insert(activity).values({
    spaceId: input.spaceId,
    membershipId: input.createdByMembership.id,
    type: "invite_sent",
    targetType: "verification",
    targetId: verificationRow.id,
    metadata: {
      expiresAt: expiresAt.toISOString(),
    },
  });

  return mapInvite(code, verificationRow, payload);
}

export async function validateInviteCode(code: string) {
  const invite = await findInviteByCode(code);

  if (!invite) {
    throw new ApiError(400, "INVALID_INVITE_CODE", "Invalid invite code.");
  }

  if (invite.verification.expiresAt <= now()) {
    throw new ApiError(400, "INVALID_INVITE_CODE", "This invite code has expired.");
  }

  return invite;
}

export async function acceptInviteForUser(code: string, userId: string) {
  const invite = await validateInviteCode(code);
  const existingMembership = await getMembershipForUser(userId);

  if (existingMembership && existingMembership.spaceId !== invite.payload.spaceId) {
    throw new ApiError(
      409,
      "SPACE_MEMBERSHIP_EXISTS",
      "This account already belongs to a different family space.",
    );
  }

  if (!existingMembership) {
    await db.insert(membership).values({
      spaceId: invite.payload.spaceId,
      userId,
      role: invite.payload.role,
      invitedByMembershipId: invite.payload.invitedByMembershipId,
      invitedAt: invite.verification.createdAt,
      joinedAt: now(),
    });
  }

  await db.delete(authVerification).where(eq(authVerification.id, invite.verification.id));

  return invite;
}

export async function findConsentBySpaceId(spaceId: string): Promise<ConsentRow | undefined> {
  return db.query.consent.findFirst({ where: eq(consent.spaceId, spaceId) });
}

export async function recordConsentForSpace(input: {
  spaceId: string;
  recordedByMembership: MembershipRow;
  evidenceType: ConsentEvidenceType;
  evidenceText: string;
  evidenceMediaReferenceId?: string | undefined;
  participationApproved: boolean;
  aiProcessingAllowed: boolean;
  familyVisibilityDefault: "family" | "private";
  memorialUseAllowed: boolean;
  voiceClipsAllowed: boolean;
  stewardAttestation: boolean;
}) {
  const evidenceCreatedAt = now();
  let evidenceBlobPathname: string;
  let evidenceMimeType: string;
  let evidenceByteSize: number;

  if (input.evidenceType === "voice") {
    evidenceBlobPathname = input.evidenceMediaReferenceId!;
    evidenceMimeType = "audio/webm";
    evidenceByteSize = 0;
  } else {
    const { url } = await uploadSourceFile(
      input.spaceId,
      `consent-${randomUUID()}.txt`,
      input.evidenceText,
      "text/plain",
    );

    evidenceBlobPathname = url;
    evidenceMimeType = "text/plain";
    evidenceByteSize = Buffer.byteLength(input.evidenceText, "utf-8");
  }

  const [evidenceSourceRow] = await db
    .insert(source)
    .values({
      spaceId: input.spaceId,
      type: input.evidenceType === "voice" ? "audio" : "text",
      status: "ready",
      origin: "from_them",
      visibility: "private",
      uploadedByMembershipId: input.recordedByMembership.id,
      blobPathname: evidenceBlobPathname,
      mimeType: evidenceMimeType,
      byteSize: evidenceByteSize,
      artifactContext: {
        consent: {
          evidenceType: input.evidenceType,
          transcript: input.evidenceText,
          mediaReferenceId: input.evidenceMediaReferenceId ?? null,
          familyVisibilityDefault: input.familyVisibilityDefault,
          stewardAttestation: input.stewardAttestation,
        },
      },
      createdAt: evidenceCreatedAt,
      updatedAt: evidenceCreatedAt,
    })
    .returning();

  const existingConsent = await findConsentBySpaceId(input.spaceId);
  const recordedAt = now();
  let consentRow: ConsentRow;

  if (existingConsent) {
    const [updatedConsentRow] = await db
      .update(consent)
      .set({
        participationConsented: input.participationApproved,
        aiProcessingConsented: input.aiProcessingAllowed,
        memorialUseAllowed: input.memorialUseAllowed,
        voiceClipsAllowed: input.voiceClipsAllowed,
        evidenceSourceId: evidenceSourceRow.id,
        recordedAt,
        recordedByMembershipId: input.recordedByMembership.id,
        withdrawnAt: null,
        withdrawnReason: null,
      })
      .where(eq(consent.id, existingConsent.id))
      .returning();

    consentRow = updatedConsentRow;
  } else {
    const [createdConsentRow] = await db
      .insert(consent)
      .values({
        spaceId: input.spaceId,
        participationConsented: input.participationApproved,
        aiProcessingConsented: input.aiProcessingAllowed,
        memorialUseAllowed: input.memorialUseAllowed,
        voiceClipsAllowed: input.voiceClipsAllowed,
        evidenceSourceId: evidenceSourceRow.id,
        recordedAt,
        recordedByMembershipId: input.recordedByMembership.id,
      })
      .returning();

    consentRow = createdConsentRow;
  }

  await db.insert(activity).values({
    spaceId: input.spaceId,
    membershipId: input.recordedByMembership.id,
    type: "consent_recorded",
    targetType: "consent",
    targetId: consentRow.id,
    metadata: {
      evidenceSourceId: evidenceSourceRow.id,
    },
  });

  return {
    consent: mapConsent(consentRow, evidenceSourceRow),
    evidenceSource: mapEvidenceSource(evidenceSourceRow),
  };
}

export async function withdrawConsentForSpace(input: {
  spaceId: string;
  membershipId: string;
  reason?: string | undefined;
}) {
  const consentRow = await findConsentBySpaceId(input.spaceId);

  if (!consentRow || consentRow.withdrawnAt) {
    throw new ApiError(409, "CONSENT_NOT_ACTIVE", "There is no active consent to withdraw.");
  }

  const [updatedConsentRow] = await db
    .update(consent)
    .set({
      withdrawnAt: now(),
      withdrawnReason: input.reason ?? null,
    })
    .where(eq(consent.id, consentRow.id))
    .returning();

  await db.insert(activity).values({
    spaceId: input.spaceId,
    membershipId: input.membershipId,
    type: "consent_withdrawn",
    targetType: "consent",
    targetId: updatedConsentRow.id,
    metadata: {},
  });

  const evidenceSourceRow = updatedConsentRow.evidenceSourceId
    ? await db.query.source.findFirst({
        where: eq(source.id, updatedConsentRow.evidenceSourceId),
      })
    : undefined;

  return mapConsent(updatedConsentRow, evidenceSourceRow);
}

export async function requireSpace(spaceId: string): Promise<SpaceRow> {
  const spaceRow = await findSpaceById(spaceId);

  if (!spaceRow) {
    throw new ApiError(404, "SPACE_NOT_FOUND", "Family space not found.");
  }

  return spaceRow;
}

export function canViewerAccessVisibility(role: MembershipRole, visibility: Visibility): boolean {
  if (role === "steward") {
    return true;
  }

  return visibility !== "private";
}

export async function assertSpaceAllowsCapture(spaceId: string): Promise<void> {
  const consentRow = await findConsentBySpaceId(spaceId);

  if (!consentRow || consentRow.withdrawnAt || !consentRow.participationConsented) {
    throw new ApiError(
      409,
      "CONSENT_REQUIRED",
      "Capture is blocked until active participation consent is recorded.",
    );
  }
}

export async function assertSpaceAllowsAiProcessing(spaceId: string): Promise<void> {
  const consentRow = await findConsentBySpaceId(spaceId);

  if (
    !consentRow ||
    consentRow.withdrawnAt ||
    !consentRow.participationConsented ||
    !consentRow.aiProcessingConsented
  ) {
    throw new ApiError(
      409,
      "AI_PROCESSING_NOT_ALLOWED",
      "AI processing is unavailable until consent explicitly allows it.",
    );
  }
}

export async function assertMemorialUseAllowed(spaceId: string): Promise<void> {
  const consentRow = await findConsentBySpaceId(spaceId);

  if (!consentRow || consentRow.withdrawnAt || !consentRow.memorialUseAllowed) {
    throw new ApiError(
      409,
      "MEMORIAL_USE_NOT_ALLOWED",
      "Memorial visibility is unavailable until consent explicitly allows memorial use.",
    );
  }
}

export async function canUseVoiceClips(spaceId: string): Promise<boolean> {
  const consentRow = await findConsentBySpaceId(spaceId);

  return Boolean(
    consentRow &&
      !consentRow.withdrawnAt &&
      consentRow.memorialUseAllowed &&
      consentRow.voiceClipsAllowed,
  );
}
