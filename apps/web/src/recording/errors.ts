// F-003 capture: typed recorder errors so callers can branch on a stable code
// (e.g. show the permission-denied path required by TC-081).

export type RecordingErrorCode =
  | "UNSUPPORTED_ENVIRONMENT"
  | "NO_SUPPORTED_MIME_TYPE"
  | "PERMISSION_DENIED"
  | "MIC_UNAVAILABLE"
  | "SIZE_LIMIT_EXCEEDED"
  | "CANCELLED"
  | "INVALID_STATE"
  | "RECORDING_FAILED";

export class RecordingError extends Error {
  readonly code: RecordingErrorCode;
  readonly cause?: unknown;

  constructor(code: RecordingErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "RecordingError";
    this.code = code;
    this.cause = cause;
  }
}

export function isRecordingError(error: unknown): error is RecordingError {
  return error instanceof RecordingError;
}
