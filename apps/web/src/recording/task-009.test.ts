import { describe, expect, it, vi } from "vitest";

import {
  classifyMediaError,
  createBrowserRecorder,
  createPlaybackUrl,
  exceedsSizeLimit,
  isRecordingError,
  MAX_RECORDING_BYTES,
  pickSupportedMimeType,
  remainingBytes,
  resolveMimeType,
  revokePlaybackUrl,
  totalChunkBytes,
  type RecorderEnvironment,
} from "./index";

// Minimal fake that mimics the parts of MediaRecorder the controller drives.
class FakeMediaRecorder {
  state: "inactive" | "recording" | "paused" = "inactive";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readonly mimeType: string;

  constructor(_stream: unknown, options: MediaRecorderOptions) {
    this.mimeType = options.mimeType ?? "";
  }

  start(_timeslice?: number): void {
    this.state = "recording";
  }

  stop(): void {
    if (this.state === "inactive") {
      return;
    }
    this.state = "inactive";
    this.onstop?.();
  }

  emit(bytes: number): void {
    this.ondataavailable?.({ data: new Blob([new Uint8Array(bytes)]) });
  }

  fail(error: unknown): void {
    this.onerror?.({ error } as unknown as Event);
  }
}

function createTestEnvironment(overrides: Partial<RecorderEnvironment> = {}): {
  environment: Partial<RecorderEnvironment>;
  getRecorder: () => FakeMediaRecorder;
  clock: { value: number };
} {
  let created: FakeMediaRecorder | undefined;
  const clock = { value: 0 };

  const environment: Partial<RecorderEnvironment> = {
    isSecureContext: true,
    hasMediaRecorder: true,
    isTypeSupported: (type: string) =>
      type === "audio/webm;codecs=opus" || type === "audio/webm",
    getUserMedia: async () =>
      ({ getTracks: () => [{ stop: () => {} }] }) as unknown as MediaStream,
    createRecorder: (stream, options) => {
      created = new FakeMediaRecorder(stream, options);
      return created as unknown as MediaRecorder;
    },
    now: () => clock.value,
    ...overrides,
  };

  return {
    environment,
    getRecorder: () => {
      if (!created) {
        throw new Error("Recorder was not created yet.");
      }
      return created;
    },
    clock,
  };
}

describe("MIME resolution (frozen audio contract)", () => {
  it("prefers webm then falls back to mp4", () => {
    expect(pickSupportedMimeType((t) => t === "audio/webm")).toBe("audio/webm");
    expect(pickSupportedMimeType((t) => t === "audio/mp4")).toBe("audio/mp4");
  });

  it("returns null and resolveMimeType throws when nothing is supported", () => {
    expect(pickSupportedMimeType(() => false)).toBeNull();
    expect(() => resolveMimeType(() => false)).toThrowError(/audio/);
    try {
      resolveMimeType(() => false);
    } catch (error) {
      expect(isRecordingError(error) && error.code).toBe("NO_SUPPORTED_MIME_TYPE");
    }
  });
});

describe("size helpers", () => {
  it("sums chunk bytes and enforces the 4 MB cap", () => {
    const chunks = [new Blob([new Uint8Array(10)]), new Blob([new Uint8Array(5)])];
    expect(totalChunkBytes(chunks)).toBe(15);
    expect(MAX_RECORDING_BYTES).toBe(4 * 1024 * 1024);
    expect(exceedsSizeLimit(MAX_RECORDING_BYTES + 1)).toBe(true);
    expect(exceedsSizeLimit(MAX_RECORDING_BYTES)).toBe(false);
    expect(remainingBytes(MAX_RECORDING_BYTES - 100)).toBe(100);
    expect(remainingBytes(MAX_RECORDING_BYTES + 100)).toBe(0);
  });
});

describe("classifyMediaError", () => {
  it("maps DOMException-style names to stable codes", () => {
    expect(classifyMediaError({ name: "NotAllowedError" }).code).toBe("PERMISSION_DENIED");
    expect(classifyMediaError({ name: "SecurityError" }).code).toBe("PERMISSION_DENIED");
    expect(classifyMediaError({ name: "NotFoundError" }).code).toBe("MIC_UNAVAILABLE");
    expect(classifyMediaError(new Error("boom")).code).toBe("RECORDING_FAILED");
  });
});

describe("createBrowserRecorder", () => {
  it("records, stops, and returns a blob with duration (TC-081 record/playback)", async () => {
    const { environment, getRecorder, clock } = createTestEnvironment();
    const recorder = createBrowserRecorder({ environment });

    clock.value = 1000;
    await recorder.start();
    expect(recorder.state).toBe("recording");
    expect(recorder.mimeType).toBe("audio/webm;codecs=opus");

    getRecorder().emit(2048);
    clock.value = 1500;

    const result = await recorder.stop();
    expect(recorder.state).toBe("stopped");
    expect(result.sizeBytes).toBe(2048);
    expect(result.mimeType).toBe("audio/webm;codecs=opus");
    expect(result.durationMs).toBe(500);
  });

  it("supports re-record via cancel then start again", async () => {
    const { environment, getRecorder } = createTestEnvironment();
    const recorder = createBrowserRecorder({ environment });

    await recorder.start();
    getRecorder().emit(1024);
    await recorder.stop();

    recorder.cancel();
    expect(recorder.state).toBe("idle");

    await recorder.start();
    expect(recorder.state).toBe("recording");
    getRecorder().emit(512);
    const result = await recorder.stop();
    expect(result.sizeBytes).toBe(512);
  });

  it("rejects with UNSUPPORTED_ENVIRONMENT when not a secure context", async () => {
    const { environment } = createTestEnvironment({ isSecureContext: false });
    const recorder = createBrowserRecorder({ environment });

    await expect(recorder.start()).rejects.toMatchObject({ code: "UNSUPPORTED_ENVIRONMENT" });
  });

  it("surfaces the permission-denied path (TC-081)", async () => {
    const denied = Object.assign(new Error("denied"), { name: "NotAllowedError" });
    const { environment } = createTestEnvironment({
      getUserMedia: async () => {
        throw denied;
      },
    });
    const recorder = createBrowserRecorder({ environment });

    await expect(recorder.start()).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    expect(recorder.state).toBe("error");
  });

  it("requests mono audio capture", async () => {
    const getUserMedia = vi.fn(async () => {
      return { getTracks: () => [{ stop: () => {} }] } as unknown as MediaStream;
    });
    const { environment } = createTestEnvironment({ getUserMedia });
    const recorder = createBrowserRecorder({ environment });

    await recorder.start();

    expect(getUserMedia).toHaveBeenCalledWith({ audio: { channelCount: 1 } });

    recorder.cancel();
  });

  it("auto-stops at the size cap and preserves the captured audio", async () => {
    const { environment, getRecorder } = createTestEnvironment();
    const recorder = createBrowserRecorder({ environment, maxBytes: 100 });

    await recorder.start();
    getRecorder().emit(60);
    getRecorder().emit(60); // auto-stop and keep the first 100 bytes

    expect(recorder.state).toBe("stopped");

    const result = await recorder.stop();
    expect(result.sizeBytes).toBe(100);
    expect(result.blob.size).toBe(100);
  });

  it("rejects start() from a non-idle state and stop() when idle", async () => {
    const { environment } = createTestEnvironment();
    const recorder = createBrowserRecorder({ environment });

    await recorder.start();
    await expect(recorder.start()).rejects.toMatchObject({ code: "INVALID_STATE" });

    recorder.cancel();
    await expect(recorder.stop()).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("reports a recorder error via stop()", async () => {
    const { environment, getRecorder } = createTestEnvironment();
    const recorder = createBrowserRecorder({ environment });

    await recorder.start();
    // Real ordering: the recorder fires onerror, then stops itself.
    getRecorder().fail(Object.assign(new Error("hw"), { name: "NotReadableError" }));
    getRecorder().stop();

    await expect(recorder.stop()).rejects.toMatchObject({ code: "MIC_UNAVAILABLE" });
    expect(recorder.state).toBe("error");
  });
});

describe("playback helpers (tap-to-play only)", () => {
  it("creates and revokes object URLs without autoplay", () => {
    const factory = {
      createObjectURL: vi.fn(() => "blob:fake"),
      revokeObjectURL: vi.fn(),
    };
    const blob = new Blob([new Uint8Array(4)]);

    const url = createPlaybackUrl(blob, factory);
    expect(url).toBe("blob:fake");
    expect(factory.createObjectURL).toHaveBeenCalledWith(blob);

    revokePlaybackUrl(url, factory);
    expect(factory.revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });

  it("throws stable recorder errors when object URL APIs are missing", () => {
    const blob = new Blob([new Uint8Array(4)]);
    const missingCreateFactory = {} as unknown as Parameters<typeof createPlaybackUrl>[1];
    const missingRevokeFactory = {
      createObjectURL: vi.fn(() => "blob:fake"),
    } as unknown as Parameters<typeof revokePlaybackUrl>[1];

    try {
      createPlaybackUrl(blob, missingCreateFactory);
      throw new Error("Expected createPlaybackUrl to throw.");
    } catch (error) {
      expect(isRecordingError(error) && error.code).toBe("UNSUPPORTED_ENVIRONMENT");
    }

    try {
      revokePlaybackUrl("blob:fake", missingRevokeFactory);
      throw new Error("Expected revokePlaybackUrl to throw.");
    } catch (error) {
      expect(isRecordingError(error) && error.code).toBe("UNSUPPORTED_ENVIRONMENT");
    }
  });
});
