import { NextRequest, NextResponse } from "next/server";

import { requireMembership } from "@/src/access/session";
import { db } from "@/src/db";
import { activateMemorialMode, MemorialError } from "@/src/memorial/service";
import { memorialActivateRequestSchema } from "@/src/memorial/schema";

const ACTIVATE_ERROR_STATUS: Record<MemorialError["code"], number> = {
  space_not_found: 404,
  featured_person_not_found: 404,
  invalid_confirmation_name: 400,
  no_items_selected: 400,
  invalid_item_selection: 400,
  invalid_snapshot: 400,
  contribution_not_found: 404,
  rate_limited: 429,
};

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: spaceId } = await context.params;
  const membership = await requireMembership(request, spaceId);
  if (membership.role !== "steward") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = memorialActivateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await activateMemorialMode(db, {
      spaceId,
      membershipId: membership.membershipId,
      action: parsed.data.action,
      typedName: "typedName" in parsed.data ? parsed.data.typedName : undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MemorialError) {
      return NextResponse.json({ error: error.code }, { status: ACTIVATE_ERROR_STATUS[error.code] });
    }
    throw error;
  }
}
