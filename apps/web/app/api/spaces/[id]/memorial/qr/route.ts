import { NextRequest, NextResponse } from "next/server";

import { requireMembership } from "@/src/access/session";
import { db } from "@/src/db";
import { getMemorialQrState, MemorialError } from "@/src/memorial/service";

const QR_ERROR_STATUS: Record<MemorialError["code"], number> = {
  space_not_found: 404,
  featured_person_not_found: 404,
  invalid_confirmation_name: 400,
  no_items_selected: 400,
  invalid_item_selection: 400,
  invalid_snapshot: 409,
  contribution_not_found: 404,
  rate_limited: 429,
};

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: spaceId } = await context.params;
  const membership = await requireMembership(request, spaceId);
  if (membership.role !== "steward") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const result = await getMemorialQrState(db, spaceId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MemorialError) {
      return NextResponse.json({ error: error.code }, { status: QR_ERROR_STATUS[error.code] });
    }
    throw error;
  }
}
