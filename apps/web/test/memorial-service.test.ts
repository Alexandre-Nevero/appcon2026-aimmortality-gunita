import { describe, expect, it, vi } from "vitest";

import {
  activateMemorialMode,
  getPublicMemorialSnapshot,
  isEligibleMemorialItem,
  MemorialError,
  submitPublicContribution,
} from "../src/memorial/service";

function createActivateDb(overrides?: {
  spaceRow?: Record<string, unknown> | null;
  featuredPerson?: Record<string, unknown> | null;
}) {
  const updates: Array<Record<string, unknown>> = [];
  const activityRows: unknown[] = [];
  const spaceRow = {
    id: "space-1",
    lifecycleMode: "during",
    memorialToken: null,
    memorialLinkDisabled: false,
    memorialActivatedAt: null,
    memorialReversedAt: null,
    ...overrides?.spaceRow,
  };
  const featuredPerson = {
    id: "person-1",
    displayName: "Lola Nena",
    ...overrides?.featuredPerson,
  };

  const updateWhere = { returning: vi.fn(async () => [{ ...spaceRow, ...updates.at(-1) }]) };
  const updateSet = {
    where: vi.fn(() => updateWhere),
  };
  const updateBuilder = {
    set: vi.fn((values: Record<string, unknown>) => {
      updates.push(values);
      return updateSet;
    }),
  };

  const db = {
    query: {
      space: { findFirst: vi.fn().mockResolvedValue(overrides?.spaceRow === null ? null : spaceRow) },
      person: {
        findFirst: vi.fn().mockResolvedValue(overrides?.featuredPerson === null ? null : featuredPerson),
      },
    },
    update: vi.fn(() => updateBuilder),
    insert: vi.fn(() => ({
      values: vi.fn(async (value: unknown) => {
        activityRows.push(value);
        return [];
      }),
    })),
  };

  return { db: db as never, updates, activityRows };
}

function createSnapshotDb(row: Record<string, unknown> | null, contributions: unknown[] = []) {
  const selectChain = {
    from: vi.fn(() => selectChain),
    leftJoin: vi.fn(() => selectChain),
    where: vi.fn(() => selectChain),
    limit: vi.fn(async () => (row ? [row] : [])),
  };

  return {
    select: vi.fn(() => selectChain),
    query: {
      contribution: {
        findMany: vi.fn().mockResolvedValue(contributions),
      },
    },
  } as never;
}

describe("memorial service", () => {
  it("refuses unreviewed, rejected, non-memorial, or consent-blocked items (TC-041)", () => {
    expect(isEligibleMemorialItem({ reviewState: "ai_suggestion", visibility: "memorial" }, true)).toBe(false);
    expect(isEligibleMemorialItem({ reviewState: "rejected", visibility: "memorial" }, true)).toBe(false);
    expect(isEligibleMemorialItem({ reviewState: "verified", visibility: "family" }, true)).toBe(false);
    expect(isEligibleMemorialItem({ reviewState: "verified", visibility: "memorial" }, false)).toBe(false);
    expect(isEligibleMemorialItem({ reviewState: "verified", visibility: "memorial" }, true)).toBe(true);
  });

  it("requires the typed featured-person name and logs activation / reversal (TC-040)", async () => {
    const mismatch = createActivateDb();
    await expect(
      activateMemorialMode(mismatch.db, {
        spaceId: "space-1",
        membershipId: "membership-1",
        action: "activate",
        typedName: "Ibang Pangalan",
      }),
    ).rejects.toMatchObject({ code: "invalid_confirmation_name" satisfies MemorialError["code"] });

    const activate = createActivateDb();
    const activated = await activateMemorialMode(activate.db, {
      spaceId: "space-1",
      membershipId: "membership-1",
      action: "activate",
      typedName: "Lola Nena",
    });
    expect(activated.lifecycleMode).toBe("memorial");
    expect(String(activated.memorialToken)).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(activate.activityRows[0]).toMatchObject({ type: "memorial_activated" });

    const reverse = createActivateDb({
      spaceRow: { memorialToken: "abcdefghijklmnopqrstuv", lifecycleMode: "memorial" },
    });
    const reversed = await activateMemorialMode(reverse.db, {
      spaceId: "space-1",
      membershipId: "membership-1",
      action: "reverse",
    });
    expect(reversed.lifecycleMode).toBe("during");
    expect(reverse.activityRows[0]).toMatchObject({ type: "memorial_reversed" });
  });

  it("keeps unpublished, disabled, or reversed memorials private (TC-042/TC-045)", async () => {
    const draftSnapshot = await getPublicMemorialSnapshot(
      createSnapshotDb({
        spaceId: "space-1",
        locale: "fil",
        featuredName: "Lola Nena",
        lifecycleMode: "memorial",
        memorialLinkDisabled: false,
        memorialUseAllowed: true,
        withdrawnAt: null,
        recapStatus: "draft",
        snapshot: [],
      }),
      "token",
    );
    expect(draftSnapshot).toBeNull();

    const disabledSnapshot = await getPublicMemorialSnapshot(
      createSnapshotDb({
        spaceId: "space-1",
        locale: "fil",
        featuredName: "Lola Nena",
        lifecycleMode: "memorial",
        memorialLinkDisabled: true,
        memorialUseAllowed: true,
        withdrawnAt: null,
        recapStatus: "published",
        snapshot: [],
      }),
      "token",
    );
    expect(disabledSnapshot).toBeNull();
  });

  it('maps approved visitor contributions as "about_them", never "from_them" (TC-054)', async () => {
    const snapshot = await getPublicMemorialSnapshot(
      createSnapshotDb(
        {
          spaceId: "space-1",
          locale: "fil",
          featuredName: "Lola Nena",
          lifecycleMode: "memorial",
          memorialLinkDisabled: false,
          memorialUseAllowed: true,
          withdrawnAt: null,
          recapStatus: "published",
          snapshot: [
            {
              type: "closing",
              order: 0,
              itemId: null,
              sourceId: null,
              title: "Magbahagi ng alaala",
              body: null,
              caption: null,
              aiWritten: false,
              origin: null,
              reviewState: null,
              blobUrl: null,
              audioUrl: null,
              transcriptExcerpt: null,
              clip: null,
            },
          ],
        },
        [
          {
            id: "contrib-1",
            displayName: "Ana",
            relationship: "Pamangkin",
            textContent: "Naaalala ko pa ang tawanan niya.",
            photoBlobPathname: null,
            audioBlobPathname: null,
            status: "approved",
            submittedAt: new Date("2026-09-24T00:00:00Z"),
          },
        ],
      ),
      "token",
    );

    expect(snapshot?.contributions[0]).toMatchObject({
      origin: "about_them",
      status: "approved",
    });
  });

  it("blocks a name-only submission before any DB write (TC-051)", async () => {
    const form = new FormData();
    form.set("displayName", "Ana");
    form.set("relationship", "Kapitbahay");
    const rateLimitDb = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(async () => [{ count: 0 }]),
        })),
      })),
    };

    await expect(
      submitPublicContribution(rateLimitDb as never, {
        request: new Request("http://localhost/api/m/token/contributions", {
          method: "POST",
          body: form,
        }),
        spaceId: "space-1",
      }),
    ).rejects.toMatchObject({ code: "invalid_snapshot" satisfies MemorialError["code"] });
  });
});
