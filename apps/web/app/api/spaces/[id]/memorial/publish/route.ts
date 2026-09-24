import { NextRequest, NextResponse } from "next/server";

import { requireMembership } from "@/src/access/session";
import { db } from "@/src/db";
import {
  draftMemorialRecap,
  MemorialError,
  publishMemorialRecap,
  setMemorialLinkState,
} from "@/src/memorial/service";
import { memorialPublishRequestSchema } from "@/src/memorial/schema";

const PUBLISH_ERROR_STATUS: Record<MemorialError["code"], number> = {
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

  const parsed = memorialPublishRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    if (parsed.data.action === "draft") {
      const result = await draftMemorialRecap(db, { spaceId, itemIds: parsed.data.itemIds });
      return NextResponse.json({ recap: result.recap, cards: result.cards });
    }

    if (parsed.data.action === "set_link_state") {
      const result = await setMemorialLinkState(db, {
        spaceId,
        membershipId: membership.membershipId,
        disabled: parsed.data.disabled,
      });
      return NextResponse.json({
        enabled: !result.memorialLinkDisabled,
        memorialToken: result.memorialToken,
      });
    }

    const saved = await publishMemorialRecap(db, {
      spaceId,
      membershipId: membership.membershipId,
      cards: parsed.data.cards,
    });
    return NextResponse.json({ recap: saved });
  } catch (error) {
    if (error instanceof MemorialError) {
      return NextResponse.json({ error: error.code }, { status: PUBLISH_ERROR_STATUS[error.code] });
    }
    throw error;
  }
}
