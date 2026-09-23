# Implementation Plan — GUNITA (AppCon 2026)

> **Purpose:** living bridge from specs to code **and** current build state. Product intent stays in
> [PRD](prd.md); architecture in [System Design](system-design.md); tests in [QA](qa-test-plan.md);
> decisions in [`docs/adr/`](adr/). Soft IDs: `TASK-###`, `F-###`, `TC-###`, `S-###`.
>
> **Markdown only** — no GitHub Issues projection required.

**Plan steward / Build Keeper:** Abu (product manager)
**Last checkpoint:** 2026-09-23T17:40:00+08:00 · plan created (greenfield)
**Deadline / demo cutoff:** 2026-09-24 ~18:00 (confirm on Team Portal)
**Current stopping point:** docs + ADRs only — no runnable app yet

---

## 0. Anti-block protocol (read first)

**Goal:** nobody waits on a teammate’s unfinished task. The ledger uses `Depends on: —` for every
task. Coordination is by **write-scope ownership** + **frozen contracts**, not a dependency DAG.

| Rule | How |
|---|---|
| One owner per task | Claim only your row; do not edit another owner’s write scope |
| Contract-first | Code against §0.1 route + type contracts immediately; use fixtures/mocks until the real API lands |
| Seed-first demo | Golden path can run on `seed/` data before live capture works (PRD §13) |
| Soft land only | Kirby lands TASK-001 within the first hour so folders exist; others may draft on branches against contracts before that and rebase once |
| Merge order ≠ blocked | §5 “Integration order” is advisory for Abu when merging PRs — it is **not** a task dependency |
| Conflict | Same file needed by two people → Abu splits the file or assigns a 15-min pairing window; never idle |

### 0.1 Frozen contracts (hour 0 — everyone codes against these)

**Routes (path + method).** Request/response bodies use Zod in `packages/core` (Shi owns schemas).

| Method | Path | Owner to implement | Used by UI |
|---|---|---|---|
| POST | `/api/auth/*` (Better Auth) | Kirby | Josh S-001/S-002 |
| POST | `/api/spaces` | Kirby | Josh S-003 |
| POST | `/api/spaces/:id/consent` | Kirby | Josh S-004 |
| POST | `/api/spaces/:id/invites` | Kirby | Josh S-018 |
| POST | `/api/spaces/:id/sources` | Shi | Josh S-007/S-009/S-017 |
| GET | `/api/sources/:id` | Shi | Josh S-010 |
| POST | `/api/sources/:id/retry` | Shi | Josh S-010 |
| GET | `/api/spaces/:id/items?…` | Shi | Josh S-011/S-012 |
| PATCH | `/api/items/:id/review` | Shi | Josh S-013 |
| PATCH | `/api/items/:id/visibility` | Shi | Josh S-105 |
| DELETE | `/api/sources/:id` | Shi | Josh S-102 |
| GET | `/api/spaces/:id/search?q=` | Shi | Josh S-015 |
| POST | `/api/spaces/:id/ask` | Kirby | Josh S-016 |
| GET/PATCH | `/api/spaces/:id/questions` | Shi | Josh S-008 |
| POST | `/api/spaces/:id/memorial/activate` | Kirby | Josh S-020 |
| POST | `/api/spaces/:id/memorial/publish` | Kirby | Josh S-022 |
| GET | `/api/spaces/:id/memorial/qr` | Kirby | Josh S-023 |
| GET/POST | `/api/spaces/:id/contributions` (moderation) | Kirby | Josh S-024 |
| GET | `/m/[token]` (RSC page) | Josh UI + Kirby loader data | visitors |
| POST | `/api/m/:token/contributions` | Kirby | Josh S-031 |
| GET | `/api/health` | Kirby | Ops |

**Enums / labels (packages/core):** `visibility`, `review_state`, `origin` (from_them/about_them),
`item_type`, `recipe_step_kind`, ask `outcome`, UI `locale` (`fil`\|`en`). Badge copy keys stay
stable so Josh and Gian do not rename them mid-build.

**Fixture mode:** Josh may ship screens against `apps/web/src/mocks/fixtures.ts` (seed-shaped JSON).
Replace fixture imports with real `fetch` when the matching API returns 200 — no rewrite of layout.

**Audio:** MediaRecorder + `MediaRecorder.isTypeSupported` for `audio/webm` then `audio/mp4`
(System Design; MDN). Cap 4 MB. Tap-to-play only.

---

## 1. Planning inputs

- **Current code state:** greenfield (docs only)
- **Team capacity (roles):**

| Person | Role | Owns in this plan |
|---|---|---|
| **Kirby** | Fullstack | Scaffold, auth, Ask, memorial server, MediaRecorder, deploy, golden-path glue |
| **Josh** | UI/UX | All screens/components, memorial visitor UI, fil/en wiring in UI |
| **Shi** | Backend/Data | Schema, seed, `packages/core` rules, processing pipeline, search/retrieval data path |
| **Gian** | Product design | Visual direction, tokens, fil/en copy pack, memorial storyboard, pitch deck |
| **Abu** | Product manager | Keeper, cut line, demo script, seed narrative approval, submission, open-question calls |

- **Core demo journey:** PRD §13 golden path (UF-003 → UF-002 → UF-004 → UF-005 → UF-008 → UF-009 → UF-010)
- **Highest risks:** browser mic on iOS Safari; Groq 8K tokens/min; Taglish STT; visibility leaks; τ calibration; public Blob URLs (ADR-002)
- **Required quality commands:** `pnpm typecheck && pnpm test` · full: `pnpm typecheck && pnpm test && pnpm test:e2e && pnpm eval`
- **Browser E2E:** Playwright on `/m/[token]` (TC-045, TC-050, TC-053); recording = manual TC-081

---

## 2. How this plan scales

1. Seed-backed golden path before live capture perfection.
2. Shared foundation = TASK-001 folders + §0.1 contracts only — no waiting for full backends.
3. One task → one owner → one write scope → one gate.
4. **No cross-task `Depends on`.** Parallelism comes from disjoint write scopes (§3).
5. Abu is Build Keeper; contributors submit evidence, do not edit ledger rows.
6. Cut line (§5) before polish. Never delete task history — mark `cut`.

---

## 3. Task ledger (single source of execution status)

Allowed status: `ready | in_progress | blocked | in_review | done | cut`.
`Work ref` is `—` until claimed (`task/TASK-###-slug` or PR URL).
`Gate / evidence` names `TC-###` + command; `in_review`/`done` need observed evidence.

| ID | Outcome / trace | Depends on | Owner | Write scope | Work ref | Status | Gate / evidence |
|----|-----------------|------------|-------|-------------|----------|--------|-----------------|
| TASK-001 | Runnable monorepo skeleton; Next 16 app + `packages/core` stub; env sample; infra | — | Kirby | `package.json`, `pnpm-workspace.yaml`, `apps/web/**` (scaffold only), `packages/core/package.json`, `.gitignore`, `README.md` (setup stub) | — | ready | infra · `pnpm install && pnpm --filter web build` |
| TASK-002 | Drizzle schema + migrations + seed loader; write `docs/data-model.md`; F-001 entities | — | Shi | `apps/web/src/db/**`, `apps/web/drizzle/**`, `seed/**` (loader), `docs/data-model.md` | — | ready | infra · `pnpm --filter web db:migrate` |
| TASK-003 | Core pure rules + Zod enums; visibility/review/citation/first-person; F-009,F-015,F-022 | — | Shi | `packages/core/src/**` | — | ready | TC-012,TC-020,TC-022,TC-030,TC-033 · `pnpm --filter core test` |
| TASK-004 | fil/en copy pack + CSS tokens + badge visual spec; BR-014; docs | — | Gian | `content/i18n/**`, `content/design-tokens.css`, `docs/pitch/visual-direction.md` | — | ready | docs · `test -f content/i18n/fil.json && test -f content/i18n/en.json` |
| TASK-005 | Demo script + fictional family narrative + eval question list; BR-040; docs | — | Abu | `docs/demo-script.md`, `eval/cases.json` (content), `seed/README.md` | — | ready | docs · `test -f docs/demo-script.md && test -f eval/cases.json` |
| TASK-006 | Better Auth + space create + invite + consent APIs; F-001,F-002 | — | Kirby | `apps/web/src/auth/**`, `apps/web/app/api/auth/**`, `apps/web/app/api/spaces/**` (create/consent/invites only) | — | ready | TC-001–TC-005 · `pnpm --filter web test` |
| TASK-007 | App shell, tabs, auth/onboarding screens, i18n provider; S-001–S-005,S-018,S-019; F-001 | — | Josh | `apps/web/app/(auth)/**`, `apps/web/app/onboarding/**`, `apps/web/app/(app)/layout.tsx`, `apps/web/app/(app)/home/**`, `apps/web/app/(app)/family/**`, `apps/web/app/(app)/settings/**`, `apps/web/src/components/shell/**`, `apps/web/src/i18n/**` | — | ready | test · `pnpm --filter web typecheck` |
| TASK-008 | Source upload API + Blob + processing pipeline (STT/vision/extract/hints); F-003–F-007,F-014 | — | Shi | `apps/web/src/ai/**`, `apps/web/src/media/**`, `apps/web/app/api/spaces/[id]/sources/**`, `apps/web/app/api/sources/**` | — | ready | TC-010,TC-011,TC-016 · `pnpm --filter web test` |
| TASK-009 | MediaRecorder helper (MIME fallback, 4 MB, tap-play); F-003 | — | Kirby | `apps/web/src/recording/**` | — | ready | TC-081 · `pnpm --filter web test` |
| TASK-010 | Capture / interview / artifact / source-detail UI; S-006–S-010,S-017; F-003,F-004 | — | Josh | `apps/web/app/(app)/capture/**`, `apps/web/src/components/capture/**` | — | ready | TC-018 · `pnpm --filter web typecheck` |
| TASK-011 | Review + visibility + embed-on-confirm APIs; F-008,F-009,F-021 | — | Shi | `apps/web/src/access/**`, `apps/web/app/api/items/**`, `apps/web/app/api/spaces/[id]/items/**` | — | ready | TC-020,TC-022,TC-023,TC-055 · `pnpm --filter web test` |
| TASK-012 | Review queue + archive + item/person detail UI; S-011–S-014; F-008,F-010 | — | Josh | `apps/web/app/(app)/archive/**`, `apps/web/app/(app)/review/**`, `apps/web/src/components/archive/**`, `apps/web/src/components/badges/**` | — | ready | TC-021,TC-024 · `pnpm --filter web typecheck` |
| TASK-013 | Ask GUNITA API (retrieve → τ → generate → validate → abstain); F-012,F-013,F-022 | — | Kirby | `apps/web/src/ask/**`, `apps/web/app/api/spaces/[id]/ask/**` | — | ready | TC-030–TC-037 · `pnpm --filter web test` |
| TASK-014 | Ask UI + evidence sheet; S-016,S-104; F-012,F-013 | — | Josh | `apps/web/app/(app)/ask/**`, `apps/web/src/components/ask/**` | — | ready | test · `pnpm --filter web typecheck` |
| TASK-015 | Search + question-queue APIs; F-011,F-014 | — | Shi | `apps/web/app/api/spaces/[id]/search/**`, `apps/web/app/api/spaces/[id]/questions/**` | — | ready | TC-019,TC-026 · `pnpm --filter web test` |
| TASK-016 | Search results + question queue UI; S-008,S-015; F-011,F-014 | — | Josh | `apps/web/app/(app)/questions/**`, `apps/web/app/(app)/search/**` | — | ready | test · `pnpm --filter web typecheck` |
| TASK-017 | Memorial server: activate, select, publish snapshot, QR, contribute, moderate; F-016–F-020 | — | Kirby | `apps/web/src/memorial/**`, `apps/web/app/api/spaces/[id]/memorial/**`, `apps/web/app/api/m/**` | — | ready | TC-040–TC-045,TC-050–TC-054 · `pnpm --filter web test` |
| TASK-018 | Steward memorial UI; S-020–S-024,S-101; F-016,F-017 | — | Josh | `apps/web/app/(app)/memorial/**`, `apps/web/src/components/memorial/**` | — | ready | test · `pnpm --filter web typecheck` |
| TASK-019 | Public memorial pages; S-030–S-034,S-031 voice; F-017–F-019 | — | Josh | `apps/web/app/m/**`, `apps/web/src/components/public-memorial/**` | — | ready | TC-045,TC-050 · `pnpm test:e2e` |
| TASK-020 | Seed data filled (media + reviewed items + published recap option); BR-040; infra | — | Shi | `seed/data/**`, `seed/media/**` | — | ready | infra · `pnpm --filter web db:seed` |
| TASK-021 | Eval runner + guardrail script; F-022; EQ-012 | — | Kirby | `eval/run.ts`, `apps/web/scripts/check-guardrails.ts` | — | ready | TC-060 · `pnpm eval` |
| TASK-022 | Vercel prod + Neon + Blob + secrets + health; infra | — | Kirby | `vercel.ts`, `apps/web/app/api/health/**`, `docs/ops.md` | — | ready | infra · `curl -sf "$PUBLIC_WEB_URL/api/health"` |
| TASK-023 | Pitch deck 5–10 slides + memorial storyboard; docs | — | Gian | `docs/pitch/**` | — | ready | docs · `test -d docs/pitch && ls docs/pitch/*` |
| TASK-024 | Golden-path rehearsal on production twice; TC-080; test | — | Abu | `docs/rehearsal-log.md`, `docs/run-evidence.jsonl` | — | ready | TC-080 · `grep -q 'PASS' docs/rehearsal-log.md` |
| TASK-025 | Submission pack: LICENSE, README final, provider substitutes; docs | — | Abu | `LICENSE`, `README.md`, `docs/submission-checklist.md` | — | ready | TC-083 · `test -f LICENSE && test -f README.md` |
| TASK-026 | Phone mic + visitor voice notes on real devices; TC-081,TC-082; test | — | Kirby | `docs/phone-check-log.md` | — | ready | TC-081,TC-082 · `grep -q 'TC-081' docs/phone-check-log.md` |
| TASK-027 | UI polish: empty states, elder type scale, motion budget; F-010 | — | Josh | `apps/web/src/styles/**` | — | ready | test · `pnpm --filter web typecheck` |
| TASK-028 | τ calibration ADR + Methods update; EQ-001/EQ-002; docs | — | Abu | `docs/adr/ADR-006-ask-tau.md`, `docs/methods.md` | — | ready | docs · `test -f docs/adr/ADR-006-ask-tau.md` |

## 4. Run evidence and closure

Append facts to `docs/run-evidence.jsonl` when useful:

```bash
python3 tools/record-run-event.py --type run_started --source plan --evidence-ref docs/implementation-plan.md
```

Unknowns stay `unknown`. Keeper records `run_closed` after submission.

Advisory plan check:

```bash
python3 tools/check-implementation-plan.py docs/implementation-plan.md
```

---

## 5. Current execution view

- **Ready now:** TASK-001 … TASK-028 (all `Depends on: —`)
- **Safe parallel set (start immediately):**
  - Kirby → TASK-001 (first), then TASK-006 / TASK-009 in any order
  - Shi → TASK-002 + TASK-003 (branch; rebase after TASK-001 folder exists)
  - Gian → TASK-004 + TASK-023
  - Josh → draft UI against fixtures after TASK-001; claim TASK-007
  - Abu → TASK-005 + keep ledger
- **Blocked:** none by task dependency. Only soft wait: empty repo until Kirby pushes TASK-001 (~1 h).
- **Integration order (Abu merge preference, not blockers):**
  1. TASK-001 → 002 → 003 → 006 → 020
  2. 008 → 011 → 013 → 015 → 017
  3. 007 → 010 → 012 → 014 → 018 → 019
  4. 021 → 022 → 024 → 026 → 025
  5. 004/023 anytime; 027 last / cut; 028 after first eval
- **Cut line (drop first if time shrinks):** TASK-027 polish → TASK-016 search UI niceties → live capture perfection (keep seed path) → TASK-023 visual extras beyond required slides. **Never cut:** §13 golden path, Ask abstention, memorial QR, TC-080, submission (TASK-025).

---

## 6. Checkpoint transaction

Run when a task is claimed / reviewed / merged / cut, a pivot is accepted, or before demo.

1. Observe branch/PR/tests/docs — not chat.
2. Abu updates the ledger from proven facts.
3. Reconcile by owner: behavior → PRD; architecture → system design; tests → QA; decisions → ADR.
4. Recompute §5.
5. `in_review` / `done` only with gate evidence on current base.
6. Optional: `python3 tools/check-implementation-plan.py docs/implementation-plan.md`

---

## 7. Team branch, PR, and conflict protocol

1. Claim one `ready` task. Branch `task/TASK-###-short-slug`.
2. Stay inside write scope. If you need another scope, ask Abu — do not expand silently.
3. Open a small draft PR early: `TASK-###`, `F-###`, docs impact (`none` ok).
4. Done → ping Abu with PR + gate evidence. Do not edit the ledger yourself.
5. Rebase on `main`; resolve conflicts by talking. After three failed attempts, escalate to Abu.
6. Abu sets `done` after merge + gate on current base.

**Fixture handshake:** Josh’s PR may merge with fixtures. Follow-up PR (same owner or Kirby) swaps
`fixtures` → live API without redesigning screens.

---

## 8. Swimlanes (who works in parallel)

```
Hour 0-1     Kirby: TASK-001 scaffold ─────────────────────────────────┐
Abu: TASK-005 demo script · Gian: TASK-004 copy/tokens · Shi: TASK-002/003 on branch
             └──────────────────────────────────────────────────────────┘
Hours 1-8    Kirby: 006 auth, 009 recorder     Shi: 008 pipeline, 011 review
             Josh: 007 shell → 010 capture     Gian: 023 pitch
Hours 8-16   Kirby: 013 Ask, 017 memorial API  Shi: 015 search, 020 seed fill
             Josh: 012 archive, 014 Ask UI, 018 steward memorial
Hours 16-22  Josh: 019 public /m               Kirby: 021 eval, 022 deploy
             Abu: 024 rehearsal                Gian: pitch final
Hours 22-25  Abu: 025 submit · Kirby: 026 phones · cut 027 if needed · 028 τ ADR
```

---

## 9. Plan change log (append-only)

| Timestamp / event | Tasks changed | Why / evidence | Canonical docs reconciled |
|-------------------|---------------|----------------|---------------------------|
| 2026-09-23T17:40:00+08:00 · kickoff | TASK-001…TASK-028 created | Parallel no-DAG plan for AppCon; roles Kirby/Josh/Shi/Gian/Abu | PRD §13 · system design · QA · ADR-004/005 |
