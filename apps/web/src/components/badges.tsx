import type { Locale, Origin, ReviewState, Visibility } from "@gunita/core";

import { t } from "@/src/i18n/t";
import styles from "@/app/(app)/archive/archive.module.css";

const ORIGIN_VARS: Record<Origin, [string, string]> = {
  from_them: ["--color-badge-from-them-bg", "--color-badge-from-them-fg"],
  about_them: ["--color-badge-about-them-bg", "--color-badge-about-them-fg"],
};

const REVIEW_VARS: Record<ReviewState, [string, string]> = {
  ai_suggestion: ["--color-badge-ai-bg", "--color-badge-ai-fg"],
  verified: ["--color-badge-verified-bg", "--color-badge-verified-fg"],
  corrected: ["--color-badge-corrected-bg", "--color-badge-corrected-fg"],
  uncertain: ["--color-badge-uncertain-bg", "--color-badge-uncertain-fg"],
  disputed: ["--color-badge-disputed-bg", "--color-badge-disputed-fg"],
  rejected: ["--color-badge-rejected-bg", "--color-badge-rejected-fg"],
};

const VISIBILITY_VARS: Record<Visibility, [string, string]> = {
  private: ["--color-vis-private-bg", "--color-vis-private-fg"],
  family: ["--color-vis-family-bg", "--color-vis-family-fg"],
  memorial: ["--color-vis-memorial-bg", "--color-vis-memorial-fg"],
};

function chip(label: string, vars: [string, string], key: string) {
  return (
    <span
      key={key}
      className={styles.badge}
      style={{ background: `var(${vars[0]})`, color: `var(${vars[1]})` }}
    >
      {label}
    </span>
  );
}

// F-015 provenance badges — same three chips (origin, review state, visibility) on every surface
// (archive, item detail, Ask evidence). Colors come straight from design-tokens.css; never invent
// a new fill here (each semantic must stay visually distinct, per TASK-004's own rule).
export function ProvenanceBadges({
  origin,
  reviewState,
  visibility,
  locale,
}: {
  origin: Origin;
  reviewState: ReviewState;
  visibility?: Visibility | null;
  locale: Locale;
}) {
  return (
    <div className={styles.badges}>
      {chip(t(`badges.origin.${origin}`, locale), ORIGIN_VARS[origin], "origin")}
      {chip(t(`badges.reviewState.${reviewState}`, locale), REVIEW_VARS[reviewState], "review")}
      {visibility ? chip(t(`badges.visibility.${visibility}`, locale), VISIBILITY_VARS[visibility], "vis") : null}
    </div>
  );
}
