import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";

import { getAuth } from "@/src/auth/auth";
import { findSpaceById, getMembershipForUser } from "@/src/auth/store";
import { db } from "@/src/db";
import { person } from "@/src/db/schema";

export interface CurrentContext {
  userId: string;
  membershipId: string;
  role: "steward" | "family";
  spaceId: string;
  spaceName: string;
  locale: "fil" | "en";
  lifecycleMode: "during" | "memorial";
  memorialToken: string | null;
  featuredName: string | null;
}

// Server-side "who is signed in, what space are they in" resolver for (app) pages. One space per
// user in the MVP (TASK-006), so getMembershipForUser's first match is authoritative.
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export async function getCurrentContext(): Promise<CurrentContext | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const membership = await getMembershipForUser(userId);
  if (!membership) return null;

  const space = await findSpaceById(membership.spaceId);
  if (!space) return null;

  const featured = await db.query.person.findFirst({
    where: and(eq(person.spaceId, space.id), eq(person.isFeatured, true)),
  });

  return {
    userId,
    membershipId: membership.id,
    role: membership.role,
    spaceId: space.id,
    spaceName: space.name,
    locale: membership.localeOverride ?? space.locale,
    lifecycleMode: space.lifecycleMode,
    memorialToken: space.memorialToken,
    featuredName: featured?.displayName ?? null,
  };
}
