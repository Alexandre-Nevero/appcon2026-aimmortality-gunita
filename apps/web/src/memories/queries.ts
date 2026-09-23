import { isMemorialPublic, type Locale } from "@gunita/core";
import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";

import type { db as Database } from "../db";
import { contribution, person, recap, space, tribute } from "../db/schema";

type Db = typeof Database;

export interface PublicMemorial {
  spaceId: string;
  locale: Locale;
  featuredName: string | null;
}

// Null for an unknown, disabled, unpublished, or reversed memorial — callers render S-034 / 404.
export async function findPublicMemorial(db: Db, token: string): Promise<PublicMemorial | null> {
  const [row] = await db
    .select({
      spaceId: space.id,
      locale: space.locale,
      lifecycleMode: space.lifecycleMode,
      memorialLinkDisabled: space.memorialLinkDisabled,
      recapStatus: recap.status,
    })
    .from(space)
    .leftJoin(recap, eq(recap.spaceId, space.id))
    .where(eq(space.memorialToken, token))
    .limit(1);
  if (!row || !isMemorialPublic(row)) return null;

  const featured = await db.query.person.findFirst({
    where: and(eq(person.spaceId, row.spaceId), eq(person.isFeatured, true)),
  });
  return { spaceId: row.spaceId, locale: row.locale, featuredName: featured?.displayName ?? null };
}

export interface PhotoMemory {
  id: string;
  photoUrl: string;
  displayName: string;
  relationship: string;
  textContent: string | null;
  tributeCount: number;
  hearted: boolean;
}

const isPhotoMemory = and(eq(contribution.status, "approved"), isNotNull(contribution.photoBlobPathname));

// F-023: approved visitor photos, oldest first. Never ordered by tributes (ADR-007: no ranking).
export async function listPhotoMemories(
  db: Db,
  spaceId: string,
  visitorKeyHash: string | null,
): Promise<PhotoMemory[]> {
  const rows = await db
    .select({
      id: contribution.id,
      photoUrl: contribution.photoBlobPathname,
      displayName: contribution.displayName,
      relationship: contribution.relationship,
      textContent: contribution.textContent,
      tributeCount: sql<number>`count(${tribute.id})::int`,
    })
    .from(contribution)
    .leftJoin(tribute, eq(tribute.contributionId, contribution.id))
    .where(and(eq(contribution.spaceId, spaceId), isPhotoMemory))
    .groupBy(contribution.id)
    .orderBy(asc(contribution.submittedAt), asc(contribution.id));

  const hearted = new Set<string>();
  if (visitorKeyHash && rows.length > 0) {
    const mine = await db
      .select({ id: tribute.contributionId })
      .from(tribute)
      .where(
        and(
          eq(tribute.visitorKeyHash, visitorKeyHash),
          inArray(
            tribute.contributionId,
            rows.map((row) => row.id),
          ),
        ),
      );
    for (const row of mine) hearted.add(row.id);
  }

  return rows.flatMap((row) =>
    row.photoUrl ? [{ ...row, photoUrl: row.photoUrl, hearted: hearted.has(row.id) }] : [],
  );
}

// Returns the new count, or null when the target is not an approved photo in this memorial.
export async function setTribute(
  db: Db,
  spaceId: string,
  contributionId: string,
  visitorKeyHash: string,
  hearted: boolean,
): Promise<number | null> {
  const target = await db.query.contribution.findFirst({
    where: and(eq(contribution.id, contributionId), eq(contribution.spaceId, spaceId), isPhotoMemory),
    columns: { id: true },
  });
  if (!target) return null;

  if (hearted) {
    await db.insert(tribute).values({ contributionId, visitorKeyHash }).onConflictDoNothing();
  } else {
    await db
      .delete(tribute)
      .where(and(eq(tribute.contributionId, contributionId), eq(tribute.visitorKeyHash, visitorKeyHash)));
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tribute)
    .where(eq(tribute.contributionId, contributionId));
  return count;
}
