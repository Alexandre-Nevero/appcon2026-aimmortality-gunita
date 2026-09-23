import type { MembershipRole } from "@gunita/core";
import type { NextRequest } from "next/server";

export interface SessionMembership {
  membershipId: string;
  role: MembershipRole;
}

// TODO(TASK-006): replace with the real Better Auth session → membership resolver once it lands.
// Centralized here (rather than copied per route, as TASK-008 originally did) so every route swaps
// to the real implementation in one place.
export async function requireMembership(
  _request: NextRequest,
  _spaceId: string,
): Promise<SessionMembership> {
  return { membershipId: "seed-steward-placeholder", role: "steward" };
}
