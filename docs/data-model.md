# Data Model — GUNITA

> **Status:** Draft v0.1 · **Date:** 2026-09-23 · **Owner:** Shi (TASK-002)
> **Traces back to:** [PRD](prd.md), [System Design](system-design.md) §Product entities,
> [Methods](methods.md), [User Flow](user-flow.md) §6, [ADR-002](adr/ADR-002-free-tier-stack.md).
> **Implementation:** `apps/web/src/db/schema.ts` (Drizzle ORM, Postgres/Neon + pgvector). Enum
> value sets are owned by `packages/core/src/enums.ts` (docs/implementation-plan.md §0.1 frozen
> contract) and imported into the schema — never redefine a value set in both places.
> **Not yet run against a live database.** `pnpm --filter web db:generate` produced
> `apps/web/drizzle/0000_slimy_smasher.sql` and it was hand-reviewed (see §7), but
> `pnpm --filter web db:migrate` needs a real Neon `DATABASE_URL_UNPOOLED` (TASK-022) to execute.

## 0. How to read this doc

Column detail lives here; product meaning lives in [PRD](prd.md) Product vocabulary; architecture
and data flow live in [System Design](system-design.md). Every non-obvious column cites the
`F-###`/`BR-###`/`EQ-###` it exists for. `[interpretation]` marks a choice the PRD left open.

## 1. Conventions

- Every table has a `uuid` primary key, `defaultRandom()` (Postgres `gen_random_uuid()`, `pgcrypto`).
- Timestamps are `timestamptz`, defaulting to `now()` where the row records its own creation.
- **No DB foreign key is added where the referenced table doesn't exist yet in this task's scope**
  (`membership.userId` → Better Auth's `user` table, TASK-006). App code owns that integrity until
  the auth module lands; see §4.
- JSONB is used where System Design's own extraction/output schema is already an array of
  structured values (`segmentIds`, `dates`, `places`, recipe `segmentIds`) — mirroring that shape
  exactly rather than normalizing into join tables the pipeline never queries relationally.
  Referential integrity for these (e.g. a `segmentId` actually exists) is checked at the app layer
  during extraction validation, per System Design's own documented pipeline (EQ-004–EQ-006), not by
  a DB constraint.
- Enums are Postgres `ENUM` types generated 1:1 from `packages/core` value arrays. Add a new value
  by editing `packages/core/src/enums.ts` first, then regenerating a migration — never rename or
  remove a live value.

## 2. Entity-relationship overview

```
space 1───1 consent
space 1───* membership (1 steward max, enforced by partial unique index)
space 1───* person (≤1 isFeatured, enforced by partial unique index)
space 1───* source ───* source_segment
space 1───* item ──── source (many items per source)
item 1───* item_revision
item 1───* recipe_step
item *───* person   (via item_person)
space 1───* question
space 1───1 recap
space 1───* contribution
contribution 1───* tribute
space 1───* activity
space 1───* event
space 1───* ai_call
```

## 3. Enums (`packages/core/src/enums.ts` ⇄ Postgres `ENUM`)

| Enum | Values | Used by |
|---|---|---|
| `locale` | `fil`, `en` | `space.locale`, `membership.localeOverride`, `question.locale` (BR-014, ADR-005) |
| `membership_role` | `steward`, `family` | `membership.role` (BR-006) |
| `lifecycle_mode` | `during`, `memorial` | `space.lifecycleMode` (F-016) |
| `source_type` | `audio`, `text`, `photo`, `document` | `source.type` (F-003) |
| `source_status` | `uploaded`, `processing`, `ready`, `failed` | `source.status` (System Design data flow) |
| `origin` | `from_them`, `about_them` | `source.origin`, `item.origin` (BR-015) |
| `visibility` | `private`, `family`, `memorial` | `source.visibility`, `item.visibility` (F-009, BR-030–BR-033) |
| `visibility_set_by` | `featured_person`, `steward` | `item.visibilitySetBy` (BR-032 consent ceiling) |
| `review_state` | `ai_suggestion`, `verified`, `corrected`, `uncertain`, `disputed`, `rejected` | `item.reviewState` (BR-020) |
| `review_action` | `confirm`, `correct`, `reject`, `dispute`, `uncertain` | `item_revision.action` (BR-020) |
| `item_type` | `story`, `recipe`, `tradition`, `lesson`, `fact` | `item.type` (F-006) |
| `recipe_step_kind` | `measured`, `judgement` | `recipe_step.kind` (BR-013) |
| `ask_outcome` | `answered`, `abstained`, `refused`, `error` | `event.outcome` (docs/user-flow.md §6 `ask_answered`) |
| `question_origin` | `artifact_gap`, `hint`, `ask_abstain` | `question.originKind` (F-005, F-014, BR-038) |
| `question_status` | `queued`, `dismissed`, `answered` | `question.status` (F-014) |
| `recap_status` | `draft`, `published` | `recap.status` (F-016, F-017) |
| `contribution_status` | `pending`, `approved`, `rejected` | `contribution.status` (F-020) |
| `activity_type` | see `packages/core/src/enums.ts` | `activity.type` (BR-051, BR-070, BR-071) |
| `event_type` | `memorial_opened`, `share_started`, `share_submitted`, `ask_answered`, `question_added_from_abstain`, `item_reviewed` | `event.type` (docs/user-flow.md §6, exact list) |
| `ai_call_purpose` | `transcribe`, `vision`, `extract`, `hints`, `ask`, `caption`, `embed` | `ai_call.purpose` (docs/ops.md observability) |
| `ai_call_provider` | `groq`, `gemini` | `ai_call.provider` |
| `ai_call_status` | `ok`, `error` | `ai_call.status` |

`date_precision` (`exact`/`approximate`/`unknown`, Methods EQ-005) has a Zod schema in
`packages/core` but **no Postgres enum**: it only appears inside `item.dates` JSONB entries, which
the app validates with the Zod schema, not a DB constraint.

## 4. Tables

### `space`
One family space per PRD F-001/BR-006. `memorialToken` (BR-055, unguessable) and
`memorialLinkDisabled` (BR-055) gate `/m/[token]`. `memorialActivatedAt`/`memorialReversedAt` are
denormalized for quick lifecycle checks; the authoritative "who and when" record for activation and
any reversal is an `activity` row (BR-051), not a column here.

### `membership`
One row per (space, user). `userId` is a **plain `text` column with no DB foreign key** — it points
at Better Auth's `user` table, which TASK-006 (Kirby) creates via its own migration. Until then, app
code is the only thing enforcing that a `userId` is real; `seed/load.ts` uses placeholder ids like
`"seed-steward-placeholder"`. `membership_one_steward_per_space` is a **partial unique index**
(`WHERE role = 'steward'`) enforcing BR-006 at the DB level, not just in application code.
`invitedByMembershipId` self-references `membership.id`.

### `person`
Named people in the archive, including the one featured person (PRD Product vocabulary). Exactly
one `isFeatured = true` row per space is enforced by the partial unique index
`person_one_featured_per_space`. `aliases` is a JSON array of nickname strings (e.g. `["Lola
Nena"]`).

### `consent`
One row per space (`spaceId` is `unique`). The four boolean columns are BR-002's four consent
scopes. `evidenceSourceId` points at the Private `source` row holding the recorded/written evidence
(BR-003). `withdrawnAt`/`withdrawnReason` implement BR-004; withdrawal does not create a new row.

`evidenceSourceId` is `ON DELETE RESTRICT`, not `SET NULL`, **`[interpretation]`**: BR-004 lets the
steward delete material on request, but BR-003 relies on this exact source as consent's evidentiary
record. Silently detaching the link on delete would erase that proof without anyone noticing;
RESTRICT means deleting a source that's still serving as consent evidence fails loudly instead. This
is a judgment call favoring the legal/evidentiary reading of BR-003 over unconditional deletion —
worth an ADR if the team wants different behavior (e.g. requiring the steward to explicitly
re-record consent before its old evidence can be deleted).

### `source`
An original upload (F-003/F-007), always kept. `status`/`statusReason` mirror System Design's
`uploaded → processing → ready | failed(step, reason)` state machine. `artifactContext` is the
steward's known-context input at upload time (F-005); `aiVisibleDescription` is the vision model's
`{visible[], missing[], questions[]}` output before any `question` rows are created from it (BR-011:
AI never assigns identity, only describes and asks).

`visibility` on `source` (default `private`) is **`[interpretation]`**: the PRD only states item
visibility explicitly (F-009), but BR-003 requires consent evidence to be "a Private source," and
F-010's archive lists a "Photos & documents" category that plausibly surfaces sources directly. This
column lets the access module gate sources the same way it gates items (BR-033) without waiting for
every source to have a derived item. Revisit with an ADR if a source should instead always inherit
its items' visibility.

### `source_segment`
Transcription segments (audio, with `startSeconds`/`endSeconds`), paragraphs (text), or AI-read
spans (document). **Photos have no segments** — their output lives on `source.aiVisibleDescription`
instead. `(sourceId, index)` is unique.

### `item`
A reviewable memory item (Story/Recipe/Tradition/Lesson/Fact). Columns mirror System Design's
extraction JSON shape directly:

| Column | Source of shape |
|---|---|
| `segmentIds` (jsonb array of `source_segment.id`) | extraction `segmentIds[]`; cited spans for the item body (F-007) |
| `rawPeople` (jsonb array of strings) | extraction `people[]` — **unconfirmed** names; only `item_person` (below) is a confirmed link, created by a human review action (BR-011) |
| `places` (jsonb array of strings) | extraction `places[]` |
| `dates` (jsonb array of `{text, precision}`) | extraction `dates[]`; shown verbatim with a precision label, never computed (Methods EQ-005) |

`origin` can diverge from its source's `origin` (BR-015: the featured person confirming someone
else's claim keeps it About-them). `visibility` and `visibilitySetBy` start `null` and are set on
first review (BR-030 default Family); `visibilitySetBy = 'featured_person'` is what
`packages/core`'s review rules (TASK-003) must check before ever allowing a steward to raise that
item's visibility again (BR-032 consent ceiling). `disputeNote` is required by BR-020 when
`reviewState = 'disputed'` — enforced in `packages/core`, not a DB `CHECK`, because "required when X"
conditional-on-enum-value constraints are simpler and better-tested as application logic here.
`reviewedWithFeaturedPerson` drives the BR-021 "Verified by [person]" vs. "Verified by steward"
display distinction. `embedding vector(768)` (Gemini `gemini-embedding-001`, ADR-002) is set only
once an item is reviewed and non-rejected (System Design: "Only reviewed, non-rejected items have
embeddings") — `packages/core`/the answer module must clear it on reject and (re)compute it on
confirm/correct/uncertain/dispute.

Indices: `item_space_review_visibility_idx` (space, reviewState, visibility) is the shape every
archive/search/Ask query filters on (BR-022, BR-033). `item_embedding_hnsw_idx` is an HNSW index
(`vector_cosine_ops`) for Ask GUNITA's cosine-distance candidate search (Methods EQ-001).

### `item_revision`
BR-071: every correction keeps the previous value in history. `previousValue` is a JSON snapshot of
the item's reviewable fields immediately before the change; `action` + optional `note` (dispute)
mirror BR-020's five review actions.

### `recipe_step`
BR-013: `kind = 'judgement'` steps never carry a `quantityVerbatim`; `kind = 'measured'` steps must
have one that appears verbatim in a cited segment (checked at the app layer, Methods EQ-004).
`(itemId, index)` is unique for stable ordering.

### `item_person`
Confirmed item↔person links, created by a human review action — distinct from `item.rawPeople`
(unconfirmed AI-extracted name strings). `(itemId, personId)` is unique.

### `question` (GUNITA Question / Hint)
`originKind` distinguishes why it exists: `artifact_gap` (F-005, from an upload's missing context),
`hint` (F-014, from existing material), or `ask_abstain` (BR-038, a family member's unanswered Ask
question added to the queue). `reason` is the "why" shown alongside it (F-014 acceptance criteria).
`locale` is captured at creation time since the space's locale can change later.

### `recap`
One row per space (`spaceId` unique). `status` tracks the F-016/F-017 flow: `draft` while the
steward is selecting/editing cards, `published` once public. `snapshot` is the card array (`{type,
itemId?, sourceId?, blobUrl?, caption, order}`) — both the WIP selection and, once published, the
immutable public payload. BR-070 (deleting a source/item removes its cards) is enforced by the
deleting handler rewriting `snapshot`, not a DB trigger.

### `contribution`
F-019/F-020. `submittedIpHash` is `SHA-256(ip ‖ daily_salt)` (Methods EQ-010) — the raw IP is never
stored. The `contribution_has_content` `CHECK` constraint enforces BR-060 (at least one of text,
photo, audio) at the DB level, not just in a form validator. `contribution_rate_limit_idx` is the
exact `(spaceId, submittedIpHash, submittedAt)` shape EQ-010's rate-limit query needs.
`photoBlobPathname` stores the **full Blob URL** (same convention as `source.blobPathname`, see `apps/web/src/media/blob.ts`); S-033 renders it directly.

### `tribute`
F-023/BR-081 (ADR-007). One soft tribute ("heart") per approved visitor photo per device.
`visitorKeyHash` is `HMAC-SHA-256(IP_HASH_SECRET, gunita_visitor cookie)` — never the raw cookie,
an IP, or a name. `tribute_contribution_visitor_unique` on `(contributionId, visitorKeyHash)`
makes a repeat heart a no-op and serves the per-photo count (Methods EQ-013). Deleting a
contribution cascades its tributes.

### `activity`
Space/memorial-level audit trail: consent recorded/withdrawn, invites, source/item deletion,
contribution moderation, Memorial Mode activation/reversal/publish, link enable/disable, and
per-item **visibility** changes (`item_visibility_changed`, added by TASK-011). **Not** per-item
review history (that's `item_revision` — a review action's own visibility side-effect, e.g. the
BR-030 default on first review, is captured there instead) and **not** the analytics `event` table
below — this is the accountability log behind "who did what and when" (BR-021, BR-051). `targetId`
has no foreign key, since the target row (e.g. a just-deleted source) may no longer exist when this
is read later.

### `event`
Analytics events, **exactly** the six from [User Flow §6](user-flow.md#6-instrumentation-before-launch):
`memorial_opened`, `share_started`, `share_submitted`, `ask_answered`, `question_added_from_abstain`,
`item_reviewed`. That doc is explicit: *"No names, text, or IP addresses in properties."*
`properties` must stay structured and non-identifying (e.g. `{inputTypes: [...]}`); `visitId`
correlates anonymous visitor events for the wake-friction metric (Methods EQ-011); `outcome` is a
first-class column (not buried in `properties`) since it's one of the six frozen enums.
**`[interpretation]`**: BR-036's "partial answer" isn't its own outcome in User Flow's event list —
this doc logs a partially-supported answer as `outcome = 'answered'`; only the (unpersisted)
response payload distinguishes full vs. partial support. Revisit if the pitch metrics need that
split.

### `ai_call`
Every AI call (System Design: "purpose, model, latency, token counts, ok/error. No prompt content
is logged there."). `errorMessage` is an error class/message only — the processing pipeline and
answer module must never write prompt or transcript text into this column.

## 5. Deliberately not modeled as tables

- **`answer` / `answer_sentence`** — Ask GUNITA responses are computed live from `item` +
  `item_segment` data and returned to the client; they are not persisted (System Design's product
  entity list has no `answer` table). Only the outcome is logged, via `event(type='ask_answered',
  outcome=...)`. If a later requirement needs answer history, add the table then with an ADR.
- **`item_date` / `item_place` join tables** — see §4 `item`; kept as JSONB to mirror the documented
  extraction shape, since nothing in P0 scope facets/filters the archive by date or place.
- **Better Auth's own tables** (`user`, `session`, `account`, `verification`) — created by TASK-006.

## 6. Known gaps / follow-ups

- **Not yet migrated against a live database.** `pnpm --filter web db:migrate` needs a real Neon
  `DATABASE_URL_UNPOOLED` (TASK-022 provisions this). The generated SQL
  (`apps/web/drizzle/0000_slimy_smasher.sql`) was hand-reviewed for the `vector`/HNSW index, partial
  unique indexes, and the `CHECK` constraint, and `pnpm --filter web typecheck` /
  `pnpm --filter web test` (fixture-schema tests) pass, but "migrates cleanly on Neon" is unverified
  until TASK-022 lands. `0001_*.sql` adds `tribute` (ADR-007) and is equally unverified until TASK-022.
- **`seed/load.ts` isn't transactional.** Its writes are a long sequence of unwrapped inserts (the
  Neon HTTP driver doesn't support interactive transactions the way a persistent connection would).
  If a fixture throws partway through (an unknown segment/person key, for example), the rows already
  inserted before the throw stay committed; a later run without `--reset` finds the space by name
  and reports "already seeded" without knowing the tree is incomplete. Reasonable for a demo-seed
  script whose only caller is a human running it locally, but worth a real fix (e.g. a "seeding"
  status flag, or a job-queue-based seed) before this script is trusted in CI.
- **`deleteSpaceTree` (the `--reset` path) deletes in explicit dependency order**, not via a single
  cascading `DELETE FROM space`, specifically to avoid a real Postgres hazard: several tables
  `RESTRICT`-reference `membership` (`source.uploadedByMembershipId`,
  `item_revision.changedByMembershipId`), and mixing `RESTRICT` with `CASCADE` across a shared
  parent can raise a spurious FK violation if Postgres processes the cascades in the wrong order
  (a documented class of Postgres gotcha, not something we could verify without a live database
  here — deleting explicitly sidesteps the question entirely instead of relying on cascade order).
- **Rebased onto TASK-001's real scaffold** after it merged into `stage`. `apps/web/package.json`
  and `packages/core/package.json` now carry both the Next.js/scaffold pieces (Kirby) and the
  Drizzle/seed pieces (this task), hand-merged during the rebase — see that commit for the exact
  merge. Re-verified after merging: `pnpm typecheck`, `pnpm test`, and `pnpm --filter web build` all
  pass.
- **`membership.userId` has no DB foreign key** until TASK-006's Better Auth tables exist (§4).
- `seed/data/family.json` is a **placeholder fixture** (structurally valid, content-free) that only
  exercises `seed/load.ts`; TASK-020 replaces it with the real fictional family. See `seed/README.md`.
- τ/top-k for Ask GUNITA (Methods EQ-002) live in env vars (`ASK_TAU`, `ASK_TOP_K`, docs/ops.md), not
  this schema — no table changes needed when they're calibrated (TASK-028).

## 7. Verification performed on this branch

- `pnpm install` — all pinned versions (System Design → Stack currency) resolve.
- `pnpm --filter core typecheck`, `pnpm --filter web typecheck` — clean.
- `pnpm --filter web db:generate` — produced `apps/web/drizzle/0000_fresh_northstar.sql` (16 tables,
  all enums, indices, FKs, the `CHECK` constraint, and the HNSW vector index); hand-reviewed and
  prepended with `CREATE EXTENSION IF NOT EXISTS pgcrypto|vector`.
- `pnpm --filter core test`, `pnpm --filter web test` — enum contract test and seed-fixture schema
  tests pass.
- `pnpm --filter web db:migrate` — **not run**; no Neon connection available in this environment.
- After rebasing onto TASK-001: `pnpm typecheck`, `pnpm test`, and `pnpm --filter web build`
  (real Next.js production build, Turbopack) all re-verified clean.
