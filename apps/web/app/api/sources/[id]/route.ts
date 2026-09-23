import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/src/db";
import { source } from "@/src/db/schema";

// System Design: "Client polls GET /api/sources/:id every 2 s until ready | failed" (Methods:
// processing poll interval = 2 s).
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const row = await db.query.source.findFirst({ where: eq(source.id, id) });
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    id: row.id,
    status: row.status,
    statusReason: row.statusReason,
    aiVisibleDescription: row.aiVisibleDescription,
  });
}
