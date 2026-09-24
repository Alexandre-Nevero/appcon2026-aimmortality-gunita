import { afterEach, describe, expect, it, vi } from "vitest";

interface InsertConfig {
  returning?: () => unknown[];
}

function createInsertResult(config: InsertConfig = {}) {
  return { returning: async () => config.returning?.() ?? [] };
}

async function importRouteWithMocks(options: {
  role: "steward" | "family";
  inserted: Array<{ values: unknown }>;
}) {
  vi.resetModules();
  vi.doMock("@/src/access/session", () => ({
    requireMembership: vi.fn(async () => ({ membershipId: "membership-1", role: options.role })),
  }));
  vi.doMock("@/src/db", () => ({
    db: {
      insert: vi.fn(() => ({
        values: (values: unknown) => {
          options.inserted.push({ values });
          return createInsertResult({
            returning: () => [{ id: "question-1", spaceId: "space-1", ...(values as object) }],
          });
        },
      })),
      query: { question: { findMany: vi.fn(async () => []) } },
    },
  }));

  return import("../app/api/spaces/[id]/questions/route");
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.doUnmock("@/src/access/session");
  vi.doUnmock("@/src/db");
});

describe("POST /api/spaces/:id/questions (BR-038: Ask GUNITA abstain -> queue)", () => {
  it("persists an ask_abstain draft for any family member, not just the steward", { timeout: 10_000 }, async () => {
    const inserted: Array<{ values: unknown }> = [];
    const { POST } = await importRouteWithMocks({ role: "family", inserted });

    const response = await POST(
      new Request("http://localhost/api/spaces/space-1/questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: "Paano niya niluluto ang adobo?",
          locale: "fil",
          reason: "This question is not yet answered in the archive.",
          originKind: "ask_abstain",
        }),
      }) as never,
      { params: Promise.resolve({ id: "space-1" }) },
    );

    expect(response.status).toBe(201);
    expect(inserted).toHaveLength(1);
    expect(inserted[0]?.values).toMatchObject({
      spaceId: "space-1",
      originKind: "ask_abstain",
    });
  });

  it("rejects an origin kind other than ask_abstain (pipeline-internal origins aren't client-writable)", { timeout: 10_000 }, async () => {
    const inserted: Array<{ values: unknown }> = [];
    const { POST } = await importRouteWithMocks({ role: "family", inserted });

    const response = await POST(
      new Request("http://localhost/api/spaces/space-1/questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: "Should not be allowed",
          locale: "fil",
          reason: "forged reason",
          originKind: "hint",
        }),
      }) as never,
      { params: Promise.resolve({ id: "space-1" }) },
    );

    expect(response.status).toBe(400);
    expect(inserted).toHaveLength(0);
  });
});
