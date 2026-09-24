import { NextRequest, NextResponse } from "next/server";

import { db } from "@/src/db";
import { findPublicMemorial } from "@/src/memories/queries";
import { MemorialError, submitPublicContribution } from "@/src/memorial/service";

const PUBLIC_CONTRIBUTION_ERROR_STATUS: Record<MemorialError["code"], number> = {
  space_not_found: 404,
  featured_person_not_found: 404,
  invalid_confirmation_name: 400,
  no_items_selected: 400,
  invalid_item_selection: 400,
  invalid_snapshot: 400,
  contribution_not_found: 404,
  rate_limited: 429,
};

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const memorial = await findPublicMemorial(db, token);
  if (!memorial) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const created = await submitPublicContribution(db, {
      request,
      spaceId: memorial.spaceId,
      visitId: request.headers.get("x-gunita-visit-id"),
    });
    return NextResponse.json({ contributionId: created.id, status: created.status }, { status: 201 });
  } catch (error) {
    if (error instanceof MemorialError) {
      return NextResponse.json(
        { error: error.code },
        { status: PUBLIC_CONTRIBUTION_ERROR_STATUS[error.code] },
      );
    }
    throw error;
  }
}
