# GUNITA — Agent Guide

## Project overview
GUNITA is a consent-based family memory archive for Filipino families. While a loved one is alive,
the family captures stories, voice, recipes, and artifact context. After death, the steward activates
Memorial Mode so lamay visitors can open a QR memorial and share memories. AI organizes, searches,
and answers only from reviewed family sources — otherwise it says **Hindi pa alam**.

## For teammates (30-second orientation)
You only need `/docs` and this file — **not** any `fmd/` factory folder (owner-local; do not commit it).
- Soft **`F-###`** labels link features ↔ PRD ↔ tests.
- **Decision audit root = only [`docs/adr/`](./docs/adr/).** Newest Accepted ADR wins over stale
  narrative until reconciled. Chat is not a record.
- Platform: **single mobile-first Next.js web app** ([ADR-004](./docs/adr/ADR-004-single-web-app.md)).
  No Expo / native apps.
- UI language: **`fil` (Filipino, Taglish-friendly) or `en`** ([ADR-005](./docs/adr/ADR-005-ui-language.md)).

## Docs navigation (cheap — do this every task)

1. **[`docs/index.md`](./docs/index.md) §0** — which *one* doc owns the concern you are about to change.
2. **Open only that owner** (+ its direct dependsOn if you must edit links). Stop.
3. **If the question is “why did we choose X?”** → read **[`docs/adr/`](./docs/adr/)** newest-first.
4. Skip pitch/GTM/onboarding unless your task is literally those surfaces.

| Need | Open |
|------|------|
| What we build | [PRD](./docs/prd.md) |
| How it’s built | [System Design](./docs/system-design.md) |
| Screens / flows | [Sitemap](./docs/sitemap.md) / [User Flow](./docs/user-flow.md) |
| Tests | [QA](./docs/qa-test-plan.md) |
| Numbers / thresholds | [Methods](./docs/methods.md) |
| Deploy / secrets names | [Ops](./docs/ops.md) |
| **Why / pivots / audit** | **[`docs/adr/`](./docs/adr/) only** |

## Writing ADRs (every agent)

**When:** product, architecture, security, or live-plan intent changed — or a future reader would ask
“why this way?”

**How:**
1. Add `docs/adr/ADR-NNN-short-slug.md`. One decision per file; never reuse `NNN`.
2. Fill Context, Why now, Options (≥2), Decision, Why this option, Overrides, Consequences.
3. **Never edit** an old Accepted ADR — supersede with a new one that cites the old id.
4. Newest Accepted ADR wins until you reconcile the owning doc (`index.md` §0 home).

## Architecture
One Next.js 16 App Router app on Vercel: family/steward UI + API + public `/m/[token]` memorial.
Shared rules in `packages/core`. Neon + pgvector, Vercel Blob, Groq (STT + text), Gemini
(embeddings + vision + fallback). Better Auth cookie sessions.
See [System Design](./docs/system-design.md).

## Build & run
```
pnpm install
pnpm --filter web dev
```
(Exact scripts land at scaffold; verify then.)

## Test
```
pnpm typecheck
pnpm test
pnpm test:e2e
```
All changes must pass tests before they're considered done. Manual phone checks: TC-081 (record),
TC-080 (golden path).

## Living plan
Read [`docs/implementation-plan.md`](./docs/implementation-plan.md) before coding.

- Claim one `ready` `TASK-###`. Branch `task/TASK-###-short-slug`.
- Stay inside that task’s write scope. **No cross-task Depends-on** — use fixtures until APIs land.
- Abu is Build Keeper: open a draft PR early; give Abu gate evidence; do **not** edit the ledger yourself.
- On a decision/pivot: append an ADR under `docs/adr/`.
- Optional advisory: `python3 tools/check-implementation-plan.py docs/implementation-plan.md`

## Code style & conventions
- Language / runtime: TypeScript, Node ≥ 22, Next.js 16 App Router
- Formatting: project formatter when present
- Naming: soft IDs (`F-###`, `S-###`, `BR-###`, `TC-###`, `EQ-###`) stay stable
- UI: mobile-first ~375px; both `fil` and `en` strings for every user-visible label (BR-014)
- Audio: tap-to-play only; MediaRecorder with format fallbacks; HTTPS required for mic
- Avoid: speaking *as* the featured person; inventing facts; health prompts; native/Expo apps;
  engagement nudges (BR-080); logging prompts/transcripts

## Stack currency (verify before coding — overrides training memory)
Confirm pinned library versions in System Design → Stack currency and official docs before emitting
framework APIs. If unverified, say so.

| ❌ Stale / from memory | ✅ Current (this project) | Why |
|------------------------|---------------------------|-----|
| Expo family app + Next memorial | Single Next.js web app | ADR-004 |
| Edge runtime required for streaming | Node.js on Fluid Compute | Vercel current guidance |
| AI SDK 6 patterns | AI SDK 7 (`Output.object`, Node ≥ 22) | System Design stack table |
| Vercel Postgres / KV | Neon + Blob via Marketplace/free tiers | ADR-002 |

## Ask before changing
- Business rules in `docs/prd.md` (especially BR-001–BR-080, F-022)
- Ask abstention threshold τ / top-k (Methods EQ-001/EQ-002) — needs an ADR
- Provider model IDs and free-tier assumptions (ADR-002)
- Secrets / `.env*` — never commit
- Kalusugan / health features — cut

## Definition of done
- Build passes, tests pass; phone checks for recording/memorial when relevant.
- Code ties to an `F-###` when applicable; update the **owning** doc when intended behavior changed.
- Real decision/pivot → new file under **`docs/adr/`**.
- Framework APIs verified against pinned docs.
- No secrets committed; visibility enforced in SQL (BR-033); Ask cites reviewed sources only.
- New UI copy has `fil` and `en`.

## Build agents
Roster: [docs/sad.md](./docs/sad.md) → `.claude/agents/` (`guardrail-reviewer`, `ai-pipeline-engineer`,
`web-api-builder`, `ui-screen-builder`, `test-runner`).

## References
- [Docs index](./docs/index.md) — §0 ownership map
- [ADRs](./docs/adr/) — **sole decision audit root**
- [PRD](./docs/prd.md) · [System Design](./docs/system-design.md) · [QA](./docs/qa-test-plan.md)
