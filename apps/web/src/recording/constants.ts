// F-003 capture: shared limits and the frozen audio contract.

import { MAX_UPLOAD_BYTES } from "../media/validate";

/** BR/System Design: recordings reuse the shared 4 MB upload cap. */
export const MAX_RECORDING_BYTES = MAX_UPLOAD_BYTES;

/**
 * Frozen audio contract (implementation-plan §0.1): probe `audio/webm` then
 * `audio/mp4` via `MediaRecorder.isTypeSupported`. Codec-qualified variants are
 * tried first for quality, but the ordering always resolves the webm family
 * before the mp4 family so iOS Safari falls back to mp4 as specified.
 */
export const DEFAULT_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
] as const;

/** Timeslice for periodic `dataavailable` events so the size cap is enforced mid-recording. */
export const DEFAULT_TIMESLICE_MS = 1000;
