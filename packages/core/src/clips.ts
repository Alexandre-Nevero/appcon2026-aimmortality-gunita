export interface ClipSegment {
  startSeconds: number;
  endSeconds: number;
}

export interface ClipSpan {
  start: number;
  end: number;
}

// Methods EQ-006: audio clip span padded 0.3s around the cited segments, clamped to [0, duration].
export function computeClipSpan(
  segments: ClipSegment[],
  opts: { paddingSeconds?: number; durationSeconds?: number } = {},
): ClipSpan {
  if (segments.length === 0) {
    throw new Error("computeClipSpan requires at least one segment");
  }
  const padding = opts.paddingSeconds ?? 0.3;
  const rawStart = Math.min(...segments.map((s) => s.startSeconds)) - padding;
  const rawEnd = Math.max(...segments.map((s) => s.endSeconds)) + padding;
  const start = Math.max(0, rawStart);
  const end = opts.durationSeconds != null ? Math.min(opts.durationSeconds, rawEnd) : rawEnd;
  return { start, end };
}
