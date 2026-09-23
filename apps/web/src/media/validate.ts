import type { SourceType } from "@gunita/core";

// System Design "Security & access": MIME allowlist + 4 MB cap, Methods "Max upload size".
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

// A typed memory ("text" source type) has no file at all; it's created directly as source
// content, so it never goes through this MIME allowlist.
const ALLOWED_MIME_BY_TYPE: Record<Exclude<SourceType, "text">, readonly string[]> = {
  audio: ["audio/webm", "audio/mp4", "audio/m4a", "audio/mpeg", "audio/wav"],
  photo: ["image/jpeg", "image/png", "image/heic"],
  document: ["application/pdf"],
};

const ALL_ALLOWED_MIME_TYPES = new Set(Object.values(ALLOWED_MIME_BY_TYPE).flat());

export interface UploadValidationError {
  code: "too_large" | "unsupported_type" | "mime_mismatch";
  message: string;
}

export interface UploadValidationInput {
  sourceType: Exclude<SourceType, "text">;
  mimeType: string;
  byteSize: number;
}

// F-003 / TC-010: allowed types under the cap succeed; oversized, renamed, or unknown-MIME files are
// rejected with a specific error before anything is written to Blob.
export function validateUpload(input: UploadValidationInput): UploadValidationError | null {
  if (input.byteSize > MAX_UPLOAD_BYTES) {
    return { code: "too_large", message: `File is ${input.byteSize} bytes; the cap is 4 MB.` };
  }
  if (!ALL_ALLOWED_MIME_TYPES.has(input.mimeType)) {
    return { code: "unsupported_type", message: `MIME type "${input.mimeType}" isn't allowed.` };
  }
  if (!ALLOWED_MIME_BY_TYPE[input.sourceType].includes(input.mimeType)) {
    return {
      code: "mime_mismatch",
      message: `MIME type "${input.mimeType}" doesn't match source type "${input.sourceType}".`,
    };
  }
  return null;
}

// A renamed file (e.g. `.exe` saved as `.webm`) still declares its real MIME type via magic-byte
// sniffing done by the caller (Vercel Blob / the platform's file-type detection) before this runs;
// this function only enforces the allowlist against whatever MIME type was actually sniffed.
export function sourceTypeFromMime(mimeType: string): Exclude<SourceType, "text"> | null {
  const entries = Object.entries(ALLOWED_MIME_BY_TYPE) as Array<
    [Exclude<SourceType, "text">, readonly string[]]
  >;
  for (const [type, mimes] of entries) {
    if (mimes.includes(mimeType)) return type;
  }
  return null;
}
