import type { MembershipRole } from "@gunita/core";
import type { NextRequest } from "next/server";

import { ApiError } from "@/src/auth/errors";
import { requireSession } from "@/src/auth/session";
import { findMembership } from "@/src/auth/store";

export interface SessionMembership {
  membershipId: string;
  role: MembershipRole;
}

// Real Better Auth session -> membership resolver (TASK-006 landed). Centralized here (rather than
// copied per route, as TASK-008 originally did) so every route shares one implementation. Throws
// ApiError — every caller must catch it via apps/web/src/auth/http.ts's errorResponse, the same
// pattern apps/web/src/auth/* routes already use, so an anonymous or non-member request gets a
// clean 401/403 instead of an unstyled 500.
export async function requireMembership(
  request: NextRequest,
  spaceId: string,
): Promise<SessionMembership> {
  const session = await requireSession(request);
  const membership = await findMembership(spaceId, session.user.id);

  if (!membership) {
    throw new ApiError(403, "SPACE_ACCESS_DENIED", "You are not a member of this family space.");
  }

  return { membershipId: membership.id, role: membership.role };
}
