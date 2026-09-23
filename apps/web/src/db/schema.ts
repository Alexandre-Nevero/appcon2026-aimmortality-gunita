import {
  ACTIVITY_TYPE_VALUES,
  AI_CALL_PROVIDER_VALUES,
  AI_CALL_PURPOSE_VALUES,
  AI_CALL_STATUS_VALUES,
  ASK_OUTCOME_VALUES,
  CONTRIBUTION_STATUS_VALUES,
  EVENT_TYPE_VALUES,
  ITEM_TYPE_VALUES,
  LIFECYCLE_MODE_VALUES,
  LOCALE_VALUES,
  MEMBERSHIP_ROLE_VALUES,
  ORIGIN_VALUES,
  QUESTION_ORIGIN_VALUES,
  QUESTION_STATUS_VALUES,
  RECAP_STATUS_VALUES,
  RECIPE_STEP_KIND_VALUES,
  REVIEW_ACTION_VALUES,
  REVIEW_STATE_VALUES,
  SOURCE_STATUS_VALUES,
  SOURCE_TYPE_VALUES,
  VISIBILITY_SET_BY_VALUES,
  VISIBILITY_VALUES,
} from "@gunita/core";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

// Enum value sets are the single source of truth in packages/core (docs/implementation-plan.md
// §0.1 frozen contract). Never edit a pgEnum's values here without updating packages/core first.
export const localeEnum = pgEnum("locale", LOCALE_VALUES);
export const visibilityEnum = pgEnum("visibility", VISIBILITY_VALUES);
export const visibilitySetByEnum = pgEnum("visibility_set_by", VISIBILITY_SET_BY_VALUES);
export const reviewStateEnum = pgEnum("review_state", REVIEW_STATE_VALUES);
export const reviewActionEnum = pgEnum("review_action", REVIEW_ACTION_VALUES);
export const originEnum = pgEnum("origin", ORIGIN_VALUES);
export const itemTypeEnum = pgEnum("item_type", ITEM_TYPE_VALUES);
export const recipeStepKindEnum = pgEnum("recipe_step_kind", RECIPE_STEP_KIND_VALUES);
export const askOutcomeEnum = pgEnum("ask_outcome", ASK_OUTCOME_VALUES);
export const membershipRoleEnum = pgEnum("membership_role", MEMBERSHIP_ROLE_VALUES);
export const lifecycleModeEnum = pgEnum("lifecycle_mode", LIFECYCLE_MODE_VALUES);
export const sourceTypeEnum = pgEnum("source_type", SOURCE_TYPE_VALUES);
export const sourceStatusEnum = pgEnum("source_status", SOURCE_STATUS_VALUES);
export const contributionStatusEnum = pgEnum("contribution_status", CONTRIBUTION_STATUS_VALUES);
export const recapStatusEnum = pgEnum("recap_status", RECAP_STATUS_VALUES);
export const activityTypeEnum = pgEnum("activity_type", ACTIVITY_TYPE_VALUES);
export const eventTypeEnum = pgEnum("event_type", EVENT_TYPE_VALUES);
export const aiCallPurposeEnum = pgEnum("ai_call_purpose", AI_CALL_PURPOSE_VALUES);
export const aiCallProviderEnum = pgEnum("ai_call_provider", AI_CALL_PROVIDER_VALUES);
export const aiCallStatusEnum = pgEnum("ai_call_status", AI_CALL_STATUS_VALUES);
export const questionOriginEnum = pgEnum("question_origin", QUESTION_ORIGIN_VALUES);
export const questionStatusEnum = pgEnum("question_status", QUESTION_STATUS_VALUES);

// Better Auth's core tables (TASK-006). The auth adapter expects these canonical table/field names.
export const authUser = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("user_email_unique").on(table.email)],
);

export const authSession = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("session_token_unique").on(table.token),
    index("session_user_id_idx").on(table.userId),
  ],
);

export const authAccount = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("account_provider_account_unique").on(table.providerId, table.accountId),
    index("account_user_id_idx").on(table.userId),
  ],
);

export const authVerification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// One family space per PRD F-001/BR-006. The featured person has no account (see `person.isFeatured`
// partial unique index below); memberships hold the steward and invited family members.
export const space = pgTable("space", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  locale: localeEnum("locale").notNull().default("fil"),
  lifecycleMode: lifecycleModeEnum("lifecycle_mode").notNull().default("during"),
  // BR-055: unguessable memorial link. Null until Memorial Mode is activated and a token is issued.
  memorialToken: text("memorial_token").unique(),
  memorialLinkDisabled: boolean("memorial_link_disabled").notNull().default(false),
  memorialActivatedAt: timestamp("memorial_activated_at", { withTimezone: true }),
  memorialReversedAt: timestamp("memorial_reversed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// `userId` points at Better Auth's canonical `user` table (`authUser` above).
export const membership = pgTable(
  "membership",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id),
    role: membershipRoleEnum("role").notNull(),
    localeOverride: localeEnum("locale_override"),
    invitedByMembershipId: uuid("invited_by_membership_id").references(
      (): AnyPgColumn => membership.id,
      { onDelete: "set null" },
    ),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("membership_space_user_unique").on(table.spaceId, table.userId),
    // BR-006: a family space has exactly one steward.
    uniqueIndex("membership_one_steward_per_space")
      .on(table.spaceId)
      .where(sql`${table.role} = 'steward'`),
  ],
);

// F-001, UJ-003: named people, including the one featured person per space (PRD Product vocabulary).
export const person = pgTable(
  "person",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    // Nicknames/aliases, e.g. "Lola Nena" (PRD Product vocabulary). Array of strings.
    aliases: jsonb("aliases").notNull().default([]),
    relationshipToFeatured: text("relationship_to_featured"),
    isFeatured: boolean("is_featured").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("person_one_featured_per_space")
      .on(table.spaceId)
      .where(sql`${table.isFeatured} = true`),
  ],
);

// F-003/F-007: an original upload, always kept. AI never identifies a person from a photo (BR-011).
export const source = pgTable("source", {
  id: uuid("id").primaryKey().defaultRandom(),
  spaceId: uuid("space_id")
    .notNull()
    .references(() => space.id, { onDelete: "cascade" }),
  type: sourceTypeEnum("type").notNull(),
  status: sourceStatusEnum("status").notNull().default("uploaded"),
  // Processing failure step + reason, e.g. "failed(transcribe)" (System Design data flow).
  statusReason: text("status_reason"),
  origin: originEnum("origin").notNull(),
  // [interpretation] Sources carry their own visibility (default private) so consent evidence
  // (BR-003) and unlinked uploads never leak before an item is reviewed; BR-033 still gates access.
  visibility: visibilityEnum("visibility").notNull().default("private"),
  // Set only for About-them sources contributed by a named family member (not the featured person).
  contributorPersonId: uuid("contributor_person_id").references(() => person.id, {
    onDelete: "set null",
  }),
  uploadedByMembershipId: uuid("uploaded_by_membership_id")
    .notNull()
    .references(() => membership.id, { onDelete: "restrict" }),
  // Despite the name, this stores the full Blob URL (what fetch() and @vercel/blob's del() both
  // need), not the store-relative pathname — kept as-is to avoid a migration for a naming fix;
  // see apps/web/src/media/blob.ts.
  blobPathname: text("blob_pathname").notNull(),
  mimeType: text("mime_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  durationSeconds: numeric("duration_seconds"),
  // Steward-supplied known context at upload time (names/rough date/place), F-005.
  artifactContext: jsonb("artifact_context"),
  // Vision output {visible[], missing[], questions[]} before questions become `question` rows.
  aiVisibleDescription: jsonb("ai_visible_description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Transcription segments (audio), paragraphs (text), or AI-read text spans (document). Photos have
// no segments — their vision output lives on `source.aiVisibleDescription` instead.
export const sourceSegment = pgTable(
  "source_segment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => source.id, { onDelete: "cascade" }),
    index: integer("index").notNull(),
    text: text("text").notNull(),
    startSeconds: numeric("start_seconds"),
    endSeconds: numeric("end_seconds"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("source_segment_source_index_unique").on(table.sourceId, table.index)],
);

// One per space (BR-006). Evidence is the recorded/written Private source (BR-003).
export const consent = pgTable("consent", {
  id: uuid("id").primaryKey().defaultRandom(),
  spaceId: uuid("space_id")
    .notNull()
    .unique()
    .references(() => space.id, { onDelete: "cascade" }),
  participationConsented: boolean("participation_consented").notNull().default(false),
  aiProcessingConsented: boolean("ai_processing_consented").notNull().default(false),
  memorialUseAllowed: boolean("memorial_use_allowed").notNull().default(false),
  voiceClipsAllowed: boolean("voice_clips_allowed").notNull().default(false),
  // [interpretation] RESTRICT, not SET NULL: BR-003 relies on this source as the evidentiary
  // record of consent. BR-004 lets the steward delete material on request, but silently detaching
  // the consent evidence link on delete would erase that proof without anyone noticing. Deleting
  // this specific source must fail loudly instead — worth an ADR if the team wants different
  // behavior (e.g. requiring the steward to re-record consent first).
  evidenceSourceId: uuid("evidence_source_id").references(() => source.id, {
    onDelete: "restrict",
  }),
  recordedAt: timestamp("recorded_at", { withTimezone: true }),
  recordedByMembershipId: uuid("recorded_by_membership_id").references(() => membership.id, {
    onDelete: "set null",
  }),
  // BR-004: while alive, the featured person can withdraw consent.
  withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  withdrawnReason: text("withdrawn_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A reviewable memory item extracted from a source (PRD Product vocabulary: Story, Recipe,
// Tradition, Lesson, Fact). Mirrors the extraction JSON shape in System Design's data flow.
export const item = pgTable(
  "item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => source.id, { onDelete: "cascade" }),
    type: itemTypeEnum("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    // BR-015: origin can diverge from the source's origin (e.g. featured person confirms another's
    // claim; it keeps About-them origin).
    origin: originEnum("origin").notNull(),
    // Cited `source_segment.id`s (uuid strings). Referential integrity is checked at the app layer
    // during extraction validation (System Design EQ-004–EQ-006), not by a DB foreign key.
    segmentIds: jsonb("segment_ids").notNull().default([]),
    // Raw names from extraction, pending human confirmation into `item_person` (BR-011: AI never
    // assigns identity; only a human answer creates the link).
    rawPeople: jsonb("raw_people").notNull().default([]),
    places: jsonb("places").notNull().default([]),
    // Array of {text, precision: exact|approximate|unknown}, shown verbatim (Methods EQ-005).
    dates: jsonb("dates").notNull().default([]),
    reviewState: reviewStateEnum("review_state").notNull().default("ai_suggestion"),
    // Null until first reviewed; BR-030 default is "family" once set.
    visibility: visibilityEnum("visibility"),
    // BR-032 consent ceiling: a Private item the featured person set can never be raised again.
    visibilitySetBy: visibilitySetByEnum("visibility_set_by"),
    // Required by BR-020 when reviewState = 'disputed'; enforced in packages/core (TASK-003).
    disputeNote: text("dispute_note"),
    reviewedByMembershipId: uuid("reviewed_by_membership_id").references(() => membership.id, {
      onDelete: "set null",
    }),
    // BR-021: "Verified by [person]" (true) vs. "Verified by steward" (false) render differently.
    reviewedWithFeaturedPerson: boolean("reviewed_with_featured_person").notNull().default(false),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    // Set only when reviewState is reviewed and non-rejected (System Design: "Only reviewed,
    // non-rejected items have embeddings"). 768 dims = Gemini `gemini-embedding-001` (ADR-002).
    embedding: vector("embedding", { dimensions: 768 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Retrieval/archive filter shape: space + review state + visibility (BR-022, BR-033).
    index("item_space_review_visibility_idx").on(
      table.spaceId,
      table.reviewState,
      table.visibility,
    ),
    index("item_source_idx").on(table.sourceId),
    // Ask GUNITA candidate search (Methods EQ-001), cosine distance.
    index("item_embedding_hnsw_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
  ],
);

// BR-071: corrections keep the previous value in history, visible to the steward.
export const itemRevision = pgTable("item_revision", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => item.id, { onDelete: "cascade" }),
  action: reviewActionEnum("action").notNull(),
  note: text("note"),
  // Snapshot of the item's reviewable fields immediately before this action.
  previousValue: jsonb("previous_value").notNull(),
  changedByMembershipId: uuid("changed_by_membership_id")
    .notNull()
    .references(() => membership.id, { onDelete: "restrict" }),
  changedWithFeaturedPerson: boolean("changed_with_featured_person").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// BR-013: a By-judgement step never gets an invented quantity and always links to the person's
// audio for that step.
export const recipeStep = pgTable(
  "recipe_step",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => item.id, { onDelete: "cascade" }),
    index: integer("index").notNull(),
    kind: recipeStepKindEnum("kind").notNull(),
    text: text("text").notNull(),
    // Measured steps only; must appear verbatim in a cited segment (Methods EQ-004).
    quantityVerbatim: text("quantity_verbatim"),
    segmentIds: jsonb("segment_ids").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("recipe_step_item_index_unique").on(table.itemId, table.index)],
);

// Confirmed item↔person links, created by a human review action (BR-011). Distinct from
// `item.rawPeople`, which holds unconfirmed AI-extracted name strings.
export const itemPerson = pgTable(
  "item_person",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => item.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    role: text("role"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("item_person_unique").on(table.itemId, table.personId)],
);

// GUNITA Question (Hint): a suggested question or missing connection, never a claim (F-014).
export const question = pgTable("question", {
  id: uuid("id").primaryKey().defaultRandom(),
  spaceId: uuid("space_id")
    .notNull()
    .references(() => space.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  locale: localeEnum("locale").notNull(),
  // Why this question was suggested, shown alongside it (F-014 acceptance criteria).
  reason: text("reason").notNull(),
  originKind: questionOriginEnum("origin_kind").notNull(),
  triggeredBySourceId: uuid("triggered_by_source_id").references(() => source.id, {
    onDelete: "set null",
  }),
  triggeredByItemId: uuid("triggered_by_item_id").references(() => item.id, {
    onDelete: "set null",
  }),
  status: questionStatusEnum("status").notNull().default("queued"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

// The published memorial snapshot (System Design: "recap snapshot JSON ... stored"). One row per
// space; `snapshot` holds the WIP card selection pre-publish and the immutable cards post-publish.
export const recap = pgTable("recap", {
  id: uuid("id").primaryKey().defaultRandom(),
  spaceId: uuid("space_id")
    .notNull()
    .unique()
    .references(() => space.id, { onDelete: "cascade" }),
  status: recapStatusEnum("status").notNull().default("draft"),
  // Array of cards: {type, itemId?, sourceId?, blobUrl?, caption, order}. BR-070: cards referencing
  // a deleted source/item are removed from this array by the deleting handler.
  snapshot: jsonb("snapshot").notNull().default([]),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  publishedByMembershipId: uuid("published_by_membership_id").references(() => membership.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// F-019/F-020: a memory submitted from the memorial, always About-them, pending until approved.
export const contribution = pgTable(
  "contribution",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    relationship: text("relationship").notNull(),
    textContent: text("text_content"),
    photoBlobPathname: text("photo_blob_pathname"),
    audioBlobPathname: text("audio_blob_pathname"),
    status: contributionStatusEnum("status").notNull().default("pending"),
    // SHA-256(ip || daily_salt) — Methods EQ-010. Never the raw IP.
    submittedIpHash: text("submitted_ip_hash").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedByMembershipId: uuid("reviewed_by_membership_id").references(() => membership.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (table) => [
    // BR-060: at least one of text, photo, or audio.
    check(
      "contribution_has_content",
      sql`${table.textContent} is not null or ${table.photoBlobPathname} is not null or ${table.audioBlobPathname} is not null`,
    ),
    // Methods EQ-010 rate-limit lookup: count recent submissions per memorial per hashed IP.
    index("contribution_rate_limit_idx").on(
      table.spaceId,
      table.submittedIpHash,
      table.submittedAt,
    ),
  ],
);

// F-023/BR-081 (ADR-007): one soft tribute per approved visitor photo per device. `visitorKeyHash`
// is HMAC-SHA-256(IP_HASH_SECRET, gunita_visitor cookie) — never the raw cookie, an IP, or a name.
export const tribute = pgTable(
  "tribute",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contributionId: uuid("contribution_id")
      .notNull()
      .references(() => contribution.id, { onDelete: "cascade" }),
    visitorKeyHash: text("visitor_key_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // A repeat heart is a no-op (one per phone). The total is not shown (ADR-008).
    uniqueIndex("tribute_contribution_visitor_unique").on(table.contributionId, table.visitorKeyHash),
  ],
);

// Space/memorial-level audit trail (BR-051, BR-070 non-item deletions, BR-021 invites/consent).
// Per-item review history lives on `item_revision` instead.
export const activity = pgTable("activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  spaceId: uuid("space_id")
    .notNull()
    .references(() => space.id, { onDelete: "cascade" }),
  // Null actor = system-triggered (should be rare; most actions require a signed-in steward).
  membershipId: uuid("membership_id").references(() => membership.id, { onDelete: "set null" }),
  type: activityTypeEnum("type").notNull(),
  targetType: text("target_type"),
  // No FK: the target row (e.g. a deleted source) may no longer exist by the time this is read.
  targetId: uuid("target_id"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Analytics events, docs/user-flow.md §6. `properties` must never carry names, free text, or IPs.
export const event = pgTable("event", {
  id: uuid("id").primaryKey().defaultRandom(),
  spaceId: uuid("space_id")
    .notNull()
    .references(() => space.id, { onDelete: "cascade" }),
  // Null for anonymous memorial-visitor events (memorial_opened, share_started, share_submitted).
  membershipId: uuid("membership_id").references(() => membership.id, { onDelete: "set null" }),
  type: eventTypeEnum("type").notNull(),
  visitId: text("visit_id"),
  // Only set when type = 'ask_answered'.
  outcome: askOutcomeEnum("outcome"),
  properties: jsonb("properties").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Every AI call (System Design: "purpose, model, latency, token counts, ok/error. No prompt
// content is logged there.").
export const aiCall = pgTable("ai_call", {
  id: uuid("id").primaryKey().defaultRandom(),
  spaceId: uuid("space_id")
    .notNull()
    .references(() => space.id, { onDelete: "cascade" }),
  sourceId: uuid("source_id").references(() => source.id, { onDelete: "set null" }),
  itemId: uuid("item_id").references(() => item.id, { onDelete: "set null" }),
  purpose: aiCallPurposeEnum("purpose").notNull(),
  provider: aiCallProviderEnum("provider").notNull(),
  model: text("model").notNull(),
  status: aiCallStatusEnum("status").notNull(),
  latencyMs: integer("latency_ms").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  // Error class/message only — never prompt or transcript content.
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
