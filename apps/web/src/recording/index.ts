// F-003 capture: public surface for the browser recording helper.

export {
  DEFAULT_MIME_CANDIDATES,
  DEFAULT_TIMESLICE_MS,
  MAX_RECORDING_BYTES,
} from "./constants";
export { RecordingError, isRecordingError, type RecordingErrorCode } from "./errors";
export {
  pickSupportedMimeType,
  resolveMimeType,
  type IsTypeSupported,
} from "./formats";
export { exceedsSizeLimit, remainingBytes, totalChunkBytes } from "./size";
export { classifyMediaError, isSecureRecordingContext } from "./environment";
export { createPlaybackUrl, revokePlaybackUrl } from "./playback";
export {
  createBrowserRecorder,
  type BrowserRecorder,
  type BrowserRecorderOptions,
  type RecorderEnvironment,
  type RecorderState,
  type RecordingResult,
} from "./recorder";
