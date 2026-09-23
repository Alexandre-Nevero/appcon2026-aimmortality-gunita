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
