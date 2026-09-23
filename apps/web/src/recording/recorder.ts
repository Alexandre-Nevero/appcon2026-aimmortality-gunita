// F-003 capture: dependency-injected MediaRecorder controller.
//
// Browser APIs (MediaRecorder, navigator.mediaDevices) are injected via
// `environment` so the flow — including the 4 MB size cap and the
// permission-denied path (TC-081) — is unit-testable under Node/vitest.

import { DEFAULT_TIMESLICE_MS, MAX_RECORDING_BYTES } from "./constants";
import { classifyMediaError, isSecureRecordingContext } from "./environment";
import { RecordingError } from "./errors";
import { resolveMimeType, type IsTypeSupported } from "./formats";
import { exceedsSizeLimit, totalChunkBytes } from "./size";

export type RecorderState =
  | "idle"
  | "requesting"
  | "recording"
  | "stopping"
  | "stopped"
  | "error";

export interface RecordingResult {
  blob: Blob;
  mimeType: string;
  sizeBytes: number;
  durationMs: number;
}

export interface RecorderEnvironment {
  isSecureContext: boolean;
  hasMediaRecorder: boolean;
  isTypeSupported: IsTypeSupported;
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  createRecorder: (stream: MediaStream, options: MediaRecorderOptions) => MediaRecorder;
  now: () => number;
}

export interface BrowserRecorderOptions {
  maxBytes?: number;
  timesliceMs?: number;
  environment?: Partial<RecorderEnvironment>;
}

export interface BrowserRecorder {
  readonly state: RecorderState;
  readonly mimeType: string | null;
  readonly sizeBytes: number;
  /** Requests the mic and begins recording. Rejects with a {@link RecordingError}. */
  start(): Promise<void>;
  /** Stops and resolves with the recorded blob. */
  stop(): Promise<RecordingResult>;
  /** Discards the in-progress recording and returns to `idle` for re-record. */
  cancel(): void;
}

const EXACT_MONO_CONSTRAINTS = { audio: { channelCount: { exact: 1 } } } as const;
const PREFERRED_MONO_CONSTRAINTS = { audio: { channelCount: 1 } } as const;

function isOverconstrainedError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "name" in error &&
    String((error as { name: unknown }).name) === "OverconstrainedError"
  );
}

function resolveEnvironment(overrides?: Partial<RecorderEnvironment>): RecorderEnvironment {
  const globalRef = globalThis as typeof globalThis & {
    MediaRecorder?: typeof MediaRecorder;
    isSecureContext?: boolean;
    navigator?: Navigator;
  };
  const mediaDevices = globalRef.navigator?.mediaDevices;
  const MediaRecorderCtor = globalRef.MediaRecorder;

  return {
    isSecureContext: overrides?.isSecureContext ?? Boolean(globalRef.isSecureContext),
    hasMediaRecorder: overrides?.hasMediaRecorder ?? typeof MediaRecorderCtor !== "undefined",
    isTypeSupported:
      overrides?.isTypeSupported ??
      ((type: string) =>
        typeof MediaRecorderCtor !== "undefined" &&
        typeof MediaRecorderCtor.isTypeSupported === "function" &&
        MediaRecorderCtor.isTypeSupported(type)),
    getUserMedia:
      overrides?.getUserMedia ??
      ((constraints: MediaStreamConstraints) => {
        if (!mediaDevices?.getUserMedia) {
          return Promise.reject(
            new RecordingError(
              "UNSUPPORTED_ENVIRONMENT",
              "getUserMedia is not available in this browser.",
            ),
          );
        }
        return mediaDevices.getUserMedia(constraints);
      }),
    createRecorder:
      overrides?.createRecorder ??
      ((stream: MediaStream, options: MediaRecorderOptions) => {
        if (typeof MediaRecorderCtor === "undefined") {
          throw new RecordingError(
            "UNSUPPORTED_ENVIRONMENT",
            "MediaRecorder is not available in this browser.",
          );
        }
        return new MediaRecorderCtor(stream, options);
      }),
    now: overrides?.now ?? (() => Date.now()),
  };
}

export function createBrowserRecorder(options: BrowserRecorderOptions = {}): BrowserRecorder {
  const maxBytes = options.maxBytes ?? MAX_RECORDING_BYTES;
  const timesliceMs = options.timesliceMs ?? DEFAULT_TIMESLICE_MS;
  const env = resolveEnvironment(options.environment);

  let state: RecorderState = "idle";
  let mimeType: string | null = null;
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let chunks: Blob[] = [];
  let sizeBytes = 0;
  let startedAt = 0;
  let capturedError: unknown = null;

  let settledResult: RecordingResult | null = null;
  let settledError: unknown = null;
  let resolveStop: ((result: RecordingResult) => void) | null = null;
  let rejectStop: ((error: unknown) => void) | null = null;

  function stopTracks(): void {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  function clearPending(): void {
    resolveStop = null;
    rejectStop = null;
  }

  function finalize(): void {
    stopTracks();

    if (capturedError) {
      const error = classifyMediaError(capturedError);
      state = "error";
      settledError = error;
      const reject = rejectStop;
      clearPending();
      reject?.(error);
      return;
    }

    const blob = new Blob(chunks, { type: mimeType ?? "" });
    const result: RecordingResult = {
      blob,
      mimeType: mimeType ?? "",
      sizeBytes: blob.size,
      durationMs: Math.max(0, env.now() - startedAt),
    };
    state = "stopped";
    settledResult = result;
    const resolve = resolveStop;
    clearPending();
    resolve?.(result);
  }

  function stopRecorder(): void {
    if (recorder && recorder.state !== "inactive") {
      state = "stopping";
      recorder.stop();
    }
  }

  function handleData(event: BlobEvent): void {
    const data = event.data;
    if (!data || data.size <= 0) {
      return;
    }

    const nextSize = sizeBytes + data.size;

    if (exceedsSizeLimit(nextSize, maxBytes)) {
      stopRecorder();
      return;
    }

    chunks.push(data);
    sizeBytes = totalChunkBytes(chunks);

    if (sizeBytes === maxBytes) {
      stopRecorder();
    }
  }

  async function start(): Promise<void> {
    if (state !== "idle") {
      throw new RecordingError("INVALID_STATE", `Cannot start recording from state "${state}".`);
    }

    if (!isSecureRecordingContext(env)) {
      throw new RecordingError(
        "UNSUPPORTED_ENVIRONMENT",
        "Recording requires a secure context (HTTPS) with MediaRecorder support.",
      );
    }

    mimeType = resolveMimeType(env.isTypeSupported);
    state = "requesting";

    try {
      try {
        stream = await env.getUserMedia(EXACT_MONO_CONSTRAINTS);
      } catch (error) {
        if (!isOverconstrainedError(error)) {
          throw error;
        }
        stream = await env.getUserMedia(PREFERRED_MONO_CONSTRAINTS);
      }
    } catch (error) {
      state = "error";
      throw classifyMediaError(error);
    }

    try {
      recorder = env.createRecorder(stream, { mimeType });
    } catch (error) {
      stopTracks();
      state = "error";
      throw error instanceof RecordingError
        ? error
        : new RecordingError("RECORDING_FAILED", "Could not create the media recorder.", error);
    }
    chunks = [];
    sizeBytes = 0;
    capturedError = null;
    settledResult = null;
    settledError = null;

    recorder.ondataavailable = handleData;
    recorder.onerror = (event: Event) => {
      capturedError =
        (event as unknown as { error?: unknown }).error ?? new Error("MediaRecorder error");
    };
    recorder.onstop = () => {
      finalize();
    };

    startedAt = env.now();
    recorder.start(timesliceMs);
    state = "recording";
  }

  function stop(): Promise<RecordingResult> {
    if (settledError) {
      return Promise.reject(settledError);
    }
    if (settledResult) {
      return Promise.resolve(settledResult);
    }
    if (state !== "recording" && state !== "stopping") {
      return Promise.reject(
        new RecordingError("INVALID_STATE", `Cannot stop recording from state "${state}".`),
      );
    }

    return new Promise<RecordingResult>((resolve, reject) => {
      resolveStop = resolve;
      rejectStop = reject;
      if (state === "recording") {
        stopRecorder();
      }
    });
  }

  function cancel(): void {
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          // ignore: cancelling a recorder that is already stopping
        }
      }
    }
    stopTracks();

    const reject = rejectStop;
    clearPending();
    reject?.(new RecordingError("CANCELLED", "Recording was cancelled."));

    recorder = null;
    chunks = [];
    sizeBytes = 0;
    capturedError = null;
    settledResult = null;
    settledError = null;
    state = "idle";
  }

  return {
    get state() {
      return state;
    },
    get mimeType() {
      return mimeType;
    },
    get sizeBytes() {
      return sizeBytes;
    },
    start,
    stop,
    cancel,
  };
}
