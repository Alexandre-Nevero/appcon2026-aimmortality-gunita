import { z } from "zod";

// Frozen contract (docs/implementation-plan.md §0.1): these enum value sets are shared by
// apps/web (API + DB) and the UI. Never rename a value; add new ones and migrate instead.

export const LOCALE_VALUES = ["fil", "en"] as const;
export const localeSchema = z.enum(LOCALE_VALUES);
export type Locale = z.infer<typeof localeSchema>;

export const VISIBILITY_VALUES = ["private", "family", "memorial"] as const;
export const visibilitySchema = z.enum(VISIBILITY_VALUES);
export type Visibility = z.infer<typeof visibilitySchema>;

export const REVIEW_STATE_VALUES = [
  "ai_suggestion",
  "verified",
  "corrected",
  "uncertain",
  "disputed",
  "rejected",
] as const;
export const reviewStateSchema = z.enum(REVIEW_STATE_VALUES);
export type ReviewState = z.infer<typeof reviewStateSchema>;

// The five review actions from PRD BR-020. "correct" carries edits; "dispute" requires a note.
export const REVIEW_ACTION_VALUES = [
  "confirm",
  "correct",
  "reject",
  "dispute",
  "uncertain",
] as const;
export const reviewActionSchema = z.enum(REVIEW_ACTION_VALUES);
export type ReviewAction = z.infer<typeof reviewActionSchema>;

export const ORIGIN_VALUES = ["from_them", "about_them"] as const;
export const originSchema = z.enum(ORIGIN_VALUES);
export type Origin = z.infer<typeof originSchema>;

export const ITEM_TYPE_VALUES = ["story", "recipe", "tradition", "lesson", "fact"] as const;
export const itemTypeSchema = z.enum(ITEM_TYPE_VALUES);
export type ItemType = z.infer<typeof itemTypeSchema>;

export const RECIPE_STEP_KIND_VALUES = ["measured", "judgement"] as const;
export const recipeStepKindSchema = z.enum(RECIPE_STEP_KIND_VALUES);
export type RecipeStepKind = z.infer<typeof recipeStepKindSchema>;

export const DATE_PRECISION_VALUES = ["exact", "approximate", "unknown"] as const;
export const datePrecisionSchema = z.enum(DATE_PRECISION_VALUES);
export type DatePrecision = z.infer<typeof datePrecisionSchema>;

// docs/user-flow.md §6 `ask_answered` event outcomes. A partially-supported answer (BR-036) still
// logs as "answered" — only the response payload (not persisted) distinguishes full vs. partial.
export const ASK_OUTCOME_VALUES = ["answered", "abstained", "refused", "error"] as const;
export const askOutcomeSchema = z.enum(ASK_OUTCOME_VALUES);
export type AskOutcome = z.infer<typeof askOutcomeSchema>;

export const MEMBERSHIP_ROLE_VALUES = ["steward", "family"] as const;
export const membershipRoleSchema = z.enum(MEMBERSHIP_ROLE_VALUES);
export type MembershipRole = z.infer<typeof membershipRoleSchema>;

export const LIFECYCLE_MODE_VALUES = ["during", "memorial"] as const;
export const lifecycleModeSchema = z.enum(LIFECYCLE_MODE_VALUES);
export type LifecycleMode = z.infer<typeof lifecycleModeSchema>;

export const SOURCE_TYPE_VALUES = ["audio", "text", "photo", "document"] as const;
export const sourceTypeSchema = z.enum(SOURCE_TYPE_VALUES);
export type SourceType = z.infer<typeof sourceTypeSchema>;

export const SOURCE_STATUS_VALUES = ["uploaded", "processing", "ready", "failed"] as const;
export const sourceStatusSchema = z.enum(SOURCE_STATUS_VALUES);
export type SourceStatus = z.infer<typeof sourceStatusSchema>;

export const CONTRIBUTION_STATUS_VALUES = ["pending", "approved", "rejected"] as const;
export const contributionStatusSchema = z.enum(CONTRIBUTION_STATUS_VALUES);
export type ContributionStatus = z.infer<typeof contributionStatusSchema>;

export const RECAP_STATUS_VALUES = ["draft", "published"] as const;
export const recapStatusSchema = z.enum(RECAP_STATUS_VALUES);
export type RecapStatus = z.infer<typeof recapStatusSchema>;

// Space/memorial-level audit trail (BR-051, BR-070, BR-071 minus per-item history, which lives on
// item_revision instead). Not the analytics `event` table (docs/user-flow.md §6).
export const ACTIVITY_TYPE_VALUES = [
  "consent_recorded",
  "consent_withdrawn",
  "invite_sent",
  "source_deleted",
  "item_deleted",
  "contribution_approved",
  "contribution_rejected",
  "memorial_activated",
  "memorial_reversed",
  "memorial_published",
  "memorial_link_disabled",
  "memorial_link_enabled",
] as const;
export const activityTypeSchema = z.enum(ACTIVITY_TYPE_VALUES);
export type ActivityType = z.infer<typeof activityTypeSchema>;

// Analytics events, docs/user-flow.md §6. Properties must never carry names, free text, or IPs.
export const EVENT_TYPE_VALUES = [
  "memorial_opened",
  "share_started",
  "share_submitted",
  "ask_answered",
  "question_added_from_abstain",
  "item_reviewed",
] as const;
export const eventTypeSchema = z.enum(EVENT_TYPE_VALUES);
export type EventType = z.infer<typeof eventTypeSchema>;

export const AI_CALL_PURPOSE_VALUES = [
  "transcribe",
  "vision",
  "extract",
  "hints",
  "ask",
  "caption",
  "embed",
] as const;
export const aiCallPurposeSchema = z.enum(AI_CALL_PURPOSE_VALUES);
export type AiCallPurpose = z.infer<typeof aiCallPurposeSchema>;

export const AI_CALL_PROVIDER_VALUES = ["groq", "gemini"] as const;
export const aiCallProviderSchema = z.enum(AI_CALL_PROVIDER_VALUES);
export type AiCallProvider = z.infer<typeof aiCallProviderSchema>;

export const AI_CALL_STATUS_VALUES = ["ok", "error"] as const;
export const aiCallStatusSchema = z.enum(AI_CALL_STATUS_VALUES);
export type AiCallStatus = z.infer<typeof aiCallStatusSchema>;

// F-005/F-014/BR-038: why a GUNITA Question exists.
export const QUESTION_ORIGIN_VALUES = ["artifact_gap", "hint", "ask_abstain"] as const;
export const questionOriginSchema = z.enum(QUESTION_ORIGIN_VALUES);
export type QuestionOrigin = z.infer<typeof questionOriginSchema>;

export const QUESTION_STATUS_VALUES = ["queued", "dismissed", "answered"] as const;
export const questionStatusSchema = z.enum(QUESTION_STATUS_VALUES);
export type QuestionStatus = z.infer<typeof questionStatusSchema>;

// BR-032 consent ceiling: only a Private item set BY the featured person can never be raised again.
export const VISIBILITY_SET_BY_VALUES = ["featured_person", "steward"] as const;
export const visibilitySetBySchema = z.enum(VISIBILITY_SET_BY_VALUES);
export type VisibilitySetBy = z.infer<typeof visibilitySetBySchema>;
