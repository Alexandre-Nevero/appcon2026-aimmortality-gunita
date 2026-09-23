import { eq } from "drizzle-orm";
import { after, NextRequest, NextResponse } from "next/server";

import { models } from "@/src/ai/models";
import { processSource } from "@/src/ai/pipeline";
import { db } from "@/src/db";
import { source } from "@/src/db/schema";

// System Design: "any step fails → status = failed(step, reason); UI shows retry
// (POST /sources/:id/retry)".
export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const row = await db.query.source.findFirst({ where: eq(source.id, id) });
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (row.status !== "failed") {
    return NextResponse.json({ error: "not_failed" }, { status: 409 });
  }

  await db.update(source).set({ status: "uploaded", statusReason: null }).where(eq(source.id, id));
  after(() => processSource(db, models, id));
  return NextResponse.json({ id: row.id, status: "processing" }, { status: 202 });
}
