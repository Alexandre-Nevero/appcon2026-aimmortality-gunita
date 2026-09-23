import { NextRequest, NextResponse } from "next/server";

import { db } from "@/src/db";
import { findPublicMemorial, setTribute } from "@/src/memories/queries";
import { tributeRequestSchema } from "@/src/memories/tribute-request";
import {
  hashVisitorId,
  isVisitorId,
  newVisitorId,
  VISITOR_COOKIE,
  VISITOR_COOKIE_MAX_AGE_SECONDS,
} from "@/src/memories/visitor";

// F-023, ADR-008: POST /api/m/:token/tributes { contributionId, hearted } → { hearted }. No count.
export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const memorial = await findPublicMemorial(db, token);
  if (!memorial) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const parsed = tributeRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const existing = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = isVisitorId(existing) ? existing : newVisitorId();
  const { contributionId, hearted } = parsed.data;
  const saved = await setTribute(db, memorial.spaceId, contributionId, hashVisitorId(visitorId), hearted);
  if (saved == null) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const response = NextResponse.json({ hearted: saved });
  if (visitorId !== existing) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: VISITOR_COOKIE_MAX_AGE_SECONDS,
    });
  }
  return response;
}
