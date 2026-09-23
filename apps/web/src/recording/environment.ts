// F-003 capture: environment guards and getUserMedia error classification.

import { RecordingError } from "./errors";

/**
 * Recording needs MediaRecorder and a secure context (HTTPS). Mic access is
 * blocked on plain HTTP, so surface that up-front rather than failing later.
 */
export function isSecureRecordingContext(input: {
  hasMediaRecorder: boolean;
  isSecureContext: boolean;
}): boolean {
  return input.hasMediaRecorder && input.isSecureContext;
}

/** Maps a getUserMedia / MediaRecorder failure to a stable RecordingError code. */
export function classifyMediaError(error: unknown): RecordingError {
  if (error instanceof RecordingError) {
    return error;
  }

  const name =
    error && typeof error === "object" && "name" in error
      ? String((error as { name: unknown }).name)
      : "";

  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return new RecordingError(
        "PERMISSION_DENIED",
        "Microphone permission was denied.",
        error,
      );
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "NotReadableError":
    case "OverconstrainedError":
      return new RecordingError(
        "MIC_UNAVAILABLE",
        "No usable microphone was found.",
        error,
      );
    default:
      return new RecordingError("RECORDING_FAILED", "Could not start recording.", error);
  }
}
