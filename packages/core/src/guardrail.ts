import { QUOTE_SPAN_PATTERN } from "./text";

// PRD BR-037 / F-022: refuse role-play, speak-as, voice-mimicry, and opinion-speculation requests
// before any LLM call (System Design Ask step 1: "pattern list + model flag" — this covers the
// deterministic pattern list; the model-flag half lives in the answer module, TASK-013).
// Deliberately name-agnostic: works for any featured person, not just "Lola".
const ROLEPLAY_PATTERNS: RegExp[] = [
  /\bpretend (to be|you('|’)re)\b/i,
  /\bact as\b/i,
  /\bspeak as\b/i,
  /\btalk as\b/i,
  /\bas if you('|’)re\b/i,
  /\bmagpanggap\b/i, // Filipino: pretend / impersonate
  /\bgumanap ka bilang\b/i, // Filipino: perform / act as
  /\bin (her|his|their) (own )?voice\b/i,
  /\bsa boses (niya|nila)\b/i, // Filipino: "in her/their voice"
  // Bounded to at most 3 words between "would" and the verb, so this doesn't fire across an
  // unrelated clause (e.g. "what would happen if we all think about it differently").
  /\bwhat would\s+(?:\S+\s+){0,3}(?:think|say|feel)\b/i,
  /\bano kaya (ang )?sasabihin ni\b/i, // Filipino: "what would [name] say"
];

export function matchesRoleplayRequest(question: string): boolean {
  return ROLEPLAY_PATTERNS.some((pattern) => pattern.test(question));
}

// F-022 / BR-037 (System Design Ask step 6): first-person-as-the-person is only allowed inside a
// verbatim quote (their actual recorded words, BR-024). Strip quoted spans first, then check what
// remains for first-person markers, English and Filipino.
const FIRST_PERSON_PATTERNS: RegExp[] = [
  // Bare "I"/"i", or "I" + a REQUIRED apostrophe + contraction suffix — without requiring the
  // apostrophe, this also matched plain words like "ill" ("i"+"ll") and "id" ("i"+"d").
  /\bi\b|\bi('|’)(m|ve|ll|d)\b/i,
  /\bmy\b/i,
  /\bmine\b/i,
  /\bmyself\b/i,
  /\bako\b/i, // Filipino: I
  /\bko\b/i, // Filipino: my / me (verb marker)
  /\bakin\b/i, // Filipino: mine
];

export function containsFirstPersonAsSubject(answerText: string): boolean {
  const withoutQuotes = answerText.replace(QUOTE_SPAN_PATTERN, " ");
  return FIRST_PERSON_PATTERNS.some((pattern) => pattern.test(withoutQuotes));
}
