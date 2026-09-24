import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("public memorial contribution route", () => {
  it("accepts visitor submissions without an account and returns 201 (TC-050)", async () => {
    vi.doMock("@/src/db", () => ({ db: {} }));
    vi.doMock("@/src/memories/queries", () => ({
      findPublicMemorial: vi.fn().mockResolvedValue({ spaceId: "space-1" }),
    }));
    vi.doMock("@/src/memorial/service", async () => {
      const actual = await vi.importActual<typeof import("../src/memorial/service")>(
        "../src/memorial/service",
      );
      return {
        ...actual,
        submitPublicContribution: vi.fn().mockResolvedValue({ id: "contrib-1", status: "pending" }),
      };
    });

    const { POST } = await import("../app/api/m/[token]/contributions/route");
    const form = new FormData();
    form.set("displayName", "Ana");
    form.set("relationship", "Kapitbahay");
    form.set("text", "Naalala ko pa ang kanyang tawa.");
    const response = await POST(
      new NextRequest("http://localhost/api/m/token/contributions", { method: "POST", body: form }),
      { params: Promise.resolve({ token: "token" }) },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      contributionId: "contrib-1",
      status: "pending",
    });
  });

  it("rejects a missing memorial or a rate-limited visitor with explicit statuses (TC-052)", async () => {
    vi.doMock("@/src/db", () => ({ db: {} }));
    vi.doMock("@/src/memories/queries", () => ({
      findPublicMemorial: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ spaceId: "space-1" }),
    }));
    vi.doMock("@/src/memorial/service", async () => {
      const actual = await vi.importActual<typeof import("../src/memorial/service")>(
        "../src/memorial/service",
      );
      return {
        ...actual,
        submitPublicContribution: vi.fn().mockRejectedValue(
          new actual.MemorialError("rate_limited", "Please wait a few minutes."),
        ),
      };
    });

    const { POST } = await import("../app/api/m/[token]/contributions/route");

    const emptyForm = new FormData();
    let response = await POST(
      new NextRequest("http://localhost/api/m/missing/contributions", { method: "POST", body: emptyForm }),
      { params: Promise.resolve({ token: "missing" }) },
    );
    expect(response.status).toBe(404);

    const form = new FormData();
    form.set("displayName", "Ana");
    form.set("relationship", "Kapitbahay");
    form.set("text", "Muli akong bumisita.");
    response = await POST(
      new NextRequest("http://localhost/api/m/token/contributions", { method: "POST", body: form }),
      { params: Promise.resolve({ token: "token" }) },
    );
    expect(response.status).toBe(429);
  });
});

describe("steward moderation route", () => {
  it("lets a steward approve contributions and blocks family members (TC-053)", async () => {
    vi.doMock("@/src/db", () => ({ db: {} }));
    vi.doMock("@/src/access/session", () => ({
      requireMembership: vi
        .fn()
        .mockResolvedValueOnce({ membershipId: "family-1", role: "family" })
        .mockResolvedValueOnce({ membershipId: "steward-1", role: "steward" }),
    }));
    vi.doMock("@/src/memorial/service", async () => {
      const actual = await vi.importActual<typeof import("../src/memorial/service")>(
        "../src/memorial/service",
      );
      return {
        ...actual,
        moderateContribution: vi.fn().mockResolvedValue({ id: "contrib-1", status: "approved" }),
      };
    });

    const { POST } = await import("../app/api/spaces/[id]/contributions/route");
    const body = JSON.stringify({ contributionId: "3188b040-98e5-46b8-8812-cd076e5eab2d", status: "approved" });

    let response = await POST(
      new NextRequest("http://localhost/api/spaces/space-1/contributions", {
        method: "POST",
        body,
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "space-1" }) },
    );
    expect(response.status).toBe(403);

    response = await POST(
      new NextRequest("http://localhost/api/spaces/space-1/contributions", {
        method: "POST",
        body,
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "space-1" }) },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      contribution: { status: "approved" },
    });
  });
});
