// Shared verbatim-substring primitive used by both the recipe-quantity check (Methods EQ-004)
// and the Ask GUNITA quote check (Methods EQ-003, BR-024).

export function normalizeForComparison(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

export function isVerbatimSubstring(candidate: string, sourceTexts: string[]): boolean {
  const needle = normalizeForComparison(candidate);
  if (!needle) return false;
  return sourceTexts.some((source) => normalizeForComparison(source).includes(needle));
}

// Matches a quoted span (straight or curly double quotes), capturing the text inside. Shared by
// citation.ts (which checks whether that text is verbatim, EQ-003/BR-024) and guardrail.ts (which
// blanks out quoted spans before checking for first-person language, F-022) — one definition so the
// two checks can't drift apart on what counts as "inside a quote".
export const QUOTE_SPAN_PATTERN = /["“]([^"”]+)["”]/g;
