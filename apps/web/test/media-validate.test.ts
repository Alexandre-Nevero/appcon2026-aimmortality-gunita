import { describe, expect, it } from "vitest";

import { MAX_UPLOAD_BYTES, sourceTypeFromMime, validateUpload } from "../src/media/validate";

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
