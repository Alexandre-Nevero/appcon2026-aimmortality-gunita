import { questionStatusSchema } from "@gunita/core";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireMembership } from "@/src/access/session";
import { db } from "@/src/db";
import { question } from "@/src/db/schema";

// GET /api/spaces/:id/questions?status=queued — F-014: the GUNITA Question (Hint) queue.
// Steward-only (docs/sitemap.md S-008 access table: "Steward | ... S-008 ...").
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: spaceId } = await context.params;
  const membership = await requireMembership(request, spaceId);
  if (membership.role !== "steward") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const statusParam = request.nextUrl.searchParams.get("status");
  const statusFilter = statusParam ? questionStatusSchema.safeParse(statusParam) : null;
  if (statusParam && !statusFilter?.success) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const rows = await db.query.question.findMany({
    where: and(
      eq(question.spaceId, spaceId),
      statusFilter?.success ? eq(question.status, statusFilter.data) : undefined,
    ),
  });
  return NextResponse.json({ questions: rows });
}

const patchBodySchema = z.object({
  questionId: z.uuid(),
  status: questionStatusSchema,
});

// PATCH /api/spaces/:id/questions {questionId, status} — F-014: the steward can queue or dismiss a
// question (frozen route contract, docs/implementation-plan.md §0.1 — PATCH shares the collection
// path rather than a nested /questions/:id, so both methods match the same route file). Steward-only,
// same as GET above.
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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
  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  const existing = await db.query.question.findFirst({
    where: and(eq(question.id, parsed.data.questionId), eq(question.spaceId, spaceId)),
  });
  if (!existing) {
    return NextResponse.json({ error: "question_not_found" }, { status: 404 });
  }

  const [updated] = await db
    .update(question)
    .set({
      status: parsed.data.status,
      resolvedAt: parsed.data.status === "queued" ? null : new Date(),
    })
    .where(eq(question.id, parsed.data.questionId))
    .returning();

  return NextResponse.json({ question: updated });
}
