import { describe, expect, it } from "vitest";

import {
  MAX_UPLOAD_BYTES,
  sniffFileKind,
  sourceTypeFromMime,
  validateUpload,
} from "../src/media/validate";

// TC-010 — Upload validation
describe("validateUpload", () => {
  it("accepts an allowed type under the cap", () => {
    expect(
      validateUpload({ sourceType: "audio", mimeType: "audio/webm", byteSize: 1024 }),
    ).toBeNull();
  });

  it("rejects a file over 4 MB", () => {
    const result = validateUpload({
      sourceType: "audio",
      mimeType: "audio/webm",
      byteSize: MAX_UPLOAD_BYTES + 1,
    });
    expect(result?.code).toBe("too_large");
  });

  it("rejects an unknown MIME type (e.g. a renamed .exe)", () => {
    const result = validateUpload({
      sourceType: "audio",
      mimeType: "application/x-msdownload",
      byteSize: 1024,
    });
    expect(result?.code).toBe("unsupported_type");
  });

  it("rejects a MIME type that doesn't match the declared source type", () => {
    const result = validateUpload({ sourceType: "photo", mimeType: "audio/webm", byteSize: 1024 });
    expect(result?.code).toBe("mime_mismatch");
  });
});

describe("sourceTypeFromMime", () => {
  it("maps known MIME types to their source type", () => {
    expect(sourceTypeFromMime("audio/webm")).toBe("audio");
    expect(sourceTypeFromMime("image/jpeg")).toBe("photo");
    expect(sourceTypeFromMime("application/pdf")).toBe("document");
  });

  it("returns null for an unrecognized MIME type", () => {
    expect(sourceTypeFromMime("application/x-msdownload")).toBeNull();
  });
});

// TC-010 — a renamed file (e.g. `.exe` saved as `.webm`) is caught by its actual bytes
describe("sniffFileKind", () => {
  it("identifies real formats by their magic bytes", () => {
    expect(sniffFileKind(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]))).toBe(
      "document",
    ); // %PDF-1.4
    expect(sniffFileKind(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("photo"); // JPEG
    expect(sniffFileKind(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]))).toBe("photo"); // PNG
    expect(sniffFileKind(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x01]))).toBe("audio"); // WebM
  });

  it("doesn't recognize an executable's bytes as any allowed kind", () => {
    // MZ header — a Windows executable, regardless of what Content-Type the client claims.
    const exeBytes = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
    expect(sniffFileKind(exeBytes)).toBeNull();
  });
});
