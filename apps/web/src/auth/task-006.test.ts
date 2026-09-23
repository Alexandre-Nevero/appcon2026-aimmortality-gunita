import { beforeEach, describe, expect, it } from "vitest";

import { GET as authGet, POST as authPost } from "../../app/api/auth/[...all]/route";
import { POST as consentPost } from "../../app/api/spaces/[id]/consent/route";
import { POST as invitePost } from "../../app/api/spaces/[id]/invites/route";
import { POST as spacesPost } from "../../app/api/spaces/route";
import { ApiError } from "./errors";
import {
  assertSpaceAllowsAiProcessing,
  assertMemorialUseAllowed,
  assertSpaceAllowsCapture,
  canUseVoiceClips,
  canViewerAccessVisibility,
  findUserByEmail,
  getMembershipForUser,
  resetAuthStore,
} from "./store";

function createJsonRequest(url: string, body: unknown, cookie?: string): Request {
  const headers = new Headers({
    "content-type": "application/json",
  });

  if (cookie) {
    headers.set("cookie", cookie);
  }

  return new Request(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function getCookie(response: Response): string {
  const cookie = response.headers.get("set-cookie");

  if (!cookie) {
    throw new Error("Expected auth response to include a session cookie.");
  }

  return cookie;
}

async function createSignedInUser(input: {
  name: string;
  email: string;
  password: string;
  inviteCode?: string;
}): Promise<{ cookie: string }> {
  const response = await authPost(
    createJsonRequest("http://localhost:3000/api/auth/sign-up/email", input),
  );

  expect(response.status).toBe(200);

  return {
    cookie: getCookie(response),
  };
}

describe("ASK-006 identity and consent APIs", () => {
  beforeEach(() => {
    resetAuthStore();
  });

  it("TC-001 creates one steward-owned space and Better Auth issues a session", async () => {
    const steward = await createSignedInUser({
      name: "Kirby Steward",
      email: "kirby@example.com",
      password: "Password123",
    });

    const sessionResponse = await authGet(
      new Request("http://localhost:3000/api/auth/get-session", {
        method: "GET",
        headers: {
          cookie: steward.cookie,
        },
      }),
    );

    expect(sessionResponse.status).toBe(200);

    const sessionBody = await sessionResponse.json();

    expect(sessionBody.user.email).toBe("kirby@example.com");

    const firstSpaceResponse = await spacesPost(
      createJsonRequest(
        "http://localhost:3000/api/spaces",
        {
          featuredPersonName: "Lola Nena",
          locale: "fil",
        },
        steward.cookie,
      ),
    );

    expect(firstSpaceResponse.status).toBe(201);

    const firstSpaceBody = await firstSpaceResponse.json();

    expect(firstSpaceBody.membership.role).toBe("steward");

    const secondSpaceResponse = await spacesPost(
      createJsonRequest(
        "http://localhost:3000/api/spaces",
        {
          featuredPersonName: "Lolo Ben",
          locale: "en",
        },
        steward.cookie,
      ),
    );

    expect(secondSpaceResponse.status).toBe(409);
  });

  it("TC-002 accepts valid invites and family access excludes Private visibility", async () => {
    const steward = await createSignedInUser({
      name: "Kirby Steward",
      email: "kirby@example.com",
      password: "Password123",
    });

    const spaceResponse = await spacesPost(
      createJsonRequest(
        "http://localhost:3000/api/spaces",
        {
          featuredPersonName: "Lola Nena",
          locale: "fil",
        },
        steward.cookie,
      ),
    );

    const spaceBody = await spaceResponse.json();
    const spaceId = spaceBody.space.id as string;

    const inviteResponse = await invitePost(
      createJsonRequest(`http://localhost:3000/api/spaces/${spaceId}/invites`, {}, steward.cookie),
      { params: Promise.resolve({ id: spaceId }) },
    );

    expect(inviteResponse.status).toBe(201);

    const inviteBody = await inviteResponse.json();
    const inviteCode = inviteBody.invite.code as string;

    const family = await createSignedInUser({
      name: "Tita Ana",
      email: "ana@example.com",
      password: "Password123",
      inviteCode,
    });

    expect(family.cookie).toContain("better-auth");

    const familyUser = findUserByEmail("ana@example.com");

    expect(familyUser).toBeDefined();

    const membership = getMembershipForUser(familyUser!.id);

    expect(membership?.spaceId).toBe(spaceId);
    expect(membership?.role).toBe("family");
    expect(canViewerAccessVisibility("family", "private")).toBe(false);
    expect(canViewerAccessVisibility("family", "family")).toBe(true);
    expect(canViewerAccessVisibility("family", "memorial")).toBe(true);

    const invalidInviteResponse = await authPost(
      createJsonRequest("http://localhost:3000/api/auth/sign-up/email", {
        name: "Pinsan Jo",
        email: "jo@example.com",
        password: "Password123",
        inviteCode: "NOT-A-REAL-CODE",
      }),
    );

    expect(invalidInviteResponse.status).toBe(400);

    const invalidInviteBody = await invalidInviteResponse.json();

    expect(invalidInviteBody.error.message).toContain("Invalid invite code");
  });

  it("TC-003 blocks capture until consent is recorded", async () => {
    const steward = await createSignedInUser({
      name: "Kirby Steward",
      email: "kirby@example.com",
      password: "Password123",
    });

    const spaceResponse = await spacesPost(
      createJsonRequest(
        "http://localhost:3000/api/spaces",
        {
          featuredPersonName: "Lola Nena",
          locale: "fil",
        },
        steward.cookie,
      ),
    );

    const spaceBody = await spaceResponse.json();
    const spaceId = spaceBody.space.id as string;

    expect(() => assertSpaceAllowsCapture(spaceId)).toThrow(ApiError);

    const consentResponse = await consentPost(
      createJsonRequest(
        `http://localhost:3000/api/spaces/${spaceId}/consent`,
        {
          evidenceType: "written",
          evidenceText: "Payag ako sa paglahok at paggamit ng aking mga kuwento sa GUNITA.",
          participationApproved: true,
          aiProcessingAllowed: true,
          familyVisibilityDefault: "family",
          memorialUseAllowed: true,
          voiceClipsAllowed: true,
          stewardAttestation: true,
        },
        steward.cookie,
      ),
      { params: Promise.resolve({ id: spaceId }) },
    );

    expect(consentResponse.status).toBe(200);
    expect(() => assertSpaceAllowsCapture(spaceId)).not.toThrow();
    expect(() => assertSpaceAllowsAiProcessing(spaceId)).not.toThrow();
  });

  it("TC-004 stores consent evidence as Private and enforces memorial and voice choices", async () => {
    const steward = await createSignedInUser({
      name: "Kirby Steward",
      email: "kirby@example.com",
      password: "Password123",
    });

    const spaceResponse = await spacesPost(
      createJsonRequest(
        "http://localhost:3000/api/spaces",
        {
          featuredPersonName: "Lola Nena",
          locale: "fil",
        },
        steward.cookie,
      ),
    );

    const spaceBody = await spaceResponse.json();
    const spaceId = spaceBody.space.id as string;

    const consentResponse = await consentPost(
      createJsonRequest(
        `http://localhost:3000/api/spaces/${spaceId}/consent`,
        {
          evidenceType: "voice",
          evidenceText: "Oo, pumapayag ako sa family archive pero hindi sa memorial voice clips.",
          evidenceMediaReferenceId: "blob://private-consent-audio-001",
          participationApproved: true,
          aiProcessingAllowed: true,
          familyVisibilityDefault: "family",
          memorialUseAllowed: false,
          voiceClipsAllowed: false,
          stewardAttestation: true,
        },
        steward.cookie,
      ),
      { params: Promise.resolve({ id: spaceId }) },
    );

    expect(consentResponse.status).toBe(200);

    const consentBody = await consentResponse.json();

    expect(consentBody.evidenceSource.visibility).toBe("private");
    expect(() => assertMemorialUseAllowed(spaceId)).toThrow(ApiError);
    expect(canUseVoiceClips(spaceId)).toBe(false);
  });

  it("TC-005 blocks new capture after consent withdrawal", async () => {
    const steward = await createSignedInUser({
      name: "Kirby Steward",
      email: "kirby@example.com",
      password: "Password123",
    });

    const spaceResponse = await spacesPost(
      createJsonRequest(
        "http://localhost:3000/api/spaces",
        {
          featuredPersonName: "Lola Nena",
          locale: "fil",
        },
        steward.cookie,
      ),
    );

    const spaceBody = await spaceResponse.json();
    const spaceId = spaceBody.space.id as string;

    await consentPost(
      createJsonRequest(
        `http://localhost:3000/api/spaces/${spaceId}/consent`,
        {
          evidenceType: "written",
          evidenceText: "Payag ako sa GUNITA habang gusto ko pa itong ituloy.",
          participationApproved: true,
          aiProcessingAllowed: true,
          familyVisibilityDefault: "family",
          memorialUseAllowed: true,
          voiceClipsAllowed: true,
          stewardAttestation: true,
        },
        steward.cookie,
      ),
      { params: Promise.resolve({ id: spaceId }) },
    );

    expect(() => assertSpaceAllowsCapture(spaceId)).not.toThrow();

    const withdrawResponse = await consentPost(
      createJsonRequest(
        `http://localhost:3000/api/spaces/${spaceId}/consent`,
        {
          action: "withdraw",
          reason: "Requested by the featured person.",
        },
        steward.cookie,
      ),
      { params: Promise.resolve({ id: spaceId }) },
    );

    expect(withdrawResponse.status).toBe(200);
    expect(() => assertSpaceAllowsCapture(spaceId)).toThrow(ApiError);
  });
});
