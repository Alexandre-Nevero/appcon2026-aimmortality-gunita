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

export function sourceTypeFromMime(mimeType: string): Exclude<SourceType, "text"> | null {
  const entries = Object.entries(ALLOWED_MIME_BY_TYPE) as Array<
    [Exclude<SourceType, "text">, readonly string[]]
  >;
  for (const [type, mimes] of entries) {
    if (mimes.includes(mimeType)) return type;
  }
  return null;
}

function bytesStartWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, i) => bytes[offset + i] === byte);
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  if (bytes.length < offset + length) return "";
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

// A renamed file (e.g. an `.exe` saved as `.webm`) declares whatever Content-Type the client sends,
// which sourceTypeFromMime/validateUpload can't see through on their own — System Design requires
// "MIME sniffing plus allowlist". This checks the file's actual leading bytes against known format
// signatures instead of trusting the declared type. Coarse (family-level, not exact codec), which
// is enough to catch a mismatched/spoofed upload without needing a full file-type library.
export function sniffFileKind(bytes: Uint8Array): Exclude<SourceType, "text"> | null {
  if (bytesStartWith(bytes, [0x25, 0x50, 0x44, 0x46])) return "document"; // %PDF
  if (bytesStartWith(bytes, [0xff, 0xd8, 0xff])) return "photo"; // JPEG
  if (bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return "photo"; // PNG
  if (bytesStartWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return "audio"; // WebM/EBML
  if (bytesStartWith(bytes, [0x49, 0x44, 0x33])) return "audio"; // MP3 (ID3 tag)
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return "audio"; // MP3 frame sync
  if (bytesStartWith(bytes, [0x52, 0x49, 0x46, 0x46]) && readAscii(bytes, 8, 4) === "WAVE") {
    return "audio"; // RIFF....WAVE
  }
  if (readAscii(bytes, 4, 4) === "ftyp") {
    const brand = readAscii(bytes, 8, 4).trim();
    const heicBrands = ["heic", "heix", "heim", "heis", "hevc", "hevx", "mif1", "msf1"];
    return heicBrands.includes(brand) ? "photo" : "audio"; // mp4/m4a family otherwise
  }
  return null;
}
