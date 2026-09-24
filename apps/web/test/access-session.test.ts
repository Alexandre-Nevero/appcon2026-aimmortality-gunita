import { afterEach, describe, expect, it, vi } from "vitest";

async function importWithMocks(options: {
  session: { user: { id: string } } | null;
  membership: { id: string; role: "steward" | "family" } | undefined;
}) {
  vi.resetModules();
  vi.doMock("@/src/auth/session", () => ({
    requireSession: vi.fn(async () => {
      if (!options.session) {
        const { ApiError } = await vi.importActual<typeof import("@/src/auth/errors")>(
          "@/src/auth/errors",
        );
        throw new ApiError(401, "UNAUTHORIZED", "You must be signed in to use this endpoint.");
      }
      return options.session;
    }),
  }));
  vi.doMock("@/src/auth/store", () => ({
    findMembership: vi.fn(async () => options.membership),
  }));

  return import("../src/access/session");
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.doUnmock("@/src/auth/session");
  vi.doUnmock("@/src/auth/store");
});

describe("requireMembership (real Better Auth session -> membership resolver)", () => {
  it("throws 401 for an anonymous request", async () => {
    const { requireMembership } = await importWithMocks({ session: null, membership: undefined });

    await expect(
      requireMembership(new Request("http://localhost/x") as never, "space-1"),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("throws 403 for a signed-in user who isn't a member of this space", async () => {
    const { requireMembership } = await importWithMocks({
      session: { user: { id: "user-1" } },
      membership: undefined,
    });

    await expect(
      requireMembership(new Request("http://localhost/x") as never, "space-1"),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("returns the real membershipId and role for a signed-in member", async () => {
    const { requireMembership } = await importWithMocks({
      session: { user: { id: "user-1" } },
      membership: { id: "membership-1", role: "family" },
    });

    const result = await requireMembership(new Request("http://localhost/x") as never, "space-1");

    expect(result).toEqual({ membershipId: "membership-1", role: "family" });
  });
});
