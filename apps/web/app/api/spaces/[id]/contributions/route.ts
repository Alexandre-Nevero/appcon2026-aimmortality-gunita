import { contributionStatusSchema } from "@gunita/core";
import { NextRequest, NextResponse } from "next/server";

import { requireMembership } from "@/src/access/session";
import { errorResponse } from "@/src/auth/http";
import { db } from "@/src/db";
import {
  listModerationContributions,
  MemorialError,
  moderateContribution,
} from "@/src/memorial/service";
import { contributionModerationRequestSchema } from "@/src/memorial/schema";

const CONTRIBUTION_ERROR_STATUS: Record<MemorialError["code"], number> = {
  space_not_found: 404,
  featured_person_not_found: 404,
  invalid_confirmation_name: 400,
  no_items_selected: 400,
  invalid_item_selection: 400,
  invalid_snapshot: 400,
  contribution_not_found: 404,
  rate_limited: 429,
};

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: spaceId } = await context.params;
    const membership = await requireMembership(request, spaceId);
    if (membership.role !== "steward") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const statusParam = request.nextUrl.searchParams.get("status");
    const parsedStatus = statusParam ? contributionStatusSchema.safeParse(statusParam) : null;
    if (statusParam && !parsedStatus?.success) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }

    const contributions = await listModerationContributions(db, {
      spaceId,
      status: parsedStatus?.success ? parsedStatus.data : undefined,
    });
    return NextResponse.json({ contributions });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
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

    const parsed = contributionModerationRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
    }

    const updated = await moderateContribution(db, {
      spaceId,
      membershipId: membership.membershipId,
      contributionId: parsed.data.contributionId,
      status: parsed.data.status,
    });
    return NextResponse.json({ contribution: updated });
  } catch (error) {
    if (error instanceof MemorialError) {
      return NextResponse.json({ error: error.code }, { status: CONTRIBUTION_ERROR_STATUS[error.code] });
    }
    return errorResponse(error);
  }
}
