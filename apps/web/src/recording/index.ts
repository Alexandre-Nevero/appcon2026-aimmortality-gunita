// F-003 capture: public surface for the browser recording helper.

export {
  DEFAULT_MIME_CANDIDATES,
  DEFAULT_TIMESLICE_MS,
  MAX_RECORDING_BYTES,
} from "@/src/recording/constants";
export { RecordingError, isRecordingError, type RecordingErrorCode } from "@/src/recording/errors";
export {
  pickSupportedMimeType,
  resolveMimeType,
  type IsTypeSupported,
} from "@/src/recording/formats";
export { exceedsSizeLimit, remainingBytes, totalChunkBytes } from "@/src/recording/size";
export { classifyMediaError, isSecureRecordingContext } from "@/src/recording/environment";
export { createPlaybackUrl, revokePlaybackUrl } from "@/src/recording/playback";
export {
  createBrowserRecorder,
  type BrowserRecorder,
  type BrowserRecorderOptions,
  type RecorderEnvironment,
  type RecorderState,
  type RecordingResult,
} from "@/src/recording/recorder";
