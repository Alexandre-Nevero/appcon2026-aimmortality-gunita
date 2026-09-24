import { originSchema } from "@gunita/core";
import { eq } from "drizzle-orm";
import { after, NextRequest, NextResponse } from "next/server";

import { requireMembership } from "@/src/access/session";
import { errorResponse } from "@/src/auth/http";
import { models } from "@/src/ai/models";
import { processSource } from "@/src/ai/pipeline";
import { db } from "@/src/db";
import { consent, source } from "@/src/db/schema";
import { uploadSourceFile } from "@/src/media/blob";
import { sniffFileKind, sourceTypeFromMime, validateUpload } from "@/src/media/validate";

// System Design "Capture → structure": POST /api/spaces/:id/sources (multipart).
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: spaceId } = await context.params;
    const membership = await requireMembership(request, spaceId);

    // BR-001: no capture/upload/AI processing until consent is recorded. BR-004: withdrawal stops
    // new capture — a withdrawn space still has both booleans true (data-model.md: "withdrawal does
    // not create a new row"), so withdrawnAt must be checked too, not just the two consent flags.
    const consentRow = await db.query.consent.findFirst({ where: eq(consent.spaceId, spaceId) });
    if (
      !consentRow?.participationConsented ||
      !consentRow.aiProcessingConsented ||
      consentRow.withdrawnAt != null
    ) {
      return NextResponse.json({ error: "consent_required" }, { status: 409 });
    }

    const form = await request.formData();
    const file = form.get("file");
    const typedText = form.get("text");

    // A typed memory has no uploaded file, but its text still goes to Blob (as its own small text
    // file) so it stays retrievable in its original form (F-003) and `processSource` can fetch every
    // source type the same way, uniformly.
    if (typeof typedText === "string" && typedText.trim()) {
      const originInput = form.get("origin");
      const origin = originSchema.parse(
        originInput ?? (membership.role === "steward" ? "from_them" : "about_them"),
      );
      const { url } = await uploadSourceFile(spaceId, "memory.txt", typedText, "text/plain");
      const [created] = await db
        .insert(source)
        .values({
          spaceId,
          type: "text",
          origin,
          visibility: "private",
          uploadedByMembershipId: membership.membershipId,
          blobPathname: url,
          mimeType: "text/plain",
          byteSize: Buffer.byteLength(typedText, "utf-8"),
        })
        .returning();
      after(() => processSource(db, models, created.id));
      return NextResponse.json({ sourceId: created.id }, { status: 202 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "missing_file" }, { status: 400 });
    }

    const sourceType = sourceTypeFromMime(file.type);
    if (!sourceType) {
      return NextResponse.json({ error: "unsupported_type" }, { status: 400 });
    }
    const validationError = validateUpload({
      sourceType,
      mimeType: file.type,
      byteSize: file.size,
    });
    if (validationError) {
      return NextResponse.json({ error: validationError.code, message: validationError.message }, {
        status: 400,
      });
    }

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    // System Design "Uploads: MIME sniffing plus allowlist" — a renamed file (e.g. an `.exe` saved as
    // `.webm`) declares whatever Content-Type the client sends; check the actual bytes too.
    if (sniffFileKind(fileBytes) !== sourceType) {
      return NextResponse.json({ error: "content_mismatch" }, { status: 400 });
    }

    const originInput = form.get("origin");
    const origin = originSchema.parse(
      originInput ?? (membership.role === "steward" ? "from_them" : "about_them"),
    );
    const artifactContextRaw = form.get("artifactContext");
    let artifactContext: unknown = null;
    if (typeof artifactContextRaw === "string" && artifactContextRaw) {
      try {
        artifactContext = JSON.parse(artifactContextRaw);
      } catch {
        return NextResponse.json({ error: "invalid_artifact_context" }, { status: 400 });
      }
    }

    const { url } = await uploadSourceFile(spaceId, file.name, fileBytes.buffer as ArrayBuffer, file.type);

    const [created] = await db
      .insert(source)
      .values({
        spaceId,
        type: sourceType,
        origin,
        visibility: "private",
        uploadedByMembershipId: membership.membershipId,
        blobPathname: url,
        mimeType: file.type,
        byteSize: file.size,
        artifactContext,
      })
      .returning();

    after(() => processSource(db, models, created.id));
    return NextResponse.json({ sourceId: created.id }, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
