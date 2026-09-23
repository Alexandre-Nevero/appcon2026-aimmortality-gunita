// F-003 capture: pure size-cap helpers for the 4 MB limit.

import { MAX_RECORDING_BYTES } from "./constants";

export function totalChunkBytes(chunks: readonly Blob[]): number {
  return chunks.reduce((sum, chunk) => sum + chunk.size, 0);
}

export function exceedsSizeLimit(bytes: number, max: number = MAX_RECORDING_BYTES): boolean {
  return bytes > max;
}

export function remainingBytes(bytes: number, max: number = MAX_RECORDING_BYTES): number {
  return Math.max(0, max - bytes);
}
