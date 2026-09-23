import { randomBytes, randomUUID } from "node:crypto";

import type { MemoryDB } from "better-auth/adapters/memory";

import { ApiError } from "@/src/auth/errors";

export type SpaceLocale = "fil" | "en";
export type MembershipRole = "steward" | "family";
export type Visibility = "private" | "family" | "memorial";
export type ConsentEvidenceType = "voice" | "written";

export interface AuthUserRecord {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SpaceRecord {
  id: string;
  featuredPersonName: string;
  locale: SpaceLocale;
  createdAt: string;
  createdByUserId: string;
}

export interface MembershipRecord {
  id: string;
  spaceId: string;
  userId: string;
  role: MembershipRole;
  createdAt: string;
}

export interface InviteRecord {
  id: string;
  spaceId: string;
  role: "family";
  code: string;
  createdAt: string;
  createdByUserId: string;
  expiresAt: string;
  acceptedAt: string | null;
  acceptedByUserId: string | null;
  revokedAt: string | null;
}

export interface ConsentSourceRecord {
  id: string;
  spaceId: string;
  visibility: "private";
  category: "consent";
  evidenceType: ConsentEvidenceType;
  text: string;
  mediaReferenceId: string | null;
  createdAt: string;
  createdByUserId: string;
}

export interface ConsentRecord {
  id: string;
  spaceId: string;
  evidenceSourceId: string;
  participationApproved: boolean;
  aiProcessingAllowed: boolean;
  familyVisibilityDefault: "family" | "private";
  memorialUseAllowed: boolean;
  voiceClipsAllowed: boolean;
  stewardAttestation: boolean;
  recordedAt: string;
  recordedByUserId: string;
  withdrawnAt: string | null;
  withdrawalReason: string | null;
}

export interface DomainStore extends MemoryDB {
  user: AuthUserRecord[];
  session: Record<string, unknown>[];
  account: Record<string, unknown>[];
  verification: Record<string, unknown>[];
  spaces: SpaceRecord[];
  memberships: MembershipRecord[];
  invites: InviteRecord[];
  consents: ConsentRecord[];
  sources: ConsentSourceRecord[];
}

declare global {
  // eslint-disable-next-line no-var
  var __gunitaAuthStore: DomainStore | undefined;
}

function createStore(): DomainStore {
  return {
    user: [],
    session: [],
    account: [],
    verification: [],
    spaces: [],
    memberships: [],
    invites: [],
    consents: [],
    sources: [],
  };
}

export const authStore = globalThis.__gunitaAuthStore ?? createStore();

if (!globalThis.__gunitaAuthStore) {
  globalThis.__gunitaAuthStore = authStore;
}

function nowIso(): string {
  return new Date().toISOString();
}

function generateId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

function createInviteCode(): string {
  return randomBytes(6).toString("base64url").toUpperCase();
}

export function resetAuthStore(): void {
  authStore.user.length = 0;
  authStore.session.length = 0;
  authStore.account.length = 0;
  authStore.verification.length = 0;
  authStore.spaces.length = 0;
  authStore.memberships.length = 0;
  authStore.invites.length = 0;
  authStore.consents.length = 0;
  authStore.sources.length = 0;
}

export function findUserByEmail(email: string): AuthUserRecord | undefined {
  const normalizedEmail = email.trim().toLowerCase();

  return authStore.user.find((user) => user.email.toLowerCase() === normalizedEmail);
}

export function findUserById(userId: string): AuthUserRecord | undefined {
  return authStore.user.find((user) => user.id === userId);
}

export function findSpaceById(spaceId: string): SpaceRecord | undefined {
  return authStore.spaces.find((space) => space.id === spaceId);
}

export function findMembership(spaceId: string, userId: string): MembershipRecord | undefined {
  return authStore.memberships.find((membership) => membership.spaceId === spaceId && membership.userId === userId);
}

export function getMembershipForUser(userId: string): MembershipRecord | undefined {
  return authStore.memberships.find((membership) => membership.userId === userId);
}

export function listMembershipsForSpace(spaceId: string): MembershipRecord[] {
  return authStore.memberships.filter((membership) => membership.spaceId === spaceId);
}

export function createSpaceForSteward(input: {
  featuredPersonName: string;
  locale: SpaceLocale;
  userId: string;
}): { space: SpaceRecord; membership: MembershipRecord } {
  const existingMembership = getMembershipForUser(input.userId);

  if (existingMembership) {
    throw new ApiError(
      409,
      "SPACE_ALREADY_EXISTS",
      "A user may only belong to one family space in the MVP.",
    );
  }

  const space: SpaceRecord = {
    id: generateId("space"),
    featuredPersonName: input.featuredPersonName,
    locale: input.locale,
    createdAt: nowIso(),
    createdByUserId: input.userId,
  };

  const membership: MembershipRecord = {
    id: generateId("membership"),
    spaceId: space.id,
    userId: input.userId,
    role: "steward",
    createdAt: nowIso(),
  };

  authStore.spaces.push(space);
  authStore.memberships.push(membership);

  return { space, membership };
}

export function requireStewardMembership(spaceId: string, userId: string): MembershipRecord {
  const membership = findMembership(spaceId, userId);

  if (!membership) {
    throw new ApiError(403, "SPACE_ACCESS_DENIED", "You are not a member of this family space.");
  }

  if (membership.role !== "steward") {
    throw new ApiError(403, "STEWARD_REQUIRED", "Only the steward can perform this action.");
  }

  return membership;
}

export function createInviteForSpace(input: {
  spaceId: string;
  createdByUserId: string;
  expiresInDays: number;
}): InviteRecord {
  const expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  const invite: InviteRecord = {
    id: generateId("invite"),
    spaceId: input.spaceId,
    role: "family",
    code: createInviteCode(),
    createdAt: nowIso(),
    createdByUserId: input.createdByUserId,
    expiresAt,
    acceptedAt: null,
    acceptedByUserId: null,
    revokedAt: null,
  };

  authStore.invites.push(invite);

  return invite;
}

export function validateInviteCode(code: string): InviteRecord {
  const normalizedCode = code.trim().toUpperCase();
  const invite = authStore.invites.find((candidate) => candidate.code === normalizedCode);

  if (!invite) {
    throw new ApiError(400, "INVALID_INVITE_CODE", "Invalid invite code.");
  }

  if (invite.revokedAt) {
    throw new ApiError(400, "INVALID_INVITE_CODE", "This invite code is no longer active.");
  }

  if (Date.parse(invite.expiresAt) <= Date.now()) {
    throw new ApiError(400, "INVALID_INVITE_CODE", "This invite code has expired.");
  }

  return invite;
}

export function acceptInviteForUser(code: string, userId: string): InviteRecord {
  const invite = validateInviteCode(code);
  const existingMembership = getMembershipForUser(userId);

  if (existingMembership && existingMembership.spaceId !== invite.spaceId) {
    throw new ApiError(
      409,
      "SPACE_MEMBERSHIP_EXISTS",
      "This account already belongs to a different family space.",
    );
  }

  if (!existingMembership) {
    authStore.memberships.push({
      id: generateId("membership"),
      spaceId: invite.spaceId,
      userId,
      role: "family",
      createdAt: nowIso(),
    });
  }

  if (!invite.acceptedAt) {
    invite.acceptedAt = nowIso();
    invite.acceptedByUserId = userId;
  }

  return invite;
}

export function findConsentBySpaceId(spaceId: string): ConsentRecord | undefined {
  return authStore.consents.find((consent) => consent.spaceId === spaceId);
}

export function recordConsentForSpace(input: {
  spaceId: string;
  userId: string;
  evidenceType: ConsentEvidenceType;
  evidenceText: string;
  evidenceMediaReferenceId?: string | undefined;
  participationApproved: boolean;
  aiProcessingAllowed: boolean;
  familyVisibilityDefault: "family" | "private";
  memorialUseAllowed: boolean;
  voiceClipsAllowed: boolean;
  stewardAttestation: boolean;
}): { consent: ConsentRecord; evidenceSource: ConsentSourceRecord } {
  const evidenceSource: ConsentSourceRecord = {
    id: generateId("source"),
    spaceId: input.spaceId,
    visibility: "private",
    category: "consent",
    evidenceType: input.evidenceType,
    text: input.evidenceText,
    mediaReferenceId: input.evidenceMediaReferenceId ?? null,
    createdAt: nowIso(),
    createdByUserId: input.userId,
  };

  authStore.sources.push(evidenceSource);

  const existingConsent = findConsentBySpaceId(input.spaceId);
  const updatedConsent: ConsentRecord = {
    id: existingConsent?.id ?? generateId("consent"),
    spaceId: input.spaceId,
    evidenceSourceId: evidenceSource.id,
    participationApproved: input.participationApproved,
    aiProcessingAllowed: input.aiProcessingAllowed,
    familyVisibilityDefault: input.familyVisibilityDefault,
    memorialUseAllowed: input.memorialUseAllowed,
    voiceClipsAllowed: input.voiceClipsAllowed,
    stewardAttestation: input.stewardAttestation,
    recordedAt: nowIso(),
    recordedByUserId: input.userId,
    withdrawnAt: null,
    withdrawalReason: null,
  };

  if (existingConsent) {
    Object.assign(existingConsent, updatedConsent);
  } else {
    authStore.consents.push(updatedConsent);
  }

  return {
    consent: existingConsent ?? updatedConsent,
    evidenceSource,
  };
}

export function withdrawConsentForSpace(input: {
  spaceId: string;
  reason?: string | undefined;
}): ConsentRecord {
  const consent = findConsentBySpaceId(input.spaceId);

  if (!consent || consent.withdrawnAt) {
    throw new ApiError(409, "CONSENT_NOT_ACTIVE", "There is no active consent to withdraw.");
  }

  consent.withdrawnAt = nowIso();
  consent.withdrawalReason = input.reason ?? null;

  return consent;
}

export function requireSpace(spaceId: string): SpaceRecord {
  const space = findSpaceById(spaceId);

  if (!space) {
    throw new ApiError(404, "SPACE_NOT_FOUND", "Family space not found.");
  }

  return space;
}

export function canViewerAccessVisibility(role: MembershipRole, visibility: Visibility): boolean {
  if (role === "steward") {
    return true;
  }

  return visibility !== "private";
}

export function assertSpaceAllowsCapture(spaceId: string): void {
  const consent = findConsentBySpaceId(spaceId);

  if (!consent || consent.withdrawnAt || !consent.participationApproved) {
    throw new ApiError(
      409,
      "CONSENT_REQUIRED",
      "Capture is blocked until active participation consent is recorded.",
    );
  }
}

export function assertSpaceAllowsAiProcessing(spaceId: string): void {
  const consent = findConsentBySpaceId(spaceId);

  if (!consent || consent.withdrawnAt || !consent.participationApproved || !consent.aiProcessingAllowed) {
    throw new ApiError(
      409,
      "AI_PROCESSING_NOT_ALLOWED",
      "AI processing is unavailable until consent explicitly allows it.",
    );
  }
}

export function assertMemorialUseAllowed(spaceId: string): void {
  const consent = findConsentBySpaceId(spaceId);

  if (!consent || consent.withdrawnAt || !consent.memorialUseAllowed) {
    throw new ApiError(
      409,
      "MEMORIAL_USE_NOT_ALLOWED",
      "Memorial visibility is unavailable until consent explicitly allows memorial use.",
    );
  }
}

export function canUseVoiceClips(spaceId: string): boolean {
  const consent = findConsentBySpaceId(spaceId);

  return Boolean(
    consent &&
      !consent.withdrawnAt &&
      consent.memorialUseAllowed &&
      consent.voiceClipsAllowed,
  );
}
