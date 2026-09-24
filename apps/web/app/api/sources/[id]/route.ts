import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { requireMembership } from "@/src/access/session";
import { errorResponse } from "@/src/auth/http";
import { deleteSourceFile } from "@/src/media/blob";
import { db } from "@/src/db";
import { activity, item, recap, source } from "@/src/db/schema";

// System Design: "Client polls GET /api/sources/:id every 2 s until ready | failed" (Methods:
// processing poll interval = 2 s). Any member of the source's space may poll it — uploads can come
// from a family member too, not just the steward (System Design capture authz: "steward or family
// for photo/doc/text"). Previously had no auth check at all; requireMembership now enforces one.
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const row = await db.query.source.findFirst({ where: eq(source.id, id) });
    if (!row) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    await requireMembership(request, row.spaceId);
    return NextResponse.json({
      id: row.id,
      status: row.status,
      statusReason: row.statusReason,
      aiVisibleDescription: row.aiVisibleDescription,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

// BR-070/TC-055: deleting a source removes its items (schema CASCADE handles item/item_revision/
// recipe_step/item_person/source_segment), and must also strip any recap cards referencing it and
// delete the underlying Blob object. Steward-only (System Design "Security & access").
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const row = await db.query.source.findFirst({ where: eq(source.id, id) });
    if (!row) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const membership = await requireMembership(request, row.spaceId);
    if (membership.role !== "steward") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // Read what we'll need to clean up *before* deleting — once the source (and its cascaded items)
    // are gone, we can no longer look them up.
    const itemsFromSource = await db.query.item.findMany({ where: eq(item.sourceId, id) });
    const removedItemIds = new Set(itemsFromSource.map((i) => i.id));
    const recapRow = await db.query.recap.findFirst({ where: eq(recap.spaceId, row.spaceId) });

    // consent.evidenceSourceId is ON DELETE RESTRICT (data-model.md): deleting a source still
    // serving as consent evidence throws here. Do the delete *before* any other write, so a failure
    // leaves no false "source_deleted" activity entry or a recap already stripped of cards for a
    // source that, in fact, still exists.
    await db.delete(source).where(eq(source.id, id));

    if (recapRow) {
      const snapshot = Array.isArray(recapRow.snapshot) ? recapRow.snapshot : [];
      const filtered = snapshot.filter(
        (card: { sourceId?: string; itemId?: string }) =>
          card.sourceId !== id && !(card.itemId && removedItemIds.has(card.itemId)),
      );
      if (filtered.length !== snapshot.length) {
        await db.update(recap).set({ snapshot: filtered }).where(eq(recap.id, recapRow.id));
      }
    }

    await db.insert(activity).values({
      spaceId: row.spaceId,
      membershipId: membership.membershipId,
      type: "source_deleted",
      targetType: "source",
      targetId: id,
    });

    try {
      await deleteSourceFile(row.blobPathname);
    } catch (error) {
      // Not fatal: the DB-level deletion (the part BR-070 and TC-055 actually gate on) already
      // succeeded. An orphaned Blob object is a storage-hygiene issue, not a data-integrity one.
      console.error(`Failed to delete Blob object for source ${id}:`, error);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
