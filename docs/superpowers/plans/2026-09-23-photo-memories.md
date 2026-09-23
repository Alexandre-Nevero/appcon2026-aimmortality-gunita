# Photo Memories (F-023) + Repo Doc Sync — Implementation Plan

> **Superseded in part (2026-09-24):** the visible tribute count in this plan is withdrawn.
> See [ADR-008](../../adr/ADR-008-tribute-heart-no-count.md) and
> [the no-count spec](../specs/2026-09-24-tribute-no-count-design.md).
> `gunita_visitor` lasts 14 days from first set, not one year.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Approved visitor photos on the public memorial become a full-screen, vertical, Google-Photos-Memories-style scroll (`/m/[token]/memories`, S-033) with a soft tribute heart and gentle count. No comments, no external share, no ranking. Canonical docs are also synced to the code that has already landed on `main`.

**Architecture:** One new table (`tribute`), one pure rule in `packages/core` (`isMemorialPublic`), a small `apps/web/src/memories/` module (DB queries, visitor-cookie hashing, request schema), one public route handler (`POST /api/m/[token]/tributes`), and one server-rendered page plus a single client component for the heart. Data is read live from `contribution` (approved + has photo), not from the recap snapshot, so a steward approval shows up without republishing. This is consistent with System Design: "GET /m/:token → server-rendered from snapshot + approved contributions".

**Tech Stack:** Next.js 16.3.6 App Router (async `params`/`cookies()`), React 19.2.8, Drizzle ORM 0.45.3 on Neon (`drizzle-orm/neon-http`), Zod 4.6.5, Vitest 3.2.4, CSS Modules, Node `crypto` HMAC.

## Approved design (from brainstorming, 2026-09-23)

| Decision | Choice |
|---|---|
| Demo priority | Demo-critical for AppCon (Sep 24) |
| Which photos | **Visitor contributions only**, `status = 'approved'`, `photo_blob_pathname IS NOT NULL` |
| "Like" meaning | **Soft tribute heart**, one per device, toggleable; gentle count ("12 people remembered this"); zero shows no number; never ranks or reorders; no notifications |
| Comments | None. Talk in person. |
| External share | **None for AppCon.** No share button, no `navigator.share`, no OG image. Photos stay inside `/m/[token]` |
| Layout | **Separate screen, vertical full-bleed scroll**, one photo per swipe (CSS scroll snap), mobile-first 375 px, centered ≤ 480 px on desktop |
| Order | `submitted_at ASC, id ASC` (story of the wake). Never by tribute count |
| Identity for hearts | Anonymous httpOnly cookie `gunita_visitor` (128-bit random). DB stores only `HMAC-SHA-256(IP_HASH_SECRET, cookie)` |
| Entry points | S-030 recap links to S-033. **S-032 (Thank you) does not** (BR-080: confirmation ends the interaction) |

**Honest limits (write these into ADR-007, do not hide them):**
- "No external share" is a UI rule, not a technical block: screenshots work, the memorial link itself is shareable (same as the QR), and Blob photo URLs are public capability URLs (ADR-002).
- Clearing cookies or blocking them lets one person add more than one tribute. Counts are soft and never used for ordering.
- The whole `/m/[token]` subtree shares one token; there is no per-photo permission.

## Repo state this plan was written against

Pulled `main` at `710ab72` on 2026-09-23 ~23:50 +08:00.

| Task | State on GitHub | Notes |
|---|---|---|
| TASK-001 scaffold | merged ([PR #2](https://github.com/Alexandre-Nevero/appcon2026-aimmortality-gunita/pull/2)) | |
| TASK-002 schema + seed loader | merged ([PR #1](https://github.com/Alexandre-Nevero/appcon2026-aimmortality-gunita/pull/1)) | migrate gate needs Neon (TASK-022); no DB exists yet |
| TASK-003 core rules | merged ([PR #3](https://github.com/Alexandre-Nevero/appcon2026-aimmortality-gunita/pull/3)) | |
| TASK-008 upload + pipeline | merged ([PR #4](https://github.com/Alexandre-Nevero/appcon2026-aimmortality-gunita/pull/4)) | |
| TASK-006 auth | open ([PR #5](https://github.com/Alexandre-Nevero/appcon2026-aimmortality-gunita/pull/5)) | branched from pre-TASK-002 base; its `apps/web/package.json` drops `"type": "module"`, db scripts, drizzle/ai deps vs `main` → **must rebase** |
| TASK-009 recorder | open ([PR #6](https://github.com/Alexandre-Nevero/appcon2026-aimmortality-gunita/pull/6)) | also contains all TASK-006 auth files (stacked) → **must rebase after #5** |
| TASK-017 / TASK-019 memorial server + public pages | not started | S-033 must not wait on them (anti-block protocol) |

Other facts verified in code:
- `contribution` table exists with `photoBlobPathname`, `status`, `submittedAt` (`apps/web/src/db/schema.ts`). No `tribute` table.
- `space.memorialToken`, `space.memorialLinkDisabled`, `space.lifecycleMode`, `recap.status` exist.
- Blob store is public; `source.blobPathname` stores the **full URL** (`apps/web/src/media/blob.ts`). `contribution.photoBlobPathname` must follow the same convention (TASK-017 must be told).
- Web tests use **relative imports**; there is no `vitest.config.ts` on `main` yet (PR #5 adds one with the `@` alias). Tests in this plan therefore never import files that use `@/` paths.
- No DB, no CI, no `node_modules`, no `pnpm` on this machine. Node is v26.3.0 and `corepack` is absent.
- `ADR-006` filename is already reserved by TASK-028 (`ADR-006-ask-tau.md`). This feature uses **ADR-007**.
- Free IDs: `F-023`, `BR-081`, `UJ-009`, `UF-013`, `EV-021`–`EV-023`, `S-033`, `TC-057`–`TC-059`, `EQ-013`, `DS-009`, `TASK-029`, `TASK-030`.
- Doc drift found: `docs/data-model.md` line 10 names `0000_fresh_northstar.sql`, real file is `0000_slimy_smasher.sql`; README says "TASK-001 scaffold only"; AGENTS.md says "Exact scripts land at scaffold; verify then"; implementation-plan ledger shows every task `ready`; `docs/index.md` says data model not written; root `test:e2e`/`eval` scripts point at web scripts that do not exist.

## Global Constraints

- Node ≥ 22; Next.js 16.3.6; React 19.2.8; `drizzle-orm` 0.45.3; `drizzle-kit` 0.31.5; `zod` 4.6.5; `vitest` 3.2.4. Do not add dependencies.
- Next 16: `params` and `cookies()` are async (verified in Next.js docs, "Async Request APIs (Breaking change)"). Cookies can only be **set** in Route Handlers / Server Functions, not in a page render.
- Every user-visible string ships in `fil` and `en` (BR-014, ADR-005). The About-them badge reuses `ORIGIN_LABELS.about_them` from `@gunita/core` (F-015 same badge everywhere).
- `/m/*` is never indexed (`robots: { index: false, follow: false }`).
- No share affordance, no comment input, no ordering by tributes, no analytics event for tributes, no notifications (ADR-007, BR-080, BR-081).
- No raw cookie value, IP, or name in `tribute` rows or logs.
- Tap-to-play rule unaffected (S-033 has no audio).
- Commits: conventional, **no AI attribution trailers**. Branches: `task/TASK-029-tributes-server`, `task/TASK-030-photo-memories-ui`, `docs/photo-memories-sync`.
- Mobile-first 375 px; tap targets ≥ 44 px.

## File map

| File | Responsibility | Task |
|---|---|---|
| `docs/adr/ADR-007-memorial-photo-memories.md` (new) | Decision + honest limits | 1 |
| `docs/prd.md`, `docs/sitemap.md`, `docs/user-flow.md`, `docs/system-design.md`, `docs/data-model.md`, `docs/methods.md`, `docs/qa-test-plan.md`, `docs/ops.md`, `docs/index.md` | Canonical owners reconciled to ADR-007 | 1 |
| `docs/implementation-plan.md`, `AGENTS.md`, `README.md`, `docs/data-model.md`, `docs/index.md` | Reconciled to what is merged on `main` | 2 |
| `packages/core/src/memorial.ts` (new) + test | `isMemorialPublic` pure rule (reused by TASK-017/019) | 3 |
| `apps/web/src/db/schema.ts` + `apps/web/drizzle/0001_*.sql` | `tribute` table + migration | 4 |
| `apps/web/src/memories/visitor.ts`, `tribute-request.ts` (new) + tests | Cookie id, HMAC, body schema | 5 |
| `apps/web/src/memories/queries.ts` (new) | Memorial lookup, photo list, set tribute | 6 |
| `apps/web/app/api/m/[token]/tributes/route.ts` (new) | Public POST | 7 |
| `apps/web/src/db/seed-fixture.ts`, `apps/web/src/db/seed.ts` + test | Seed a published memorial + visitor photos for the demo | 8 |
| `apps/web/src/components/memories/copy.ts` (new) + test | fil/en strings, count label | 9 |
| `apps/web/src/components/memories/{memories-feed,tribute-button,memories-entry-link}.tsx`, `memories.module.css` (new) | S-033 UI | 10 |
| `apps/web/app/m/[token]/memories/page.tsx` (new) | S-033 route | 10 |
| `docs/qa-test-plan.md`, `docs/implementation-plan.md` | Evidence recorded | 11 |

## Prerequisite (once per machine)

- [ ] **P1: Install pnpm and deps**

```bash
cd /Users/alexandreandreinevero/Gunita
npm install -g pnpm@12.5.1
pnpm -v            # expect 12.5.1
pnpm install
```

- [ ] **P2: Create an isolated worktree** (global rule: `using-git-worktrees` skill before executing a plan). Docs tasks 1–2 go on `docs/photo-memories-sync`; code tasks 3–8 on `task/TASK-029-tributes-server`; UI tasks 9–10 on `task/TASK-030-photo-memories-ui` (branch from TASK-029 until it merges, then rebase on `main`).

---

### Task 1: Decision + canonical docs for F-023

**Files:**
- Create: `docs/adr/ADR-007-memorial-photo-memories.md`
- Modify: `docs/prd.md`, `docs/sitemap.md`, `docs/user-flow.md`, `docs/system-design.md`, `docs/data-model.md`, `docs/methods.md`, `docs/qa-test-plan.md`, `docs/ops.md`, `docs/index.md`

**Interfaces:**
- Produces: IDs `F-023`, `BR-081`, `UJ-009`, `UF-013`, `EV-021`–`EV-023`, `S-033`, `TC-057`–`TC-059`, `EQ-013`, `DS-009` used by every later task.

- [ ] **Step 1: Write ADR-007**

Create `docs/adr/ADR-007-memorial-photo-memories.md`:

```markdown
# ADR-007 — Memorial photo memories with soft tributes

- **Date:** 2026-09-23
- **Status:** Accepted
- **Owners / agents:** Alex (team lead)
- **Related:** F-019, F-020, F-023 (new); BR-062, BR-080, BR-081 (new); PRD Non-goals; S-030, S-033 (new)

### Context
At a lamay, visitors bring photos. F-019/F-020 already let a visitor submit a photo and the steward
approve it into "Memories from others" on the recap (S-030). Those photos sit inside a long recap
page. The team wants approved visitor photos to become a scrollable set of memories, like "Memories"
in Google Photos, and wants visitors to be able to quietly say "I remember this too." The PRD
Non-goals currently exclude "feeds, likes, followers, comments on visitor posts", and BR-080 bans
gamification and engagement notifications.

### Why now
The feature is demo-critical for AppCon (2026-09-24). Builders need a written line between a quiet
tribute and a social feed before code lands.

### Options considered
1. **No change.** Photos stay only in S-030 "Memories from others". Safe, weakest demo moment.
2. **Photo memories + soft tribute heart, in-memorial only.** Separate full-screen vertical scroll of
   approved visitor photos; one heart per device with a gentle count; no comments, no share, no
   ranking, no notifications.
3. **Option 2 plus external sharing** (share sheet link or exported image card). Stronger reach,
   but it moves visitor photos (which may show living relatives) off the memorial without their
   consent and invites comment threads elsewhere.

### Decision
1. Add **F-023 Photo memories** at `/m/[token]/memories` (S-033): approved visitor contributions
   that include a photo, shown one per screen in a vertical scroll, oldest first.
2. Add **BR-081 Soft tributes**: a visitor may leave one heart per photo per device and remove it.
   The count shows only when at least one person has left a heart. Tributes never reorder, rank,
   filter, or trigger notifications. No comments. No share control. No analytics event for tributes.
3. Only photos a visitor submitted and the steward approved appear. Family archive photos do not.
4. S-030 links to S-033. S-032 (Thank you) does not, because the confirmation ends the interaction
   (BR-080).
5. Tributes store only `HMAC-SHA-256(IP_HASH_SECRET, anonymous cookie id)`. No IP, name, or raw
   cookie value.

### Why this option
Option 2 gives the lamay a shared, quiet way to remember without typing, which is the moment the
team wants judges to see. It keeps conversation in person, keeps visitor photos on the family's
moderated memorial, and keeps BR-080's intent: nothing pulls grieving people back.

### Overrides
- **Prior ADRs:** none superseded. Relies on ADR-002 (public Blob capability URLs) and ADR-004.
- **Doc / plan truth:** PRD Non-goals line on public social features is amended (the heart on
  approved visitor photos inside the memorial is the only exception). PRD gains F-023, BR-081,
  UJ-009. Sitemap gains S-033. System Design public surface gains `POST /api/m/:token/tributes`.
- **Out of scope:** comments, external sharing, showing archive photos in S-033, steward-curated
  ordering, tribute counts on steward dashboards.

### Consequences
- **Easier:** a clear demo beat; one reusable memorial-visibility rule (`isMemorialPublic`) for all
  `/m/*` surfaces.
- **Harder / owed:** one new table and migration; one more public write endpoint.
- **Known limits (hackathon):** "no external share" is a product rule, not a technical block
  (screenshots, shareable memorial link, public Blob URLs). Clearing or blocking cookies lets one
  person leave more than one heart; counts are soft and never used for ordering. Revisit before
  real families use it: rate-limit tributes per hashed IP, private Blob store.
- **Follow-up:** decide after AppCon whether any external sharing is acceptable, with consent from
  the contributor and the steward.
```

- [ ] **Step 2: Amend the PRD**

In `docs/prd.md`:

1. Replace header line 4 `> **Status:** Approved v0.3 · ...` with `> **Status:** Approved v0.4 · **Date:** 2026-09-23 · **Owner:** Alex`.
2. Append to the `> **Amended:**` block (after line 7 `> ([ADR-005](adr/ADR-005-ui-language.md)). No feature IDs cut.`):

```markdown
> **Amended:** 2026-09-23 — memorial photo memories with soft tributes
> ([ADR-007](adr/ADR-007-memorial-photo-memories.md)); adds F-023, BR-081, UJ-009 and narrows the
> social-features non-goal. Added after the finalized decision, by team decision.
```

3. Under `**Memorial visitor**` user stories (after the "share my memory" bullet), add:

```markdown
- As a visitor, I want to scroll through the photos others shared and quietly leave a heart, so I
  can remember together without typing a comment.
```

4. After `UJ-008` add:

```markdown
- **UJ-009 — Photo memories:** a visitor opens the recap → taps "See photo memories" → scrolls
  approved visitor photos one at a time → leaves a heart on the ones they remember → goes back.
```

5. After the `F-022` feature row add:

```markdown
| F-023 | **Photo memories:** approved visitor photos become a full-screen vertical scroll on the memorial, with a soft tribute heart | P0 (ADR-007) | Photos from the lamay stay buried in a long page; no quiet way to say "I remember this too" | No comments, no external share, no ranking |
```

6. In `### Engagement`, after BR-080 add:

```markdown
- **BR-081** — On the memorial, a visitor may leave one tribute heart per approved visitor photo per
  device and may remove it. The count shows only when it is at least one. Tributes never reorder,
  rank, or filter photos, never trigger notifications, and are never logged as analytics events.
  There are no comments and no share controls on photo memories (ADR-007).
```

7. After the `### Moderation (F-020)` flow add:

```markdown
### Photo memories (F-023)
1. From the recap, the visitor taps "See photo memories".
2. Approved visitor photos show one per screen, oldest first, with the contributor's name,
   relationship, words (unedited, BR-063), and the About them label.
3. The visitor swipes up for the next photo and may tap the heart to remember it (tap again to
   remove).
4. Back returns to the recap. There is nothing else to do on this screen.
```

8. After the `F-022` acceptance criterion add:

```markdown
- **F-023:** S-033 shows only contributions that are approved and have a photo, oldest first, with
  the About them label; pending, rejected, text-only, and audio-only contributions never appear;
  a heart can be added and removed and counts once per device; a count of zero shows no number;
  there is no comment field, share control, or tribute-based ordering; S-032 has no link to S-033;
  a disabled, unpublished, or unknown memorial shows S-034.
```

9. In the Risks table add a row:

```markdown
| Tribute counts read as a popularity contest | Hurtful at a wake | No ordering by hearts, zero shows nothing, no notifications (BR-081, ADR-007) |
```

10. Replace the Non-goals bullet `- Public social features: feeds, likes, followers, comments on visitor posts, streaks, engagement` / `  notifications.` with:

```markdown
- Public social features: feeds, followers, comments on visitor posts, streaks, engagement
  notifications, and sharing memorial content to outside platforms. The only exception is the soft
  tribute heart on approved visitor photos inside the memorial (F-023, BR-081, ADR-007).
```

11. In §13 golden path step 7, replace the step with:

```markdown
7. Scan the QR on a phone → recap → share a memory with a photo → the steward approves → it appears
   labeled About them → open photo memories, swipe to it, and leave a heart.
```

12. In the traceability table, before the `Hard cuts` row add:

```markdown
| Photo memories (post-decision addition, ADR-007) | F-023 | 13 |
```

- [ ] **Step 3: Sitemap**

In `docs/sitemap.md`:
1. Header `**Last updated:**` → `2026-09-23 (synced to ADR-004 / ADR-005 / ADR-007)`.
2. In the Web memorial table, between `S-032` and `S-034` add:

```markdown
| S-033 | Photo memories | Full-screen vertical scroll of approved visitor photos; soft tribute heart with gentle count; no comments, no share | F-023 | S-030 link | Public (token) | empty / success / tribute failed (reverts) / unavailable → S-034 |
```

3. In the IA tree under `/m/[token]`, change `└── /m/[token]/thanks               S-032` to `├── /m/[token]/thanks               S-032` and add `└── /m/[token]/memories             S-033`.
4. In the mermaid block, after the `QR` line add `  QR --> Photos["S-033 Photo memories"]`.
5. Route table: add after `/m/[token]/thanks`:

```markdown
| `/m/[token]/memories` | S-033 | `token` | Public | GET | No (`noindex`) | S-034 if disabled/unpublished/unknown; heart posts to `POST /api/m/:token/tributes` |
```

6. §7 responsive: change `| S-030–S-032 |` to `| S-030–S-033 |` and append to its "Differences" cell: `; S-033 is full-bleed black on phone, centered ≤ 480 px on desktop`.
7. §8 "Not in the map" add:

```markdown
| Comments on photo memories | ADR-007: people talk in person at the lamay | never in MVP |
| Sharing photo memories outside the memorial | ADR-007: contributor and steward consent not designed | after AppCon review |
```

- [ ] **Step 4: User flow**

In `docs/user-flow.md`:
1. Flow inventory, after UF-012:

```markdown
| UF-013 | Visitor: photo memories | Memorial visitor | S-030 | S-033 | F-023 (UJ-009) | Must-Have | Once per visitor |
```

2. Golden path step 7 → `7. Phone scans the QR → S-030 → S-031 (with a photo) → S-032. S-024: approve → it appears on S-030 as About them → S-033 shows the photo; tap the heart.`
3. After the `### UF-010` section add:

```markdown
### UF-013 — Visitor: photo memories

| Step | Screen | User does | System does | Success looks like |
|---|---|---|---|---|
| 1 | S-030 | Taps "See photo memories" | Opens S-033 | Full-screen first photo |
| 2 | S-033 | Swipes up | Snaps to the next approved visitor photo (oldest first) | One photo per swipe |
| 3 | S-033 | Taps the heart | Saves one tribute for this device; returns the count | Heart filled; "N people remembered this" |
| 4 | S-033 | Taps back | Returns to S-030 | Nothing else asked of them (BR-080) |
```

4. Edge-case table, after EV-020:

```markdown
| EV-021 | UF-013 | No approved visitor photos yet | S-033 empty state + "Share a memory" | Share one or come back later | No |
| EV-022 | UF-013 | Heart fails to send (network, 404) | Heart reverts; "Couldn't send. Try again." | Tap again | No |
| EV-023 | UF-013 | Browser blocks cookies | Heart still works, but each tap may count as a new visitor | none (ADR-007 known limit) | No |
```

- [ ] **Step 5: System design**

In `docs/system-design.md`:
1. Memorial module row (line 51): Purpose → `Memorial Mode, selection, recap drafting, publish snapshot, QR, public page, contributions, moderation, photo memories + tributes`; State → `Memorial token, recap snapshot, contributions, tributes`; F-IDs → `F-016–F-020, F-023`.
2. Entity list (line 57): add `` `tribute` `` after `` `contribution` ``.
3. In the Memorial flow block, after the `POST /api/m/:token/contributions` line add:

```
         GET /m/:token/memories → approved visitor photos, oldest first, + tribute counts (DB only, no AI)
         POST /api/m/:token/tributes {contributionId, hearted} → one tribute per device cookie (ADR-007)
```

4. Replace the `**Public surface:**` bullet with:

```markdown
- **Public surface:** only `/m/:token` pages, `POST /api/m/:token/contributions`, and
  `POST /api/m/:token/tributes`. They expose the published snapshot and approved contributions
  only. A disabled QR, reversed Memorial Mode, or unpublished recap returns the unavailable page
  (`isMemorialPublic` in `packages/core`). Pages send `noindex`. Tributes store only an HMAC of an
  anonymous device cookie keyed by `IP_HASH_SECRET` (ADR-007).
```

- [ ] **Step 6: Data model**

In `docs/data-model.md`:
1. ER overview: after `space 1───* contribution` add `contribution 1───* tribute`.
2. In `### contribution`, append: ``` `photoBlobPathname` stores the **full Blob URL** (same convention as `source.blobPathname`, see `apps/web/src/media/blob.ts`); S-033 renders it directly.```
3. After the `### contribution` section add:

```markdown
### `tribute`
F-023/BR-081 (ADR-007). One soft tribute ("heart") per approved visitor photo per device.
`visitorKeyHash` is `HMAC-SHA-256(IP_HASH_SECRET, gunita_visitor cookie)` — never the raw cookie,
an IP, or a name. `tribute_contribution_visitor_unique` on `(contributionId, visitorKeyHash)`
makes a repeat heart a no-op and serves the per-photo count (Methods EQ-013). Deleting a
contribution cascades its tributes.
```

- [ ] **Step 7: Methods**

In `docs/methods.md`:
1. After the EQ-012 row add:

```markdown
| EQ-013 | Tribute count on a photo memory (shown) | `COUNT(*)` of `tribute` rows for that contribution; one row per `visitor_key_hash` (unique index). Shown only when ≥ 1. Never used for ordering, ranking, or notifications | DS-009 | Medium (clearing cookies can add extra tributes) | PRD BR-081, ADR-007 |
```

2. After the DS-008 row add:

```markdown
| DS-009 | Tributes (contribution id + HMAC of anonymous device cookie) | GUNITA `tribute` table | Internal; pseudonymous; no IP, no name | High |
```

3. In the traceability table after the F-019 row add:

```markdown
| F-023 Photo memories | Tribute count | EQ-013 | TC-058 |
```

- [ ] **Step 8: QA plan**

In `docs/qa-test-plan.md`:
1. Traceability, after F-022:

```markdown
| F-023 | Photo memories | TC-057, TC-058, TC-059 | unit + integration + manual | vitest / manual | todo |
```

2. Automation contract: append `TC-057 (rule half)` to the `packages/core` unit row's Test ID cell, and `TC-057, TC-058` to the `apps/web/test` integration row. Append `TC-059` to the manual row.
3. After TC-054 add:

```markdown
**TC-057 — Photo memories show only approved visitor photos**
- **Covers:** F-023, BR-062, BR-081 · **Level:** unit (`isMemorialPublic`) + integration
- **Expected:** a disabled link, draft/missing recap, or reversed Memorial Mode is not public;
  S-033 lists only `approved` contributions with a photo, oldest first; pending, rejected,
  text-only, and audio-only contributions never appear; order never changes with tribute counts.

**TC-058 — Soft tribute toggle (EQ-013)**
- **Covers:** F-023, BR-081 · **Level:** integration (unit for body/cookie helpers; `curl` against a
  seeded DB until a Neon test branch exists)
- **Expected:** `hearted: true` twice → count rises once; `hearted: false` → count back; a pending,
  rejected, text-only, or other-memorial contribution → 404; a disabled or unpublished memorial →
  404; malformed body → 400; `gunita_visitor` (httpOnly) is set only when missing; `tribute` rows
  hold a 64-char hex HMAC, never the cookie value.

**TC-059 — Photo memories on a phone (manual)**
- **Covers:** F-023, BR-080, BR-081 · **Level:** manual, iOS Safari + Android Chrome over HTTPS
- **Expected:** S-030 → S-033 via the entry link; one photo per swipe; heart toggles and the count
  updates; zero hearts shows no number; no comment box, share button, or "most loved" ordering;
  back returns to S-030; a disabled link shows S-034; S-032 has no link to S-033.
```

- [ ] **Step 9: Ops**

In `docs/ops.md`, change the `IP_HASH_SECRET` purpose cell to: `salt for visitor rate limiting (Methods EQ-010) and HMAC key for anonymous tribute cookies (ADR-007)`.

- [ ] **Step 10: Index**

In `docs/index.md`: PRD row → `Approved v0.4`; add rows:

```markdown
| ADR-007 Memorial photo memories | [adr/ADR-007-memorial-photo-memories.md](adr/ADR-007-memorial-photo-memories.md) | Accepted | 2026-09-23 |
| Photo memories plan | [superpowers/plans/2026-09-23-photo-memories.md](superpowers/plans/2026-09-23-photo-memories.md) | Living | 2026-09-23 |
```

Health check line 1 → `- [x] Every PRD feature F-001–F-023 has QA cases or a manual plan.`

- [ ] **Step 11: Verify consistency**

Run:
```bash
for f in prd sitemap user-flow system-design data-model methods qa-test-plan; do rg -q "F-023" docs/$f.md || echo "missing F-023: $f"; done
for f in prd sitemap system-design ops index; do rg -q "ADR-007" docs/$f.md || echo "missing ADR-007: $f"; done
rg -n "likes, followers" docs/prd.md
```
Expected: no output from any of the three (every owner references the feature; old non-goal wording is gone).

- [ ] **Step 12: Commit**

```bash
git add docs/adr/ADR-007-memorial-photo-memories.md docs/prd.md docs/sitemap.md docs/user-flow.md docs/system-design.md docs/data-model.md docs/methods.md docs/qa-test-plan.md docs/ops.md docs/index.md
git commit -m "docs: add ADR-007 photo memories with soft tributes (F-023)"
```

---

### Task 2: Sync docs to what is merged on `main`

**Files:**
- Modify: `docs/implementation-plan.md`, `AGENTS.md`, `README.md`, `docs/data-model.md`, `docs/index.md`

**Interfaces:**
- Consumes: gate command output from Step 1.
- Produces: ledger rows `TASK-029`, `TASK-030` that later tasks reference.

- [ ] **Step 1: Run the merged tasks' gates on current `main` and save the output**

```bash
pnpm --filter web build 2>&1 | tail -5          # TASK-001 gate
pnpm --filter core test 2>&1 | tail -5          # TASK-003 gate
pnpm --filter web test 2>&1 | tail -5           # TASK-008 gate
pnpm typecheck 2>&1 | tail -5
pnpm test:e2e 2>&1 | tail -3                    # expected to fail: no web test:e2e script yet
```

Record each exit code. Only a task whose gate exits 0 may be marked `done`.

- [ ] **Step 2: Update `docs/implementation-plan.md`**

1. Header: `**Last checkpoint:** 2026-09-23T23:50:00+08:00 · TASK-001/002/003/008 merged; ADR-007 photo memories added` and `**Current stopping point:** main at 710ab72 — scaffold, schema + seed loader, core rules, upload pipeline merged; no DB provisioned, no deploy; auth (PR #5) and recorder (PR #6) open`.
2. §1 `**Current code state:**` → `scaffold + schema/seed loader + core rules + upload/AI pipeline merged (PRs #1–#4); no Neon DB or deploy yet; no Playwright or eval runner yet`.
3. §0.1 routes table: add rows

```markdown
| GET | `/m/[token]/memories` (RSC page) | Josh UI + Shi loader | visitors (S-033) |
| POST | `/api/m/:token/tributes` | Shi | Josh S-033 |
```

4. Ledger rows (use the real exit codes from Step 1; the text below assumes all passed — if one failed, leave that row `in_progress` and paste the failure line instead):

| Row | Work ref | Status | Gate / evidence (append) |
|---|---|---|---|
| TASK-001 | `https://github.com/Alexandre-Nevero/appcon2026-aimmortality-gunita/pull/2` | `done` | `· result: PASS (build on 710ab72, 2026-09-23)` |
| TASK-002 | `https://github.com/Alexandre-Nevero/appcon2026-aimmortality-gunita/pull/1` | `blocked` | `· merged; migrate gate waits for Neon (TASK-022)` |
| TASK-003 | `https://github.com/Alexandre-Nevero/appcon2026-aimmortality-gunita/pull/3` | `done` | `· result: PASS (710ab72)` |
| TASK-006 | `https://github.com/Alexandre-Nevero/appcon2026-aimmortality-gunita/pull/5` | `in_progress` | `· PR open; rebase on main (package.json drops type:module, db scripts, drizzle/ai deps)` |
| TASK-008 | `https://github.com/Alexandre-Nevero/appcon2026-aimmortality-gunita/pull/4` | `done` | `· result: PASS (710ab72)` |
| TASK-009 | `https://github.com/Alexandre-Nevero/appcon2026-aimmortality-gunita/pull/6` | `in_progress` | `· PR open; also carries TASK-006 files — rebase after #5 merges` |

5. Edit existing outcomes:
   - TASK-017 outcome, append: `; stores full Blob URL in contribution.photoBlobPathname; reuse core isMemorialPublic`. Write scope, append: ` (except apps/web/app/api/m/[token]/tributes/** → TASK-029)`.
   - TASK-019 outcome, append: `; S-030 renders MemoriesEntryLink (S-033); S-034 at apps/web/app/m/[token]/not-found.tsx`. Write scope, append: ` (except apps/web/app/m/[token]/memories/** → TASK-030)`.
   - TASK-020 outcome, append: `; publishMemorial: true + ≥3 approved visitor photo contributions for S-033`.

6. Add ledger rows after TASK-028 (contiguous, no blank line):

```markdown
| TASK-029 | Photo memories server: tribute table + migration, isMemorialPublic, memories queries, POST tributes, seed memorial + contributions; F-023 | — | Shi | `packages/core/src/memorial.ts`, `packages/core/src/memorial.test.ts`, `packages/core/src/index.ts`, `apps/web/src/db/schema.ts` (tribute only), `apps/web/drizzle/0001_*`, `apps/web/drizzle/meta/**`, `apps/web/src/memories/**`, `apps/web/app/api/m/[token]/tributes/**`, `apps/web/src/db/seed-fixture.ts`, `apps/web/src/db/seed.ts`, `apps/web/test/memories-*.test.ts`, `apps/web/test/seed-fixture.test.ts` | — | ready | TC-057,TC-058 · `pnpm typecheck && pnpm test` |
| TASK-030 | Photo memories UI S-033 (vertical scroll, tribute heart, fil/en, entry link); F-023 | — | Josh | `apps/web/app/m/[token]/memories/**`, `apps/web/src/components/memories/**`, `apps/web/test/memories-copy.test.ts` | — | ready | TC-059 · `pnpm --filter web typecheck && pnpm --filter web build` |
```

7. §5: `**Ready now:**` → `TASK-004, 005, 007, 010–030 (all Depends on: —)`; integration order line 3 → `007 → 010 → 012 → 014 → 018 → 019 → 030`; line 2 → `008 → 011 → 013 → 015 → 017 → 029`; append to **Never cut:** `, S-033 photo memories (demo-critical, ADR-007)`.
8. §9 change log, append:

```markdown
| 2026-09-23T23:50:00+08:00 · checkpoint | TASK-001/003/008 done, TASK-002 blocked (no DB), TASK-006/009 in_progress (rebase) | PRs #1–#6 on GitHub; gates run on 710ab72 | implementation-plan · data-model · README · AGENTS |
| 2026-09-23T23:50:00+08:00 · pivot | TASK-029, TASK-030 added; TASK-017/019/020 notes | ADR-007 photo memories (demo-critical) | PRD v0.4 · sitemap · user-flow · system design · methods · QA · ops |
```

- [ ] **Step 3: Update `AGENTS.md` Build & run**

Replace the Build & run block and its trailing note with:

````markdown
## Build & run
```
pnpm install          # pnpm 12.5.1 (packageManager); install with `npm i -g pnpm@12.5.1` if corepack is missing
pnpm --filter web dev
pnpm db:generate      # drizzle-kit, diffs apps/web/src/db/schema.ts
pnpm db:migrate       # needs DATABASE_URL_UNPOOLED (Neon, TASK-022)
pnpm db:seed          # needs DATABASE_URL; `-- --reset` to reseed
```
(Verified on main 710ab72. `pnpm test:e2e` and `pnpm eval` are declared at the root but not wired
in `apps/web` yet.)
````

- [ ] **Step 4: Update `README.md`**

Replace the paragraph that begins `At the moment, this repository contains the TASK-001 scaffold only` with:

```markdown
Current state (2026-09-23): the pnpm workspace, Drizzle schema + seed loader, `packages/core` rules,
and the source upload + AI processing pipeline are merged. Auth, the recorder, memorial pages, and
photo memories (ADR-007) are in progress. See [docs/implementation-plan.md](docs/implementation-plan.md).
```

- [ ] **Step 5: Fix data-model drift**

In `docs/data-model.md` line 10, replace `` `apps/web/drizzle/0000_fresh_northstar.sql` `` with `` `apps/web/drizzle/0000_slimy_smasher.sql` ``.

- [ ] **Step 6: Fix index drift**

In `docs/index.md` §0 note, replace `**Not generated yet:** `idea.md` (seed brief), pitch kit (Gian TASK-023), data model (Shi TASK-002).` with `**Not generated yet:** `idea.md` (seed brief), pitch kit (Gian TASK-023).`; add suite row `| Data Model | [data-model.md](data-model.md) | Draft v0.1 | 2026-09-23 |` after QA; health check `- [x] Data model doc written (Shi TASK-002).`; §0 table add `| Tables, columns, enums | [Data Model](data-model.md) | Shi (TASK-002) |` after the System Design row.

- [ ] **Step 7: Run the plan checker**

```bash
python3 tools/check-implementation-plan.py docs/implementation-plan.md
```
Expected: `APPROVE: ... 30 valid task row(s)`. Parallel-safety warnings about glob-style scopes are advisory.

- [ ] **Step 8: Commit**

```bash
git add docs/implementation-plan.md AGENTS.md README.md docs/data-model.md docs/index.md
git commit -m "docs: sync plan, README, AGENTS, data model to merged TASK-001/002/003/008"
```

---

### Task 3: `isMemorialPublic` rule in `packages/core`

**Files:**
- Create: `packages/core/src/memorial.ts`, `packages/core/src/memorial.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Produces: `export interface MemorialAccessState { lifecycleMode: LifecycleMode; memorialLinkDisabled: boolean; recapStatus: RecapStatus | null }` and `export function isMemorialPublic(state: MemorialAccessState): boolean`.

- [ ] **Step 1: Write the failing test** (`packages/core/src/memorial.test.ts`)

```ts
import { describe, expect, it } from "vitest";

import { isMemorialPublic } from "./memorial";

const open = { lifecycleMode: "memorial", memorialLinkDisabled: false, recapStatus: "published" } as const;

// TC-057 (rule half): every /m/[token] surface uses this gate.
describe("isMemorialPublic", () => {
  it("is public when activated, published, and enabled", () => {
    expect(isMemorialPublic(open)).toBe(true);
  });

  it("hides a memorial whose link the steward disabled (BR-055)", () => {
    expect(isMemorialPublic({ ...open, memorialLinkDisabled: true })).toBe(false);
  });

  it("hides a draft or missing recap (BR-052)", () => {
    expect(isMemorialPublic({ ...open, recapStatus: "draft" })).toBe(false);
    expect(isMemorialPublic({ ...open, recapStatus: null })).toBe(false);
  });

  it("hides a reversed activation (BR-051)", () => {
    expect(isMemorialPublic({ ...open, lifecycleMode: "during" })).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `pnpm --filter core test -- memorial`
Expected: FAIL, `Failed to resolve import "./memorial"`.

- [ ] **Step 3: Implement** (`packages/core/src/memorial.ts`)

```ts
import type { LifecycleMode, RecapStatus } from "./enums";

export interface MemorialAccessState {
  lifecycleMode: LifecycleMode;
  memorialLinkDisabled: boolean;
  recapStatus: RecapStatus | null;
}

// PRD BR-051/BR-052/BR-055, F-018: public /m/[token] surfaces (S-030–S-033) show content only after
// the steward activated Memorial Mode, published the recap, and left the link enabled. Anything
// else renders S-034.
export function isMemorialPublic(state: MemorialAccessState): boolean {
  return (
    state.lifecycleMode === "memorial" &&
    !state.memorialLinkDisabled &&
    state.recapStatus === "published"
  );
}
```

In `packages/core/src/index.ts`, add `export * from "./memorial";` between `./labels` and `./recipe`.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter core test && pnpm --filter core typecheck`
Expected: all PASS, including 4 new `isMemorialPublic` tests.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/memorial.ts packages/core/src/memorial.test.ts packages/core/src/index.ts
git commit -m "feat(TASK-029): add isMemorialPublic core rule (F-023)"
```

---

### Task 4: `tribute` table + migration

**Files:**
- Modify: `apps/web/src/db/schema.ts` (insert after the `contribution` table, before `activity`)
- Create (generated): `apps/web/drizzle/0001_<drizzle-name>.sql`, `apps/web/drizzle/meta/0001_snapshot.json`; modify `apps/web/drizzle/meta/_journal.json`

**Interfaces:**
- Produces: `export const tribute` with columns `id`, `contributionId`, `visitorKeyHash`, `createdAt`.

- [ ] **Step 1: Add the table**

```ts
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
    // A repeat heart is a no-op; also serves the per-photo count (Methods EQ-013).
    uniqueIndex("tribute_contribution_visitor_unique").on(table.contributionId, table.visitorKeyHash),
  ],
);
```

- [ ] **Step 2: Generate the migration**

Run: `pnpm db:generate`
Expected: `apps/web/drizzle/0001_*.sql` created; no interactive rename prompt (pure addition).

- [ ] **Step 3: Inspect the SQL**

Run: `cat apps/web/drizzle/0001_*.sql`
Expected, and nothing else (no ALTER/DROP on existing tables):
- `CREATE TABLE "tribute"` with `"visitor_key_hash" text NOT NULL`
- `FOREIGN KEY ("contribution_id") REFERENCES "public"."contribution"("id") ON DELETE cascade`
- `CREATE UNIQUE INDEX "tribute_contribution_visitor_unique" ON "tribute" USING btree ("contribution_id","visitor_key_hash")`

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: exit 0.

- [ ] **Step 5: Update data-model gap note**

In `docs/data-model.md` §6, first bullet, append: ` `0001_*.sql` adds `tribute` (ADR-007) and is equally unverified until TASK-022.`

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/db/schema.ts apps/web/drizzle docs/data-model.md
git commit -m "feat(TASK-029): add tribute table and migration (F-023)"
```

---

### Task 5: Visitor cookie + request schema

**Files:**
- Create: `apps/web/src/memories/visitor.ts`, `apps/web/src/memories/tribute-request.ts`
- Test: `apps/web/test/memories-visitor.test.ts`, `apps/web/test/memories-request.test.ts`

**Interfaces:**
- Produces: `VISITOR_COOKIE = "gunita_visitor"`, `VISITOR_COOKIE_MAX_AGE_SECONDS`, `newVisitorId(): string`, `isVisitorId(value: string | undefined): value is string`, `hashVisitorId(visitorId: string, secret?: string): string`, `tributeRequestSchema` (`{ contributionId: string (uuid); hearted: boolean }`), `type TributeRequest`.

- [ ] **Step 1: Write failing tests**

`apps/web/test/memories-visitor.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { hashVisitorId, isVisitorId, newVisitorId } from "../src/memories/visitor";

// TC-058: tributes key on an anonymous cookie; only its HMAC is stored.
describe("visitor key", () => {
  it("issues distinct 128-bit base64url ids", () => {
    const id = newVisitorId();
    expect(isVisitorId(id)).toBe(true);
    expect(newVisitorId()).not.toBe(id);
  });

  it("rejects missing or tampered cookie values", () => {
    expect(isVisitorId(undefined)).toBe(false);
    expect(isVisitorId("short")).toBe(false);
    expect(isVisitorId(`${"a".repeat(21)}!`)).toBe(false);
  });

  it("stores a keyed hash that is stable per secret and hides the id", () => {
    const hash = hashVisitorId("abc", "s1");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashVisitorId("abc", "s1")).toBe(hash);
    expect(hashVisitorId("abc", "s2")).not.toBe(hash);
    expect(hash).not.toContain("abc");
  });

  it("fails loudly without a secret", () => {
    expect(() => hashVisitorId("abc", "")).toThrow(/IP_HASH_SECRET/);
  });
});
```

`apps/web/test/memories-request.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { tributeRequestSchema } from "../src/memories/tribute-request";

const id = "3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f";

describe("tributeRequestSchema", () => {
  it("accepts a contribution uuid and the desired heart state", () => {
    expect(tributeRequestSchema.safeParse({ contributionId: id, hearted: true }).success).toBe(true);
    expect(tributeRequestSchema.safeParse({ contributionId: id, hearted: false }).success).toBe(true);
  });

  it("rejects a non-uuid id so bad input never reaches Postgres", () => {
    expect(tributeRequestSchema.safeParse({ contributionId: "123", hearted: true }).success).toBe(false);
  });

  it("requires an explicit heart state", () => {
    expect(tributeRequestSchema.safeParse({ contributionId: id }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run and see them fail**

Run: `pnpm --filter web test -- memories`
Expected: FAIL, cannot resolve `../src/memories/visitor` and `../src/memories/tribute-request`.

- [ ] **Step 3: Implement**

`apps/web/src/memories/visitor.ts`:

```ts
import { createHmac, randomBytes } from "node:crypto";

// ADR-007: anonymous per-device id for soft tributes. Only its HMAC is ever stored.
export const VISITOR_COOKIE = "gunita_visitor";
export const VISITOR_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const VISITOR_ID_RE = /^[A-Za-z0-9_-]{22}$/;

export function newVisitorId(): string {
  return randomBytes(16).toString("base64url");
}

export function isVisitorId(value: string | undefined): value is string {
  return value != null && VISITOR_ID_RE.test(value);
}

export function hashVisitorId(visitorId: string, secret = process.env.IP_HASH_SECRET): string {
  if (!secret) {
    throw new Error("IP_HASH_SECRET is not set (see docs/ops.md § Configuration & secrets)");
  }
  return createHmac("sha256", secret).update(visitorId).digest("hex");
}
```

`apps/web/src/memories/tribute-request.ts`:

```ts
import { z } from "zod";

// POST /api/m/:token/tributes. `hearted` is the desired end state, so a retried tap is idempotent.
export const tributeRequestSchema = z.object({
  contributionId: z.uuid(),
  hearted: z.boolean(),
});

export type TributeRequest = z.infer<typeof tributeRequestSchema>;
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter web test -- memories && pnpm --filter web typecheck`
Expected: 7 new tests PASS; typecheck exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/memories/visitor.ts apps/web/src/memories/tribute-request.ts apps/web/test/memories-visitor.test.ts apps/web/test/memories-request.test.ts
git commit -m "feat(TASK-029): visitor cookie hashing and tribute request schema"
```

---

### Task 6: Memories queries

**Files:**
- Create: `apps/web/src/memories/queries.ts`

**Interfaces:**
- Consumes: `isMemorialPublic` (Task 3), `tribute` (Task 4).
- Produces:
  - `interface PublicMemorial { spaceId: string; locale: Locale; featuredName: string | null }`
  - `findPublicMemorial(db: Db, token: string): Promise<PublicMemorial | null>`
  - `interface PhotoMemory { id: string; photoUrl: string; displayName: string; relationship: string; textContent: string | null; tributeCount: number; hearted: boolean }`
  - `listPhotoMemories(db: Db, spaceId: string, visitorKeyHash: string | null): Promise<PhotoMemory[]>`
  - `setTribute(db: Db, spaceId: string, contributionId: string, visitorKeyHash: string, hearted: boolean): Promise<number | null>`

These run SQL only; they are verified by typecheck here and by TC-058 against a seeded DB in Task 11 (no Neon test branch exists yet, and no DB mocking layer exists in this repo).

- [ ] **Step 1: Implement** (`apps/web/src/memories/queries.ts`)

```ts
import { isMemorialPublic, type Locale } from "@gunita/core";
import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";

import type { db as Database } from "../db";
import { contribution, person, recap, space, tribute } from "../db/schema";

type Db = typeof Database;

export interface PublicMemorial {
  spaceId: string;
  locale: Locale;
  featuredName: string | null;
}

// Null for an unknown, disabled, unpublished, or reversed memorial — callers render S-034 / 404.
export async function findPublicMemorial(db: Db, token: string): Promise<PublicMemorial | null> {
  const [row] = await db
    .select({
      spaceId: space.id,
      locale: space.locale,
      lifecycleMode: space.lifecycleMode,
      memorialLinkDisabled: space.memorialLinkDisabled,
      recapStatus: recap.status,
    })
    .from(space)
    .leftJoin(recap, eq(recap.spaceId, space.id))
    .where(eq(space.memorialToken, token))
    .limit(1);
  if (!row || !isMemorialPublic(row)) return null;

  const featured = await db.query.person.findFirst({
    where: and(eq(person.spaceId, row.spaceId), eq(person.isFeatured, true)),
  });
  return { spaceId: row.spaceId, locale: row.locale, featuredName: featured?.displayName ?? null };
}

export interface PhotoMemory {
  id: string;
  photoUrl: string;
  displayName: string;
  relationship: string;
  textContent: string | null;
  tributeCount: number;
  hearted: boolean;
}

const isPhotoMemory = and(eq(contribution.status, "approved"), isNotNull(contribution.photoBlobPathname));

// F-023: approved visitor photos, oldest first. Never ordered by tributes (ADR-007: no ranking).
export async function listPhotoMemories(
  db: Db,
  spaceId: string,
  visitorKeyHash: string | null,
): Promise<PhotoMemory[]> {
  const rows = await db
    .select({
      id: contribution.id,
      photoUrl: contribution.photoBlobPathname,
      displayName: contribution.displayName,
      relationship: contribution.relationship,
      textContent: contribution.textContent,
      tributeCount: sql<number>`count(${tribute.id})::int`,
    })
    .from(contribution)
    .leftJoin(tribute, eq(tribute.contributionId, contribution.id))
    .where(and(eq(contribution.spaceId, spaceId), isPhotoMemory))
    .groupBy(contribution.id)
    .orderBy(asc(contribution.submittedAt), asc(contribution.id));

  const hearted = new Set<string>();
  if (visitorKeyHash && rows.length > 0) {
    const mine = await db
      .select({ id: tribute.contributionId })
      .from(tribute)
      .where(
        and(
          eq(tribute.visitorKeyHash, visitorKeyHash),
          inArray(
            tribute.contributionId,
            rows.map((row) => row.id),
          ),
        ),
      );
    for (const row of mine) hearted.add(row.id);
  }

  return rows.flatMap((row) =>
    row.photoUrl ? [{ ...row, photoUrl: row.photoUrl, hearted: hearted.has(row.id) }] : [],
  );
}

// Returns the new count, or null when the target is not an approved photo in this memorial.
export async function setTribute(
  db: Db,
  spaceId: string,
  contributionId: string,
  visitorKeyHash: string,
  hearted: boolean,
): Promise<number | null> {
  const target = await db.query.contribution.findFirst({
    where: and(eq(contribution.id, contributionId), eq(contribution.spaceId, spaceId), isPhotoMemory),
    columns: { id: true },
  });
  if (!target) return null;

  if (hearted) {
    await db.insert(tribute).values({ contributionId, visitorKeyHash }).onConflictDoNothing();
  } else {
    await db
      .delete(tribute)
      .where(and(eq(tribute.contributionId, contributionId), eq(tribute.visitorKeyHash, visitorKeyHash)));
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tribute)
    .where(eq(tribute.contributionId, contributionId));
  return count;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: exit 0. If `isMemorialPublic(row)` errors on `recapStatus` type, the left join must be typed `"draft" | "published" | null`; do not cast — check the `recap` import.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/memories/queries.ts
git commit -m "feat(TASK-029): memorial lookup, photo memories list, and tribute toggle queries"
```

---

### Task 7: `POST /api/m/[token]/tributes`

**Files:**
- Create: `apps/web/app/api/m/[token]/tributes/route.ts`

**Interfaces:**
- Consumes: Task 5 and Task 6 exports.
- Produces: `POST` body `{ contributionId: uuid, hearted: boolean }` → `200 { count: number, hearted: boolean }` · `400 { error: "invalid_body" }` · `404 { error: "not_found" }`. Sets `gunita_visitor` cookie only when the request had no valid one.

- [ ] **Step 1: Implement**

```ts
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/src/db";
import { findPublicMemorial, setTribute } from "@/src/memories/queries";
import { tributeRequestSchema } from "@/src/memories/tribute-request";
import {
  hashVisitorId,
  isVisitorId,
  newVisitorId,
  VISITOR_COOKIE,
  VISITOR_COOKIE_MAX_AGE_SECONDS,
} from "@/src/memories/visitor";

// F-023, ADR-007: POST /api/m/:token/tributes { contributionId, hearted } → { count, hearted }.
export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const memorial = await findPublicMemorial(db, token);
  if (!memorial) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const parsed = tributeRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const existing = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = isVisitorId(existing) ? existing : newVisitorId();
  const { contributionId, hearted } = parsed.data;
  const count = await setTribute(db, memorial.spaceId, contributionId, hashVisitorId(visitorId), hearted);
  if (count == null) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const response = NextResponse.json({ count, hearted });
  if (visitorId !== existing) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: VISITOR_COOKIE_MAX_AGE_SECONDS,
    });
  }
  return response;
}
```

- [ ] **Step 2: Typecheck + build**

Run: `pnpm --filter web typecheck && pnpm --filter web build`
Expected: both exit 0; build output lists `ƒ /api/m/[token]/tributes`.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/api/m/[token]/tributes/route.ts"
git commit -m "feat(TASK-029): add public tribute endpoint (F-023)"
```

---

### Task 8: Seed a published memorial + visitor photos

**Files:**
- Modify: `apps/web/src/db/seed-fixture.ts`, `apps/web/src/db/seed.ts`
- Test: `apps/web/test/seed-fixture.test.ts`

**Interfaces:**
- Produces fixture fields `publishMemorial: boolean` (default `false`) and `contributions: ContributionFixture[]` (default `[]`). TASK-020 fills `seed/data/family.json` with real photos; the placeholder file stays valid unchanged.

- [ ] **Step 1: Write the failing test** (append inside the existing `describe` in `apps/web/test/seed-fixture.test.ts`)

```ts
  it("accepts a published memorial with visitor contributions and rejects empty ones (BR-060)", () => {
    const base = { space: { name: "Test Family" } };
    const parsed = familyFixture.parse({
      ...base,
      publishMemorial: true,
      contributions: [
        {
          displayName: "Ana",
          relationship: "Kapitbahay",
          photoBlobPathname: "https://example.public.blob.vercel-storage.com/a.jpg",
          status: "approved",
        },
      ],
    });
    expect(parsed.publishMemorial).toBe(true);
    expect(parsed.contributions[0].status).toBe("approved");

    expect(familyFixture.parse(base).contributions).toEqual([]);
    expect(
      familyFixture.safeParse({ ...base, contributions: [{ displayName: "Ana", relationship: "Kapitbahay" }] })
        .success,
    ).toBe(false);
  });
```

- [ ] **Step 2: Run and see it fail**

Run: `pnpm --filter web test -- seed-fixture`
Expected: FAIL (`parsed.publishMemorial` is `undefined`; empty contribution is accepted because the key is stripped).

- [ ] **Step 3: Extend the fixture schema** (`apps/web/src/db/seed-fixture.ts`)

Add `contributionStatusSchema` to the `@gunita/core` import list. Before `export const familyFixture` add:

```ts
// F-019/F-020 visitor memories, so S-030/S-033 have content before live moderation exists.
const contributionFixture = z
  .object({
    displayName: z.string(),
    relationship: z.string(),
    textContent: z.string().nullable().optional(),
    // Full public Blob URL, same convention as `source.blobPathname`.
    photoBlobPathname: z.string().nullable().optional(),
    audioBlobPathname: z.string().nullable().optional(),
    status: contributionStatusSchema.default("pending"),
  })
  .refine((c) => Boolean(c.textContent || c.photoBlobPathname || c.audioBlobPathname), {
    message: "A contribution needs text, photo, or audio (BR-060)",
    path: ["textContent"],
  });
```

Inside `familyFixture`, after `items`, add:

```ts
  // Activates Memorial Mode and publishes an (empty) recap; the loader prints the /m/<token> URL.
  publishMemorial: z.boolean().default(false),
  contributions: z.array(contributionFixture).default([]),
```

- [ ] **Step 4: Run the test**

Run: `pnpm --filter web test -- seed-fixture`
Expected: PASS (all 4 tests).

- [ ] **Step 5: Extend the loader** (`apps/web/src/db/seed.ts`)

Add `import { randomBytes } from "node:crypto";` at the top. In the `if (existing)` / `!options.reset` branch, before `return`, add:

```ts
      if (existing.memorialToken) console.log(`Memorial: /m/${existing.memorialToken}/memories`);
```

After the items loop, before the final `console.log`, add:

```ts
  if (fixture.publishMemorial) {
    // System Design: token is 128-bit random base64url, generated here so it is never committed.
    const token = randomBytes(16).toString("base64url");
    const now = new Date();
    await db
      .update(space)
      .set({ lifecycleMode: "memorial", memorialToken: token, memorialActivatedAt: now })
      .where(eq(space.id, createdSpace.id));
    await db.insert(recap).values({
      spaceId: createdSpace.id,
      status: "published",
      publishedAt: now,
      publishedByMembershipId: firstMembershipId,
    });
    await db.insert(activity).values([
      { spaceId: createdSpace.id, membershipId: firstMembershipId, type: "memorial_activated" },
      { spaceId: createdSpace.id, membershipId: firstMembershipId, type: "memorial_published" },
    ]);
    console.log(`Memorial published: /m/${token}  ·  photo memories: /m/${token}/memories`);
  }

  // Fixture order becomes submission order, which is S-033's display order.
  const firstSubmittedAt = Date.now() - fixture.contributions.length * 1000;
  for (const [index, c] of fixture.contributions.entries()) {
    await db.insert(contribution).values({
      spaceId: createdSpace.id,
      displayName: c.displayName,
      relationship: c.relationship,
      textContent: c.textContent ?? null,
      photoBlobPathname: c.photoBlobPathname ?? null,
      audioBlobPathname: c.audioBlobPathname ?? null,
      status: c.status,
      submittedIpHash: "seed",
      submittedAt: new Date(firstSubmittedAt + index * 1000),
      reviewedByMembershipId: c.status === "pending" ? null : firstMembershipId,
      reviewedAt: c.status === "pending" ? null : new Date(),
    });
  }
```

(`deleteSpaceTree` needs no change: deleting `contribution` rows cascades to `tribute`.)

- [ ] **Step 6: Verify**

Run: `pnpm --filter web typecheck && pnpm --filter web test`
Expected: exit 0; all web tests PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/db/seed-fixture.ts apps/web/src/db/seed.ts apps/web/test/seed-fixture.test.ts
git commit -m "feat(TASK-029): seed published memorial and visitor contributions"
```

---

### Task 9: fil/en copy for S-033

**Files:**
- Create: `apps/web/src/components/memories/copy.ts`
- Test: `apps/web/test/memories-copy.test.ts`

**Interfaces:**
- Produces: `MEMORIES_COPY`, `t(key, locale)`, `sharedBy(name, relationship, locale)`, `photoAlt(name, locale)`, `tributeCountLabel(count, locale)`, `position(index, total)`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { MEMORIES_COPY, position, tributeCountLabel } from "../src/components/memories/copy";

describe("photo memories copy (BR-014)", () => {
  it("has fil and en for every string", () => {
    for (const label of Object.values(MEMORIES_COPY)) {
      expect(label.fil).toBeTruthy();
      expect(label.en).toBeTruthy();
    }
  });

  it("shows nothing for zero tributes so no photo looks unloved (BR-081)", () => {
    expect(tributeCountLabel(0, "en")).toBe("");
    expect(tributeCountLabel(0, "fil")).toBe("");
  });

  it("counts tributes gently in both languages (EQ-013)", () => {
    expect(tributeCountLabel(1, "en")).toBe("1 person remembered this");
    expect(tributeCountLabel(12, "en")).toBe("12 people remembered this");
    expect(tributeCountLabel(12, "fil")).toBe("12 ang nakaalala");
  });

  it("shows a 1-based position", () => {
    expect(position(0, 5)).toBe("1 / 5");
  });
});
```

- [ ] **Step 2: Run and see it fail**

Run: `pnpm --filter web test -- memories-copy`
Expected: FAIL, cannot resolve `../src/components/memories/copy`.

- [ ] **Step 3: Implement**

`copy.ts` imports only `@gunita/core` (a workspace package, which Vitest resolves without the `@/` alias):

```ts
import { ORIGIN_LABELS, type Locale, type LocalizedLabel } from "@gunita/core";

// BR-014: every S-033 string in fil and en. Move into content/i18n once TASK-004 lands.
export const MEMORIES_COPY = {
  title: { fil: "Mga alaala sa larawan", en: "Photo memories" },
  entry: { fil: "Tingnan ang mga larawan", en: "See photo memories" },
  back: { fil: "Bumalik", en: "Back" },
  empty: { fil: "Wala pang larawang naibahagi.", en: "No photos shared yet." },
  shareCta: { fil: "Magbahagi ng alaala", en: "Share a memory" },
  heart: { fil: "Alalahanin", en: "Remember" },
  sendFailed: { fil: "Hindi naipadala. Subukan ulit.", en: "Couldn't send. Try again." },
  aboutThem: ORIGIN_LABELS.about_them,
} satisfies Record<string, LocalizedLabel>;

export function t(key: keyof typeof MEMORIES_COPY, locale: Locale): string {
  return MEMORIES_COPY[key][locale];
}

export function sharedBy(name: string, relationship: string, locale: Locale): string {
  return locale === "fil" ? `Ibinahagi ni ${name} · ${relationship}` : `Shared by ${name} · ${relationship}`;
}

export function photoAlt(name: string, locale: Locale): string {
  return locale === "fil" ? `Larawang ibinahagi ni ${name}` : `Photo shared by ${name}`;
}

// Methods EQ-013. Zero renders nothing (BR-081).
export function tributeCountLabel(count: number, locale: Locale): string {
  if (count <= 0) return "";
  if (locale === "fil") return `${count} ang nakaalala`;
  return count === 1 ? "1 person remembered this" : `${count} people remembered this`;
}

export function position(index: number, total: number): string {
  return `${index + 1} / ${total}`;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter web test -- memories-copy && pnpm --filter web typecheck`
Expected: 4 PASS; exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/memories/copy.ts apps/web/test/memories-copy.test.ts
git commit -m "feat(TASK-030): fil/en copy for photo memories (F-023)"
```

---

### Task 10: S-033 page, feed, heart, entry link

**Files:**
- Create: `apps/web/src/components/memories/memories.module.css`, `memories-feed.tsx`, `tribute-button.tsx`, `memories-entry-link.tsx`
- Create: `apps/web/app/m/[token]/memories/page.tsx`

**Interfaces:**
- Consumes: `PhotoMemory`, `findPublicMemorial`, `listPhotoMemories` (Task 6); visitor helpers (Task 5); copy (Task 9); `POST /api/m/[token]/tributes` (Task 7).
- Produces: `MemoriesEntryLink({ token, locale })` for TASK-019 to render on S-030.

- [ ] **Step 1: Styles** (`memories.module.css`)

```css
.feed {
  height: 100dvh;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  overscroll-behavior-y: contain;
  background: #000;
  color: #fff;
}

.slide {
  position: relative;
  height: 100dvh;
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  scroll-snap-align: start;
  scroll-snap-stop: always;
}

.photo {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.back {
  position: fixed;
  top: max(0.75rem, env(safe-area-inset-top));
  left: 0.75rem;
  z-index: 1;
  min-width: 44px;
  min-height: 44px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: rgb(0 0 0 / 0.45);
  color: #fff;
  font-size: 1.25rem;
  text-decoration: none;
}

.position {
  position: absolute;
  top: max(1rem, env(safe-area-inset-top));
  right: 1rem;
  margin: 0;
  font-size: 0.875rem;
  opacity: 0.85;
}

.overlay {
  position: absolute;
  inset: auto 0 0 0;
  padding: 3rem 1rem max(1.25rem, env(safe-area-inset-bottom));
  background: linear-gradient(transparent, rgb(0 0 0 / 0.75));
}

.badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.2);
  font-size: 0.8125rem;
}

.byline {
  margin: 0.5rem 0 0;
  font-size: 1rem;
  font-weight: 700;
}

.text {
  margin: 0.25rem 0 0;
  font-size: 1rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tribute {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.heart {
  min-width: 48px;
  min-height: 48px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.15);
  color: #fff;
  cursor: pointer;
}

.heart[aria-pressed="true"] {
  color: #fda4af;
}

.count {
  font-size: 0.9375rem;
}

.empty {
  min-height: 100dvh;
  max-width: 480px;
  margin: 0 auto;
  padding: 1.5rem;
  display: grid;
  place-content: center;
  gap: 1rem;
  text-align: center;
}

.cta {
  display: inline-block;
  padding: 0.875rem 1.25rem;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font-weight: 700;
  text-decoration: none;
}
```

- [ ] **Step 2: Heart** (`tribute-button.tsx`)

```tsx
"use client";

import type { Locale } from "@gunita/core";
import { useState } from "react";

import { t, tributeCountLabel } from "./copy";
import styles from "./memories.module.css";

interface Props {
  token: string;
  contributionId: string;
  initialCount: number;
  initialHearted: boolean;
  locale: Locale;
}

// BR-081: optimistic toggle; the server's count wins; a failure reverts and says so.
export function TributeButton({ token, contributionId, initialCount, initialHearted, locale }: Props) {
  const [state, setState] = useState({ count: initialCount, hearted: initialHearted });
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function toggle() {
    const previous = state;
    const hearted = !state.hearted;
    setState({ count: Math.max(0, state.count + (hearted ? 1 : -1)), hearted });
    setPending(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/m/${token}/tributes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contributionId, hearted }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setState((await response.json()) as { count: number; hearted: boolean });
    } catch {
      setState(previous);
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.tribute}>
      <button
        type="button"
        className={styles.heart}
        aria-pressed={state.hearted}
        aria-label={t("heart", locale)}
        disabled={pending}
        onClick={toggle}
      >
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
          <path
            d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.4 5 7 5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.6 0 5.8 3.6 4.5 6.8C19.5 16.4 12 21 12 21z"
            fill={state.hearted ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <span className={styles.count} aria-live="polite">
        {failed ? t("sendFailed", locale) : tributeCountLabel(state.count, locale)}
      </span>
    </div>
  );
}
```

- [ ] **Step 3: Feed** (`memories-feed.tsx`, server component)

```tsx
import type { Locale } from "@gunita/core";
import Link from "next/link";

import type { PhotoMemory } from "@/src/memories/queries";

import { photoAlt, position, sharedBy, t } from "./copy";
import styles from "./memories.module.css";
import { TributeButton } from "./tribute-button";

interface Props {
  token: string;
  locale: Locale;
  featuredName: string | null;
  memories: PhotoMemory[];
}

// Sitemap S-033 (F-023): one approved visitor photo per screen. No comments, share, or ranking (ADR-007).
export function MemoriesFeed({ token, locale, featuredName, memories }: Props) {
  const back = (
    <Link href={`/m/${token}`} className={styles.back} aria-label={t("back", locale)}>
      ←
    </Link>
  );

  if (memories.length === 0) {
    return (
      <main className={styles.empty}>
        {back}
        <h1>{t("title", locale)}</h1>
        <p>{t("empty", locale)}</p>
        <Link href={`/m/${token}/share`} className={styles.cta}>
          {t("shareCta", locale)}
        </Link>
      </main>
    );
  }

  const title = featuredName ? `${t("title", locale)} · ${featuredName}` : t("title", locale);
  return (
    <main className={styles.feed} aria-label={title} tabIndex={0}>
      {back}
      {memories.map((memory, index) => (
        <section
          key={memory.id}
          className={styles.slide}
          aria-roledescription="slide"
          aria-label={position(index, memories.length)}
        >
          <img
            src={memory.photoUrl}
            alt={photoAlt(memory.displayName, locale)}
            className={styles.photo}
            loading={index === 0 ? "eager" : "lazy"}
            fetchPriority={index === 0 ? "high" : "auto"}
            decoding="async"
          />
          <p className={styles.position}>{position(index, memories.length)}</p>
          <div className={styles.overlay}>
            <span className={styles.badge}>{t("aboutThem", locale)}</span>
            <p className={styles.byline}>{sharedBy(memory.displayName, memory.relationship, locale)}</p>
            {memory.textContent && <p className={styles.text}>{memory.textContent}</p>}
            <TributeButton
              token={token}
              contributionId={memory.id}
              initialCount={memory.tributeCount}
              initialHearted={memory.hearted}
              locale={locale}
            />
          </div>
        </section>
      ))}
    </main>
  );
}
```

- [ ] **Step 4: Entry link** (`memories-entry-link.tsx`)

```tsx
import type { Locale } from "@gunita/core";
import Link from "next/link";

import { t } from "./copy";
import styles from "./memories.module.css";

// S-030 → S-033. TASK-019 renders this on the recap; never on S-032 (BR-080).
export function MemoriesEntryLink({ token, locale }: { token: string; locale: Locale }) {
  return (
    <Link href={`/m/${token}/memories`} className={styles.cta}>
      {t("entry", locale)}
    </Link>
  );
}
```

- [ ] **Step 5: Page** (`apps/web/app/m/[token]/memories/page.tsx`)

```tsx
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { MemoriesFeed } from "@/src/components/memories/memories-feed";
import { db } from "@/src/db";
import { findPublicMemorial, listPhotoMemories } from "@/src/memories/queries";
import { hashVisitorId, isVisitorId, VISITOR_COOKIE } from "@/src/memories/visitor";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PhotoMemoriesPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const memorial = await findPublicMemorial(db, token);
  // Renders S-034 once TASK-019 adds app/m/[token]/not-found.tsx; Next's 404 (noindex) until then.
  if (!memorial) notFound();

  const visitorId = (await cookies()).get(VISITOR_COOKIE)?.value;
  const memories = await listPhotoMemories(
    db,
    memorial.spaceId,
    isVisitorId(visitorId) ? hashVisitorId(visitorId) : null,
  );
  return (
    <MemoriesFeed
      token={token}
      locale={memorial.locale}
      featuredName={memorial.featuredName}
      memories={memories}
    />
  );
}
```

- [ ] **Step 6: Guardrail grep** (no share, no comments, no ranking slipped in)

Run:
```bash
rg -n "navigator\.share|<textarea|<input|orderBy\([^)]*tribute|desc\(" apps/web/src/components/memories apps/web/src/memories "apps/web/app/m/[token]/memories"
```
Expected: no output. (The pattern avoids the word "comment" on purpose: code comments legitimately say "No comments".)

- [ ] **Step 7: Typecheck + build**

Run: `pnpm --filter web typecheck && pnpm --filter web build`
Expected: exit 0; build lists `ƒ /m/[token]/memories`.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/memories "apps/web/app/m/[token]/memories/page.tsx"
git commit -m "feat(TASK-030): S-033 vertical photo memories with soft tribute heart"
```

---

### Task 11: Verify end to end and record evidence

**Files:**
- Modify: `docs/qa-test-plan.md` (status cells), `docs/implementation-plan.md` (hand evidence to Abu; Abu edits the ledger)

- [ ] **Step 1: Full gates**

```bash
pnpm typecheck && pnpm test && pnpm --filter web build
```
Expected: exit 0. Paste the Vitest summary lines (core + web) into the PR.

- [ ] **Step 2: Live DB check (only once `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `IP_HASH_SECRET` exist — TASK-022)**

Add to a local fixture copy (not committed until TASK-020 supplies real media) `"publishMemorial": true` and three approved photo contributions pointing at real public Blob URLs, then:

```bash
pnpm db:migrate
pnpm db:seed -- --reset            # prints /m/<token>/memories
pnpm --filter web dev
```

In another shell (TC-058), with `T=<token>` and `C=<an approved photo contribution id from psql>`:

```bash
curl -si -c jar -b jar -X POST localhost:3000/api/m/$T/tributes -H 'content-type: application/json' -d "{\"contributionId\":\"$C\",\"hearted\":true}"
# expect 200 {"count":1,"hearted":true} and Set-Cookie: gunita_visitor=...; HttpOnly
curl -s -c jar -b jar -X POST localhost:3000/api/m/$T/tributes -H 'content-type: application/json' -d "{\"contributionId\":\"$C\",\"hearted\":true}"
# expect {"count":1,"hearted":true}  (no double count, no new Set-Cookie)
curl -s -c jar -b jar -X POST localhost:3000/api/m/$T/tributes -H 'content-type: application/json' -d "{\"contributionId\":\"$C\",\"hearted\":false}"
# expect {"count":0,"hearted":false}
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/api/m/$T/tributes -H 'content-type: application/json' -d '{"contributionId":"nope","hearted":true}'
# expect 400
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/api/m/wrongtoken/tributes -H 'content-type: application/json' -d "{\"contributionId\":\"$C\",\"hearted\":true}"
# expect 404
psql "$DATABASE_URL" -c "select length(visitor_key_hash) from tribute limit 1"
# expect 64
```

Then set the space's `memorial_link_disabled = true` and confirm `/m/$T/memories` returns 404 (TC-057).

- [ ] **Step 3: Phone check (TC-059)** on iOS Safari and Android Chrome against the HTTPS preview/prod URL: entry from S-030 (once TASK-019 lands; otherwise open `/m/<token>/memories` directly), one photo per swipe, heart toggles and counts, zero shows nothing, no share/comment UI, back to S-030. Put device + browser + result in the TASK-030 PR description (`docs/phone-check-log.md` belongs to TASK-026; Kirby copies it there).

- [ ] **Step 4: Update QA status cells** for F-023 row: `todo` → `unit pass; integration + manual pending DB` (or `pass` once Steps 2–3 ran).

- [ ] **Step 5: Hand evidence to Abu** (PR comment): commands run, exit codes, Vitest counts, curl outputs, phone notes. Abu moves TASK-029/030 in the ledger.

---

## Self-review (done while writing)

- **Spec coverage:** approved-visitor-only filter (Task 6 `isPhotoMemory`), soft heart + count (Tasks 4–7, 9–10), zero hides count (Task 9), no ranking (Task 6 order + Task 10 grep), no comments/share (Task 10 grep, ADR-007), vertical snap scroll (Task 10 CSS), separate route (Task 10), S-032 has no link (PRD/QA text; nothing in Task 10 touches S-032), noindex (Task 10 page), S-034 on unavailable (Task 6 + page `notFound()`), fil/en (Task 9), demo data (Task 8), doc sync to feature (Task 1) and to repo (Task 2).
- **Placeholders:** none; the only runtime-dependent steps (DB, phone) name exactly what to run and what to expect, and are gated on TASK-022.
- **Type consistency:** `PhotoMemory` fields match between Task 6, Task 10 feed, and the heart props; `setTribute` returns `number | null` and the route checks `== null`; the API response `{ count, hearted }` is what `TributeButton` reads; cookie name `gunita_visitor` is identical in route, page, docs, and QA.
