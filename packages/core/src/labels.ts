import type { Origin, ReviewState, Visibility } from "./enums";

// BR-014: this fixed product term stays Filipino in both UI modes.
export const HINDI_PA_ALAM = "Hindi pa alam";

export interface LocalizedLabel {
  fil: string;
  en: string;
}

// F-015: the same badge copy on every surface (archive, search, answers, recap, moderation).
// Keyed by the enum values themselves so Josh/Gian never rename them mid-build (§0.1 frozen
// contract: "Badge copy keys stay stable").
export const ORIGIN_LABELS: Record<Origin, LocalizedLabel> = {
  from_them: { fil: "Mula sa kanya", en: "From them" },
  about_them: { fil: "Tungkol sa kanya", en: "About them" },
};

export const REVIEW_STATE_LABELS: Record<ReviewState, LocalizedLabel> = {
  ai_suggestion: { fil: "Mungkahi ng AI", en: "AI suggestion" },
  verified: { fil: "Nakumpirma", en: "Verified" },
  corrected: { fil: "Naitama", en: "Corrected" },
  uncertain: { fil: "Hindi sigurado", en: "Uncertain" },
  disputed: { fil: "Pinagtatalunan", en: "Disputed" },
  rejected: { fil: "Tinanggihan", en: "Rejected" },
};

export const VISIBILITY_LABELS: Record<Visibility, LocalizedLabel> = {
  private: { fil: "Pribado", en: "Private" },
  family: { fil: "Pamilya", en: "Family" },
  memorial: { fil: "Memoryal", en: "Memorial" },
};

export const AI_WRITTEN_LABEL: LocalizedLabel = { fil: "Isinulat ng AI", en: "AI-written" };
