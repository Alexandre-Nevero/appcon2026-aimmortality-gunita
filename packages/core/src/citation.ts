import { isVerbatimSubstring } from "./text";

// Methods EQ-003 / PRD BR-023: a sentence is kept only if it cites at least one item, and every
// cited item is one of the retrieved candidates.
export function keepSentence(itemIds: string[], candidateIds: Iterable<string>): boolean {
  if (itemIds.length === 0) return false;
  const candidates = candidateIds instanceof Set ? candidateIds : new Set(candidateIds);
  return itemIds.every((id) => candidates.has(id));
}

// Methods EQ-003 / PRD BR-024: quotation marks are stripped from any quoted span that isn't a
// verbatim (normalized) substring of a cited source's text. Handles straight and curly quotes.
const QUOTE_PATTERN = /["“]([^"”]+)["”]/g;

export function stripUnverifiedQuotes(text: string, citedSourceTexts: string[]): string {
  return text.replace(QUOTE_PATTERN, (match, quoted: string) =>
    isVerbatimSubstring(quoted, citedSourceTexts) ? match : quoted,
  );
}
