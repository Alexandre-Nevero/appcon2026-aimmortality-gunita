// F-003 capture: tap-to-play helpers.
//
// The contract is tap-to-play only — never autoplay. These helpers only mint and
// revoke object URLs; the UI decides when to play in response to a user tap.

import { RecordingError } from "./errors";
import type { RecordingResult } from "./recorder";

type ObjectUrlFactory = Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;

function resolveUrlFactory(
  factory: ObjectUrlFactory | undefined,
  method: keyof ObjectUrlFactory,
): ObjectUrlFactory {
  const resolved = factory ?? (globalThis as { URL?: ObjectUrlFactory }).URL;
  if (!resolved?.[method]) {
    throw new RecordingError(
      "UNSUPPORTED_ENVIRONMENT",
      `URL.${method} is not available in this environment.`,
    );
  }
  return resolved;
}

/** Creates an object URL for a recorded blob for tap-to-play playback. */
export function createPlaybackUrl(
  source: RecordingResult | Blob,
  factory?: ObjectUrlFactory,
): string {
  const blob = source instanceof Blob ? source : source.blob;
  return resolveUrlFactory(factory, "createObjectURL").createObjectURL(blob);
}

/** Revokes a previously created playback URL to free memory. */
export function revokePlaybackUrl(url: string, factory?: ObjectUrlFactory): void {
  resolveUrlFactory(factory, "revokeObjectURL").revokeObjectURL(url);
}
