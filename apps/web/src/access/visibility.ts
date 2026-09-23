import {
  canViewerSeeVisibility,
  REVIEW_STATE_VALUES,
  VISIBILITY_VALUES,
  type MembershipRole,
  type ReviewState,
  type Visibility,
} from "@gunita/core";
import { inArray } from "drizzle-orm";

import { item } from "../db/schema";

// Derived from packages/core's canViewerSeeVisibility (the single source of truth for the rule,
// BR-030/BR-033) rather than re-encoding "family sees family+memorial" separately here — keeps the
// SQL filter and the pure rule from being able to silently drift apart.
export function allowedVisibilitiesFor(viewerRole: MembershipRole): Visibility[] {
  return VISIBILITY_VALUES.filter((visibility) => canViewerSeeVisibility(visibility, viewerRole));
}

// BR-033: visibility is checked in the query itself, not after — every items/search/Ask query
// should compose this into its WHERE clause rather than filtering results after fetching.
export function visibilityFilter(viewerRole: MembershipRole) {
  return inArray(item.visibility, allowedVisibilitiesFor(viewerRole));
}

// BR-022: only reviewed, non-rejected items appear in the family archive, search, Ask GUNITA, and
// the memorial. `ai_suggestion` (not yet reviewed) and `rejected` (hidden everywhere) are excluded.
export const ARCHIVE_REVIEW_STATES: ReviewState[] = REVIEW_STATE_VALUES.filter(
  (state) => state !== "ai_suggestion" && state !== "rejected",
);

export function archiveReviewStateFilter() {
  return inArray(item.reviewState, ARCHIVE_REVIEW_STATES);
}
