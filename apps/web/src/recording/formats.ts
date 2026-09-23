// F-003 capture: pure MIME-type resolution against the frozen audio contract.

import { DEFAULT_MIME_CANDIDATES } from "@/src/recording/constants";
import { RecordingError } from "@/src/recording/errors";

export type IsTypeSupported = (type: string) => boolean;

/**
 * Returns the first candidate MIME type reported as supported, or `null` when
 * none are. `candidates` defaults to the frozen webm -> mp4 ordering.
 */
export function pickSupportedMimeType(
  isTypeSupported: IsTypeSupported,
  candidates: readonly string[] = DEFAULT_MIME_CANDIDATES,
): string | null {
  for (const candidate of candidates) {
    if (isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return null;
}

/** Like {@link pickSupportedMimeType} but throws when nothing is supported. */
export function resolveMimeType(
  isTypeSupported: IsTypeSupported,
  candidates: readonly string[] = DEFAULT_MIME_CANDIDATES,
): string {
  const picked = pickSupportedMimeType(isTypeSupported, candidates);

  if (!picked) {
    throw new RecordingError(
      "NO_SUPPORTED_MIME_TYPE",
      "This browser does not support any of the required audio formats (audio/webm, audio/mp4).",
    );
  }

  return picked;
}
