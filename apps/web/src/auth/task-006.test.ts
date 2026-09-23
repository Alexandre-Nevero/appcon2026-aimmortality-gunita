import { afterEach, describe, expect, it, vi } from "vitest";

type InsertConfig = {
  execute?: () => Promise<unknown>;
  returning?: () => Promise<unknown[]>;
};

function createInsertResult(config: InsertConfig = {}) {
  const promise = Promise.resolve(config.execute?.());

  return {
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
    returning: async () => config.returning?.() ?? [],
  };
}

function getDrizzleTableName(table: unknown): string | undefined {
  return (table as Record<symbol, string>)[Symbol.for("drizzle:Name")];
}

async function importStoreWithDb(dbMock: unknown) {
  vi.resetModules();
  vi.doMock("@/src/db", () => ({ db: dbMock }));

  return import("./store");
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.doUnmock("@/src/db");
  vi.doUnmock("@/src/auth/store");
  vi.doUnmock("@/src/auth/session");
  vi.doUnmock("@/src/auth/auth");
  vi.doUnmock("@/src/media/blob");
  vi.doUnmock("better-auth/next-js");
});

describe("TASK-006 store integration", () => {
  it("creates a space through the real space/person/membership schema tables atomically", { timeout: 10_000 }, async () => {
    const inserted: Array<{ table: string; values: unknown }> = [];
    const txMock = {
      query: {
        membership: {
          findFirst: vi.fn().mockResolvedValue(undefined),
        },
      },
      insert: vi.fn((table: unknown) => ({
        values: (values: unknown) => {
          if (getDrizzleTableName(table) === "space") {
            inserted.push({ table: "space", values });

            return createInsertResult({
              returning: async () => [
                {
                  id: "space-1",
                  name: "Lola Nena",
                  locale: "fil",
                  createdAt: new Date("2026-09-24T00:00:00.000Z"),
                  updatedAt: new Date("2026-09-24T00:00:00.000Z"),
                },
              ],
            });
          }

          if (getDrizzleTableName(table) === "person") {
            inserted.push({ table: "person", values });

            return createInsertResult();
          }

          if (getDrizzleTableName(table) === "membership") {
            inserted.push({ table: "membership", values });

            return createInsertResult({
              returning: async () => [
                {
                  id: "membership-1",
                  spaceId: "space-1",
                  userId: "user-1",
                  role: "steward",
                  localeOverride: null,
                  invitedByMembershipId: null,
                  invitedAt: null,
                  joinedAt: new Date("2026-09-24T00:00:00.000Z"),
                  createdAt: new Date("2026-09-24T00:00:00.000Z"),
                },
              ],
            });
          }

          throw new Error("Unexpected insert table");
        },
      })),
    };

    const dbMock = {
      transaction: vi.fn(async (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock)),
    };

    const { createSpaceForSteward } = await importStoreWithDb(dbMock);
    const result = await createSpaceForSteward({
      featuredPersonName: "Lola Nena",
      locale: "fil",
      userId: "user-1",
    });

    expect(inserted.map((entry) => entry.table)).toEqual(["space", "person", "membership"]);
    expect(dbMock.transaction).toHaveBeenCalledTimes(1);
    expect(inserted[0]?.values).toMatchObject({
      name: "Lola Nena",
      locale: "fil",
    });
    expect(inserted[1]?.values).toMatchObject({
      spaceId: "space-1",
      displayName: "Lola Nena",
      isFeatured: true,
    });
    expect(inserted[2]?.values).toMatchObject({
      spaceId: "space-1",
      userId: "user-1",
      role: "steward",
    });
    expect(result.space.featuredPersonName).toBe("Lola Nena");
    expect(result.membership.role).toBe("steward");
  });

  it("creates invite codes in the verification table and logs invite_sent activity", async () => {
    const authVerificationValues: Array<Record<string, unknown>> = [];
    const activityValues: Array<Record<string, unknown>> = [];
    const inviterMembershipId = "22222222-2222-2222-2222-222222222222";
    const verificationId = "33333333-3333-3333-3333-333333333333";

    const dbMock = {
      query: {
        authVerification: {
          findFirst: vi.fn().mockResolvedValue(undefined),
        },
      },
      insert: vi.fn((table: unknown) => ({
        values: (values: Record<string, unknown>) => {
          if (getDrizzleTableName(table) === "verification") {
            authVerificationValues.push(values);

            return createInsertResult({
              returning: async () => [
                {
                  id: verificationId,
                  identifier: values.identifier,
                  value: values.value,
                  expiresAt: values.expiresAt,
                  createdAt: new Date("2026-09-24T00:00:00.000Z"),
                  updatedAt: new Date("2026-09-24T00:00:00.000Z"),
                },
              ],
            });
          }

          if (getDrizzleTableName(table) === "activity") {
            activityValues.push(values);
            return createInsertResult();
          }

          throw new Error("Unexpected insert table");
        },
      })),
    };

    const { createInviteForSpace } = await importStoreWithDb(dbMock);
    const invite = await createInviteForSpace({
      spaceId: "11111111-1111-1111-1111-111111111111",
      createdByMembership: {
        id: inviterMembershipId,
        spaceId: "11111111-1111-1111-1111-111111111111",
        userId: "user-1",
        role: "steward",
        localeOverride: null,
        invitedByMembershipId: null,
        invitedAt: null,
        joinedAt: new Date("2026-09-24T00:00:00.000Z"),
        createdAt: new Date("2026-09-24T00:00:00.000Z"),
      },
      expiresInDays: 7,
    });

    expect(invite.code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/);
    expect(authVerificationValues[0]?.identifier).toBe(`invite:${invite.code}`);
    expect(JSON.parse(String(authVerificationValues[0]?.value))).toMatchObject({
      spaceId: "11111111-1111-1111-1111-111111111111",
      role: "family",
      invitedByMembershipId: inviterMembershipId,
      createdByUserId: "user-1",
    });
    expect(activityValues[0]).toMatchObject({
      spaceId: "11111111-1111-1111-1111-111111111111",
      membershipId: inviterMembershipId,
      type: "invite_sent",
      targetType: "verification",
      targetId: verificationId,
    });
    expect(activityValues[0]?.metadata).toMatchObject({
      expiresAt: expect.any(String),
    });
  });

  it("accepts persisted invites into real memberships and consumes the verification record", async () => {
    const insertedMemberships: Array<Record<string, unknown>> = [];
    const deletedTables: Array<string | undefined> = [];
    const inviterMembershipId = "22222222-2222-4222-8222-222222222222";
    const verificationId = "33333333-3333-4333-8333-333333333333";
    const inviteSpaceId = "11111111-1111-4111-8111-111111111111";

    const dbMock = {
      query: {
        authVerification: {
          findFirst: vi.fn().mockResolvedValue({
            id: verificationId,
            identifier: "invite:ABCDEFG234",
            value: JSON.stringify({
              spaceId: inviteSpaceId,
              role: "family",
              invitedByMembershipId: inviterMembershipId,
              createdByUserId: "user-1",
            }),
            expiresAt: new Date("2026-10-24T00:00:00.000Z"),
            createdAt: new Date("2026-09-24T00:00:00.000Z"),
            updatedAt: new Date("2026-09-24T00:00:00.000Z"),
          }),
        },
        membership: {
          findFirst: vi.fn().mockResolvedValue(undefined),
        },
      },
      insert: vi.fn((table: unknown) => ({
        values: (values: Record<string, unknown>) => {
          if (getDrizzleTableName(table) === "membership") {
            insertedMemberships.push(values);
            return createInsertResult();
          }

          throw new Error("Unexpected insert table");
        },
      })),
      delete: vi.fn((table: unknown) => ({
        where: vi.fn(async () => {
          deletedTables.push(getDrizzleTableName(table));
        }),
      })),
    };

    const { acceptInviteForUser } = await importStoreWithDb(dbMock);
    const invite = await acceptInviteForUser("ABCDEFG234", "user-2");

    expect(invite.code).toBe("ABCDEFG234");
    expect(insertedMemberships[0]).toMatchObject({
      spaceId: inviteSpaceId,
      userId: "user-2",
      role: "family",
      invitedByMembershipId: inviterMembershipId,
    });
    expect(deletedTables).toEqual(["verification"]);
  });

  it("stores written consent text through uploadSourceFile before creating the real source and consent rows", async () => {
    const insertedSources: Array<Record<string, unknown>> = [];
    const insertedConsents: Array<Record<string, unknown>> = [];
    const uploadSourceFile = vi.fn().mockResolvedValue({
      pathname: "sources/space-1/consent-1.txt",
      url: "https://blob.example.com/sources/space-1/consent-1.txt",
    });

    vi.doMock("@/src/media/blob", () => ({ uploadSourceFile }));

    const dbMock = {
      query: {
        consent: {
          findFirst: vi.fn().mockResolvedValue(undefined),
        },
      },
      insert: vi.fn((table: unknown) => ({
        values: (values: Record<string, unknown>) => {
          if (getDrizzleTableName(table) === "source") {
            insertedSources.push(values);

            return createInsertResult({
              returning: async () => [
                {
                  id: "source-1",
                  spaceId: values.spaceId,
                  type: values.type,
                  status: values.status,
                  statusReason: null,
                  origin: values.origin,
                  visibility: values.visibility,
                  contributorPersonId: null,
                  uploadedByMembershipId: values.uploadedByMembershipId,
                  blobPathname: values.blobPathname,
                  mimeType: values.mimeType,
                  byteSize: values.byteSize,
                  durationSeconds: null,
                  artifactContext: values.artifactContext,
                  aiVisibleDescription: null,
                  createdAt: new Date("2026-09-24T00:00:00.000Z"),
                  updatedAt: new Date("2026-09-24T00:00:00.000Z"),
                },
              ],
            });
          }

          if (getDrizzleTableName(table) === "consent") {
            insertedConsents.push(values);

            return createInsertResult({
              returning: async () => [
                {
                  id: "consent-1",
                  spaceId: values.spaceId,
                  participationConsented: values.participationConsented,
                  aiProcessingConsented: values.aiProcessingConsented,
                  memorialUseAllowed: values.memorialUseAllowed,
                  voiceClipsAllowed: values.voiceClipsAllowed,
                  evidenceSourceId: values.evidenceSourceId,
                  recordedAt: new Date("2026-09-24T00:00:00.000Z"),
                  recordedByMembershipId: values.recordedByMembershipId,
                  withdrawnAt: null,
                  withdrawnReason: null,
                  createdAt: new Date("2026-09-24T00:00:00.000Z"),
                },
              ],
            });
          }

          if (getDrizzleTableName(table) === "activity") {
            return createInsertResult();
          }

          throw new Error("Unexpected insert table");
        },
      })),
    };

    const { recordConsentForSpace } = await importStoreWithDb(dbMock);
    const result = await recordConsentForSpace({
      spaceId: "11111111-1111-1111-1111-111111111111",
      recordedByMembership: {
        id: "22222222-2222-2222-2222-222222222222",
        spaceId: "11111111-1111-1111-1111-111111111111",
        userId: "user-1",
        role: "steward",
        localeOverride: null,
        invitedByMembershipId: null,
        invitedAt: null,
        joinedAt: new Date("2026-09-24T00:00:00.000Z"),
        createdAt: new Date("2026-09-24T00:00:00.000Z"),
      },
      evidenceType: "written",
      evidenceText: "Payag ako sa GUNITA.",
      participationApproved: true,
      aiProcessingAllowed: true,
      familyVisibilityDefault: "family",
      memorialUseAllowed: true,
      voiceClipsAllowed: false,
      stewardAttestation: true,
    });

    expect(uploadSourceFile).toHaveBeenCalledWith(
      "11111111-1111-1111-1111-111111111111",
      expect.stringMatching(/^consent-.*\.txt$/),
      "Payag ako sa GUNITA.",
      "text/plain",
    );
    expect(insertedSources[0]).toMatchObject({
      visibility: "private",
      type: "text",
      origin: "from_them",
      status: "ready",
      blobPathname: "https://blob.example.com/sources/space-1/consent-1.txt",
      mimeType: "text/plain",
      byteSize: Buffer.byteLength("Payag ako sa GUNITA.", "utf-8"),
    });
    expect(insertedConsents[0]).toMatchObject({
      spaceId: "11111111-1111-1111-1111-111111111111",
      evidenceSourceId: "source-1",
      participationConsented: true,
      aiProcessingConsented: true,
    });
    expect(result.evidenceSource.visibility).toBe("private");
    expect(result.consent.participationApproved).toBe(true);
  });

  it("stores voice consent as a ready private audio source without re-uploading it", async () => {
    const insertedSources: Array<Record<string, unknown>> = [];
    const uploadSourceFile = vi.fn();

    vi.doMock("@/src/media/blob", () => ({ uploadSourceFile }));

    const dbMock = {
      query: {
        consent: {
          findFirst: vi.fn().mockResolvedValue(undefined),
        },
      },
      insert: vi.fn((table: unknown) => ({
        values: (values: Record<string, unknown>) => {
          if (getDrizzleTableName(table) === "source") {
            insertedSources.push(values);

            return createInsertResult({
              returning: async () => [
                {
                  id: "source-2",
                  spaceId: values.spaceId,
                  type: values.type,
                  status: values.status,
                  statusReason: null,
                  origin: values.origin,
                  visibility: values.visibility,
                  contributorPersonId: null,
                  uploadedByMembershipId: values.uploadedByMembershipId,
                  blobPathname: values.blobPathname,
                  mimeType: values.mimeType,
                  byteSize: values.byteSize,
                  durationSeconds: null,
                  artifactContext: values.artifactContext,
                  aiVisibleDescription: null,
                  createdAt: new Date("2026-09-24T00:00:00.000Z"),
                  updatedAt: new Date("2026-09-24T00:00:00.000Z"),
                },
              ],
            });
          }

          if (getDrizzleTableName(table) === "consent") {
            return createInsertResult({
              returning: async () => [
                {
                  id: "consent-2",
                  spaceId: values.spaceId,
                  participationConsented: values.participationConsented,
                  aiProcessingConsented: values.aiProcessingConsented,
                  memorialUseAllowed: values.memorialUseAllowed,
                  voiceClipsAllowed: values.voiceClipsAllowed,
                  evidenceSourceId: values.evidenceSourceId,
                  recordedAt: new Date("2026-09-24T00:00:00.000Z"),
                  recordedByMembershipId: values.recordedByMembershipId,
                  withdrawnAt: null,
                  withdrawnReason: null,
                  createdAt: new Date("2026-09-24T00:00:00.000Z"),
                },
              ],
            });
          }

          if (getDrizzleTableName(table) === "activity") {
            return createInsertResult();
          }

          throw new Error("Unexpected insert table");
        },
      })),
    };

    const { recordConsentForSpace } = await importStoreWithDb(dbMock);
    await recordConsentForSpace({
      spaceId: "11111111-1111-1111-1111-111111111111",
      recordedByMembership: {
        id: "22222222-2222-2222-2222-222222222222",
        spaceId: "11111111-1111-1111-1111-111111111111",
        userId: "user-1",
        role: "steward",
        localeOverride: null,
        invitedByMembershipId: null,
        invitedAt: null,
        joinedAt: new Date("2026-09-24T00:00:00.000Z"),
        createdAt: new Date("2026-09-24T00:00:00.000Z"),
      },
      evidenceType: "voice",
      evidenceText: "Payag ako sa GUNITA.",
      evidenceMediaReferenceId: "https://blob.example.com/voice-consent.webm",
      participationApproved: true,
      aiProcessingAllowed: true,
      familyVisibilityDefault: "family",
      memorialUseAllowed: true,
      voiceClipsAllowed: true,
      stewardAttestation: true,
    });

    expect(uploadSourceFile).not.toHaveBeenCalled();
    expect(insertedSources[0]).toMatchObject({
      type: "audio",
      status: "ready",
      visibility: "private",
      blobPathname: "https://blob.example.com/voice-consent.webm",
      mimeType: "audio/webm",
      byteSize: 0,
    });
    expect(insertedSources[0]?.artifactContext).toMatchObject({
      consent: {
        evidenceType: "voice",
        mediaReferenceId: "https://blob.example.com/voice-consent.webm",
      },
    });
  });
});

describe("TASK-006 route behavior", () => {
  it("accepts the documented featuredPersonName contract", async () => {
    const requireSession = vi.fn().mockResolvedValue({ user: { id: "user-1" } });
    const createSpaceForSteward = vi.fn().mockResolvedValue({
      space: {
        id: "space-1",
        featuredPersonName: "Lola Nena",
        locale: "fil",
        createdAt: "2026-09-24T00:00:00.000Z",
        updatedAt: "2026-09-24T00:00:00.000Z",
        createdByUserId: "user-1",
      },
      membership: {
        id: "membership-1",
        spaceId: "space-1",
        userId: "user-1",
        role: "steward",
        createdAt: "2026-09-24T00:00:00.000Z",
        invitedAt: null,
        joinedAt: "2026-09-24T00:00:00.000Z",
        invitedByMembershipId: null,
      },
    });

    vi.resetModules();
    vi.doMock("@/src/auth/session", () => ({ requireSession }));
    vi.doMock("@/src/auth/store", () => ({ createSpaceForSteward }));

    const { POST } = await import("../../app/api/spaces/route");
    const response = await POST(
      new Request("http://localhost:3000/api/spaces", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          featuredPersonName: "Lola Nena",
          locale: "fil",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(createSpaceForSteward).toHaveBeenCalledWith({
      featuredPersonName: "Lola Nena",
      locale: "fil",
      userId: "user-1",
    });
  });

  it("rejects POST /api/spaces when featuredPersonName is missing", async () => {
    const requireSession = vi.fn().mockResolvedValue({ user: { id: "user-1" } });
    const createSpaceForSteward = vi.fn();

    vi.resetModules();
    vi.doMock("@/src/auth/session", () => ({ requireSession }));
    vi.doMock("@/src/auth/store", () => ({ createSpaceForSteward }));

    const { POST } = await import("../../app/api/spaces/route");
    const response = await POST(
      new Request("http://localhost:3000/api/spaces", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          locale: "fil",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(createSpaceForSteward).not.toHaveBeenCalled();

    const body = await response.json();

    expect(body.error.code).toBe("INVALID_BODY");
    expect(body.error.details.fieldErrors.featuredPersonName).toBeDefined();
  });

  it("rejects the undocumented POST /api/spaces name alias", async () => {
    const requireSession = vi.fn().mockResolvedValue({ user: { id: "user-1" } });
    const createSpaceForSteward = vi.fn();

    vi.resetModules();
    vi.doMock("@/src/auth/session", () => ({ requireSession }));
    vi.doMock("@/src/auth/store", () => ({ createSpaceForSteward }));

    const { POST } = await import("../../app/api/spaces/route");
    const response = await POST(
      new Request("http://localhost:3000/api/spaces", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Lola Nena",
          locale: "fil",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(createSpaceForSteward).not.toHaveBeenCalled();

    const body = await response.json();

    expect(body.error.code).toBe("INVALID_BODY");
    expect(body.error.details.fieldErrors.featuredPersonName).toBeDefined();
  });

  it("preserves Better Auth's successful response and cookie when invite acceptance fails", async () => {
    const handlerPost = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "set-cookie": "better-auth.session_token=abc123; Path=/; HttpOnly",
        },
      }),
    );
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    vi.resetModules();
    vi.doMock("@/src/auth/auth", () => ({ getAuth: vi.fn(() => ({})) }));
    vi.doMock("better-auth/next-js", () => ({
      toNextJsHandler: () => ({
        GET: vi.fn(),
        POST: handlerPost,
        PATCH: vi.fn(),
        PUT: vi.fn(),
        DELETE: vi.fn(),
      }),
    }));
    vi.doMock("@/src/auth/store", () => ({
      validateInviteCode: vi.fn().mockResolvedValue({}),
      findUserByEmail: vi.fn().mockResolvedValue({ id: "user-2" }),
      acceptInviteForUser: vi.fn().mockRejectedValue(new Error("invite acceptance failed")),
    }));

    const { POST } = await import("../../app/api/auth/[...all]/route");
    const response = await POST(
      new Request("http://localhost:3000/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "family@example.com",
          password: "Password123",
          inviteCode: "ABCDEFG234",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("better-auth.session_token=abc123");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Invite acceptance failed after successful auth.",
      expect.objectContaining({
        inviteCode: "ABCDEFG234",
      }),
    );
  });
});

describe("TASK-006 auth configuration", () => {
  it("does not require BETTER_AUTH_SECRET just to import the auth route module", { timeout: 10_000 }, async () => {
    const originalSecret = process.env.BETTER_AUTH_SECRET;

    delete process.env.BETTER_AUTH_SECRET;
    vi.resetModules();

    await expect(import("../../app/api/auth/[...all]/route")).resolves.toBeDefined();

    if (originalSecret) {
      process.env.BETTER_AUTH_SECRET = originalSecret;
    }
  });

  it("fails fast when BETTER_AUTH_SECRET is missing at runtime auth construction", async () => {
    const originalSecret = process.env.BETTER_AUTH_SECRET;

    delete process.env.BETTER_AUTH_SECRET;
    vi.resetModules();

    const { getAuth } = await import("./auth");

    expect(() => getAuth()).toThrow(
      "BETTER_AUTH_SECRET is required (see docs/ops.md § Configuration & secrets).",
    );

    if (originalSecret) {
      process.env.BETTER_AUTH_SECRET = originalSecret;
    }
  });
});
