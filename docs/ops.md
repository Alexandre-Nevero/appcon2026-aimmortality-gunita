# OPS — Operations & Observability Runbook — GUNITA

> **Status:** Draft v0.2 · **Date:** 2026-09-23 · **Owner:** Alex
> **Scope:** keep the demo running on Sep 24 and give a clear path if GUNITA outlives the
> hackathon. Architecture lives in [System Design](system-design.md); provider decisions in
> [ADR-002](adr/ADR-002-free-tier-stack.md); platform in [ADR-004](adr/ADR-004-single-web-app.md).
> Commands marked **[verify]** must be confirmed at scaffold time.

## Deploy

| Part | How it ships | Rollback |
|---|---|---|
| Web (`apps/web`) | Vercel Git integration: push to `main` → production; every PR → preview URL | Vercel dashboard: promote the previous production deployment (Instant Rollback) **[verify on Hobby]** |
| Database schema | `pnpm --filter web db:migrate` (drizzle-kit) against the target Neon branch **before** the deploy that needs it | Neon restore to a point in the last 6 hours (free plan), or reseed |
| Seed (fictional family) | `pnpm --filter web db:seed` (idempotent); `--reset` wipes the space first | rerun seed |

Family UI, API, and memorial pages are the **same** Vercel deployment. No Expo / EAS.

**Versions:** pinned in the lockfile; current picks are listed in System Design → Stack currency.
Vercel Node runtime must be ≥ 22 (AI SDK 7).

## Configuration & secrets

Secrets live in Vercel project settings (Production and Preview) and in local `.env.local` files
that are git-ignored. Never commit values; the repo is public.

| Name | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | Vercel, local | Neon pooled connection (serverless driver) |
| `DATABASE_URL_UNPOOLED` | local, CI | migrations |
| `DATABASE_URL_TEST` | CI secret | integration tests on the Neon `test` branch |
| `BLOB_READ_WRITE_TOKEN` | Vercel, local | Vercel Blob |
| `GROQ_API_KEY` | Vercel, local, CI (eval only) | transcription + text |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Vercel, local, CI (eval only) | embeddings, vision, fallback |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | Vercel, local | sessions |
| `IP_HASH_SECRET` | Vercel | salt for visitor rate limiting (Methods EQ-010) |
| `PUBLIC_WEB_URL` / `NEXT_PUBLIC_APP_URL` | Vercel | base URL for QR codes and client links |
| `MODEL_TRANSCRIBE`, `MODEL_TEXT`, `MODEL_TEXT_FALLBACK`, `MODEL_VISION`, `MODEL_EMBED` | Vercel, local | provider model IDs (swap without code changes) |
| `ASK_TAU`, `ASK_TOP_K` | Vercel, local | abstention threshold and candidate count (Methods EQ-002) |

**Rotation:** regenerate the key in the provider console → update Vercel env → redeploy. If a key
ever lands in git history, rotate it immediately; deleting the commit is not enough on a public
repo.

## Observability

Vercel Hobby keeps runtime logs for only 1 hour, so GUNITA records what matters in its own tables:

- **`ai_call`**: purpose (transcribe / extract / vision / hints / ask / caption / embed), model,
  latency, tokens, ok/error code. No prompt or transcript content.
- **`event`**: the product events in [User Flow §6](user-flow.md).
- **Source status**: `uploaded → processing step → ready | failed(step, reason)`.
- **`GET /api/health`**: DB reachable, Blob token present, provider keys present, current mode of
  the demo space. `?deep=1` also makes one cheap call per provider.

**Signals that matter (demo SLIs):**

| Signal | Source | Healthy |
|---|---|---|
| Ask errors (not abstentions) | `ai_call` purpose=ask, ok=false | 0 in rehearsal |
| Processing failures | sources with `failed` | 0 unresolved before demo |
| Ask latency | `ai_call` latency | target is an open NFR; record p50/p95 in rehearsal |
| Public page errors | Vercel logs during rehearsal | 0 |
| Free-tier headroom | provider and Neon/Blob dashboards | see thresholds below |

## Alerts & thresholds

No automated paging on free tiers. Instead, a **pre-demo check** (run 60 and 15 minutes before
judging):

| Check | Threshold to act |
|---|---|
| `GET /api/health?deep=1` | anything not ok |
| Neon usage (CU-hours this month; storage) | > 80 CU-h or > 400 MB |
| Blob usage | > 800 MB storage or > 8 GB transfer |
| Groq usage today | near 1,000 requests on gpt-oss-120b |
| Gemini usage today | near 1,000 requests on Flash-Lite |
| Demo space state | Memorial Mode matches the script step; recap published; QR enabled |
| Production URL on iOS Safari + Android Chrome | sign-in, Home, record on S-007, `/m/:token` loads |

## Runbook — common incidents

| Symptom | Diagnosis | Fix |
|---|---|---|
| Ask answers slowly or says "couldn't answer right now" | Groq 429 (8K tokens/min) and/or Gemini 429 in `ai_call` | Wait 60 s; fallback should already engage; for the live demo, ask the rehearsed question first |
| Source stuck or `failed(transcribe)` | Groq STT error or unsupported format | Tap Retry; check format (webm/mp4/m4a/mp3/wav); re-record shorter |
| Mic permission denied / no recording | Not HTTPS, or user denied permission | Open production HTTPS URL; re-prompt; test MediaRecorder fallback format |
| `failed(vision)` on a photo | Gemini 429 or content filter | Retry after a minute; if blocked, use another photo |
| First request after idle is slow | Neon scaled to zero (5 min idle) | Expected; hit `/api/health` a minute before the demo |
| Every DB call fails | Neon free quota exhausted → compute suspended | Create a new Neon project on the free plan, point `DATABASE_URL` at it, migrate, seed |
| Uploads fail with 413 | File over 4 MB | Compress or shorten; confirm client-side limits |
| Uploads fail with Blob errors | Blob Hobby limit reached | Delete test uploads; reseed with compressed media |
| QR shows "Memorial unavailable" | QR disabled, recap unpublished, or wrong domain in `PUBLIC_WEB_URL` | Check S-023; republish; fix env and redeploy |
| Phone can't load the site | Deploy down or wrong URL | Confirm Vercel production; Instant Rollback if needed |
| A wrong fact appears in an answer | An item was confirmed incorrectly | Correct or reject the item (S-013); rerun that question; log it for the eval set |
| Production deploy broke something | Bad commit | Instant Rollback to the previous deployment; fix forward on a branch |
| Sign-in fails for everyone | `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` mismatch after a domain change | Fix env; redeploy |

**Demo reset:** `pnpm --filter web db:seed --reset` returns the fictional family to the script's
starting state (During mode, known items, no visitor contributions).

## Backup & recovery

| What | How | Restore |
|---|---|---|
| Fictional demo data and media | Committed in `seed/` (public, MIT, BR-040) | `db:seed --reset` re-uploads media to Blob |
| Database | Neon free plan: 6-hour instant restore window; take the 1 allowed manual snapshot right after final seeding on Sep 24 | Neon console restore |
| Code | Public GitHub repo | redeploy any commit on Vercel |
| Visitor contributions made during judging | Only in production DB | Covered by the snapshot window; not otherwise backed up in the MVP |

**Tested restore:** run `db:seed --reset` on a preview branch once before the demo and confirm the
golden path still works (QA TC-080).

## If GUNITA outlives the hackathon

- Move off free tiers that may use data for training (ADR-002), switch Blob to a private store with
  an authorized media route, and add scheduled Neon snapshots.
- Define memorial retention and export before any real family uses it (BRD risks).
- Replace `after()` background work with a durable queue if processing volume grows.
- Add automated alerting (provider errors, quota headroom, public page 5xx).
