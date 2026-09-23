# System Design (HLD) — GUNITA

> **Purpose:** how GUNITA is built. High-level; the data-model doc (not yet generated) will own
> column-level schema.
> **Status:** Draft v0.2 · **Date:** 2026-09-23 · **Owner:** Alex
> **Traces back to:** [PRD](prd.md), [ADR-004](adr/ADR-004-single-web-app.md),
> [ADR-002](adr/ADR-002-free-tier-stack.md), [ADR-005](adr/ADR-005-ui-language.md).
> **Traces forward to:** data model, [QA](qa-test-plan.md), [Methods](methods.md), [Ops](ops.md),
> [SAD](sad.md).

Screens and routes are owned by the [Sitemap](sitemap.md); journeys by the [User Flow](user-flow.md).
Numbers and thresholds the system computes are owned by [Methods](methods.md) (`EQ-###`).

---

## Context diagram

```
                   ┌───────────────────────────── GUNITA ─────────────────────────────┐
  Steward ─────┐   │                                                                   │
  Family ──────┼──▶│  Next.js 16 App Router on Vercel                                  │
  (phone       │   │    ├─ Family UI (mobile-first)                                    │
   browser)    │   │    ├─ API route handlers                                          │
               │   │    ├─ Public memorial pages                                       │
  Visitor ─────┼──▶│    └─ Server modules                                              │
  Judge  ──────┘   │           │   │   │   │                                           │
                   └───────────┼───┼───┼───┼───────────────────────────────────────────┘
                               ▼   ▼   ▼   ▼
              Neon Postgres  Vercel  Groq   Gemini
              (+pgvector)    Blob    (STT,  (embeddings,
                                     text)  vision/PDF,
                                            fallback text)
```

The featured loved one has no account. They take part on the steward's phone browser (PRD Personas).

---

## Components & responsibilities

| Component | Responsibility | Owns | Depends on | Implements |
|---|---|---|---|---|
| **Web app** (`apps/web`, Next.js 16 App Router) | Family/steward UI, API, public memorial pages, background processing | All server logic + UI | Neon, Blob, Groq, Gemini; `packages/core` | all F-001–F-022 |
| **Core package** (`packages/core`) | Shared Zod schemas, enums, label text (fil/en), and pure rules: visibility check, review transitions, citation validation, quote check, first-person guard | Business-rule logic | none | BR-014, BR-020–BR-037, F-015 |
| **Auth module** | Better Auth: email + password cookie sessions; memberships and roles (`steward`, `family`) | Users, sessions, memberships | Neon | F-001 |
| **Access module** | One function decides what a viewer may see; every query goes through it | Visibility filter (BR-030–BR-033) | core rules | F-009 |
| **Media module** | Validate uploads (type, size), store in Blob, return URLs only to allowed viewers | Blob pathnames | Vercel Blob | F-003, F-007 |
| **Processing pipeline** | Transcribe, extract items, read photos/documents, generate hints; state machine per source | Source status, items, hints | Groq, Gemini | F-004–F-007, F-014 |
| **Retrieval module** | Embed reviewed items; vector search filtered by space, review state, and visibility | Embeddings | Gemini, pgvector | F-011, F-012 |
| **Answer module** | Ask GUNITA: retrieve → abstain or generate → validate citations/quotes/pronouns → respond | Answer records | Groq (fallback Gemini), retrieval, core rules | F-012, F-013, F-022 |
| **Memorial module** | Memorial Mode, selection, recap drafting, publish snapshot, QR, public page, contributions, moderation | Memorial token, recap snapshot, contributions | Groq (captions), Blob, `qrcode` | F-016–F-020 |
| **i18n / copy** | `fil` and `en` string tables; space default + user override (ADR-005) | UI strings | core labels | BR-014 |
| **Activity log** | Record Memorial Mode changes, deletions, reviews, moderation | Append-only log rows | Neon | BR-021, BR-051 |

**Product entities** (column detail belongs to the data-model doc): `space`, `membership`,
`consent`, `source`, `item` (+ `recipe_step`, `item_revision`), `person` (+ `item_person`),
`question` (hint), `recap` (published snapshot), `contribution`, `activity`, `ai_call`, `event`.

---

## Data flow

### Capture → structure (F-003–F-007, F-014)

```
Browser MediaRecorder (webm/opus or mp4/aac fallback) / picks photo or PDF
  │  photos resized client-side; every upload ≤ 4 MB (Vercel Functions body limit 4.5 MB)
  ▼
POST /api/spaces/:id/sources  (multipart)
  ├─ authz: steward (or family for photo/doc/text, origin = About them)
  ├─ consent recorded?  no → 409 (BR-001)
  ├─ put file → Blob (random pathname) ; insert source(status=uploaded)
  └─ respond 202 {sourceId}      then next/server after():
        audio    → Groq whisper-large-v3 (verbose_json, segment timestamps) → segments[] stored
        photo    → Gemini Flash-Lite vision → {visible[], missing[], questions[]}  (no names, BR-011)
        document → Gemini Flash-Lite (image/PDF) → AI-read text, stored as segments
        text     → one segment per paragraph
        ─▶ extraction: Groq gpt-oss-120b, strict JSON schema:
             items[{type, title, body, segmentIds[], people[], places[], dates[{text, precision}],
                    recipeSteps[{kind: measured|judgement, text, quantityVerbatim?, segmentIds[]}]}]
        ─▶ server validation (Methods EQ-004–EQ-006): segment IDs exist; quantities appear verbatim
           in cited segments; spans computed from segment times
        ─▶ items inserted as review_state = ai_suggestion ; hints generated ; status = ready
        any step fails → status = failed(step, reason) ; UI shows retry (POST /sources/:id/retry)
Client polls GET /api/sources/:id every 2 s until ready | failed
```

### Review → searchable (F-008, F-009, F-015)

```
PATCH /api/items/:id/review {action, note?, edits?}
  ├─ core.reviewTransition(state, action)  (BR-020; dispute needs note)
  ├─ write item_revision (old value kept, BR-071) ; activity row
  ├─ confirm/correct/uncertain/dispute → embed (Gemini, RETRIEVAL_DOCUMENT, 768 dims)
  └─ reject → embedding removed; item hidden everywhere (BR-022)
```

Only reviewed, non-rejected items have embeddings, so unreviewed content can't be retrieved (BR-022).

### Ask GUNITA (F-012, F-013, F-022)

```
POST /api/spaces/:id/ask {question}                      (family members only, BR-034)
 1. pre-check: role-play / speak-as / voice / opinion request? → refusal (BR-037)   [pattern list + model flag]
 2. embed question (RETRIEVAL_QUERY)
 3. SQL: top-k by cosine WHERE space = :id AND embedding IS NOT NULL
         AND visible_to(viewer)                           (filter inside the query, BR-033)
 4. no candidate ≥ τ  → "Hindi pa alam" (no LLM call)     (Methods EQ-001/EQ-002)
 5. Groq gpt-oss-120b, strict schema:
      {refusal?, sentences[{text, itemIds[]}], unsupportedParts[]}
      prompt: third person, only given items, no outside facts, quote only verbatim
    on 429/timeout → Gemini Flash-Lite with the same schema
 6. validate (core, Methods EQ-003):
      drop sentence if any itemId ∉ candidates or itemIds empty
      strip quotation marks unless the quoted text is in a cited source
      first-person-as-the-person check → regenerate once → else abstain
    nothing left → "Hindi pa alam"
 7. response: sentences + evidence cards grouped "In their own words" (From them)
    / "Others remember" (About them), labels carried; unsupported parts → Hindi pa alam
    During mode: offer "Add as a GUNITA Question" (BR-038)
```

### Memorial (F-016–F-020)

```
activate (typed name confirm) → mode = memorial, activity row
select items (Memorial-visible, reviewed, consent allows) → draft recap (Groq: order + ≤140-char captions citing items)
steward edits → publish → recap snapshot JSON (cards with item/source refs + Blob URLs) stored
QR = https://<web-domain>/m/<token>   (token: 128-bit random, base64url)

Visitor: GET /m/:token  → server-rendered from snapshot + approved contributions (DB only, no AI)
         POST /api/m/:token/contributions (multipart ≤ 4 MB, rate-limited) → status = pending
Steward: approve / reject in moderation queue → approved appear under "Memories from others"
Source/item deletion → cards referencing it are removed from the snapshot (BR-070)
```

---

## Key technology choices + rationale

| Choice | Why | Trade-off | Alternative rejected |
|---|---|---|---|
| Single Next.js 16 App Router on Vercel Hobby | AppCon does not require native; one deploy for family UI + API + QR memorial (ADR-004) | Browser mic quirks on iOS Safari | Expo + Next split (ADR-001, superseded) |
| Mobile-first responsive web (~375 px) | Steward sits with an elder on a phone; judges scan QR on phones | Desktop is secondary | Native apps / Expo Go |
| pnpm workspace: `apps/web` + `packages/core` | Shared rules and fil/en labels without a second app | Slightly more monorepo setup | Two repos (drift) |
| Neon Postgres + pgvector (HNSW) | Free, pgvector included, serverless HTTP driver works on Vercel | 0.5 GB cap; compute scales to zero after 5 min | Supabase; separate vector DB |
| Drizzle ORM + drizzle-kit | TypeScript schema, SQL-close, supports `vector` columns | Less magic than Prisma | Prisma |
| Better Auth (self-hosted) cookie sessions | Free, sessions in Neon, no Expo plugin needed | We own auth config | Neon Auth (beta); Clerk |
| Vercel Blob, public store, random pathnames | Free 1 GB, byte-range serving (iOS playback), simple `put()` | Capability URLs (ADR-002) | Cloudflare R2; Postgres bytea |
| AI SDK 7 (`ai`, `@ai-sdk/groq`, `@ai-sdk/google`) | One API for transcription, structured output, embeddings | Must track SDK 7 APIs | Raw provider SDKs |
| Groq `whisper-large-v3` | Free, Tagalog, segment timestamps, fast | Taglish accuracy unmeasured on elderly speech | ElevenLabs Scribe v2 (paid substitute) |
| Groq `openai/gpt-oss-120b` strict JSON schema | Constrained decoding | 8K tokens/min free limit | Best-effort JSON models |
| Gemini `gemini-embedding-001` (768 dims) | Free multilingual embeddings | Free tier may use data for product improvement | Local embeddings |
| Gemini Flash-Lite for vision/PDF + fallback | Free vision/PDF; absorbs Groq 429s | Same data-use caveat | Groq Llama 4 Scout |
| Segment-ID referencing in extraction | Spans and quotes are checkable | Segment-level, not word-level | Free-text quotes |
| Published recap snapshot | Public page fast, AI-free, immutable until re-publish | Must rebuild on deletion | Live render each request |
| Polling for processing status | Simple in the browser | Up to 2 s lag | Websockets |
| fil / en UI mode (ADR-005) | Matches Filipino bilingual use + judges | Two string tables | English-only or Filipino-only |

---

## Integration points

| Service | Used for | Protocol | Failure mode | Handling |
|---|---|---|---|---|
| Neon | All data, vectors | HTTPS (serverless driver) | Cold start; free-quota suspension | First request tolerates wake; ops runbook for quota |
| Vercel Blob | Photos, audio, documents | HTTPS `put()`; public GET with ranges | 1 GB cap; 10 GB transfer/month | Client-side compression; 4 MB cap per file |
| Groq STT | Transcription | HTTPS via AI SDK `transcribe` | 429 (20/min), >25 MB, bad audio | Queue retry with backoff; source `failed` + retry button |
| Groq LLM | Extraction, hints, answers, captions | HTTPS via AI SDK, strict schema | 429 (30/min, 8K tokens/min) | Fallback to Gemini Flash-Lite with same schema |
| Gemini | Embeddings, vision/PDF, fallback text | HTTPS via AI SDK | 429; content filters | Retry; mark source `failed`; embeddings retried on next review action |
| Better Auth | Sessions | In-process + Neon cookies | Session expiry | Redirect to sign-in; keep unsent recording in memory/IndexedDB until upload |

Every AI call writes an `ai_call` row (purpose, model, latency, token counts, ok/error). No prompt
content is logged there.

---

## Security & access (no separate security doc for this build)

- **Authentication:** Better Auth cookie sessions for steward and family; memorial visitors are anonymous.
- **Authorization:** every `/api/spaces/:id/*` handler resolves the session → membership → role
  before any query. Visibility is enforced in SQL through the access module (BR-033). Steward-only
  actions: consent, invites, review, visibility, deletion, Memorial Mode, curation, publish, QR,
  moderation.
- **Public surface:** only `/m/:token` pages and `POST /api/m/:token/contributions`. They expose the
  published snapshot and approved contributions only. A disabled QR or unpublished recap returns the
  unavailable page. Pages send `noindex`.
- **Uploads:** MIME sniffing plus allowlist (webm/mp4/m4a/mp3/wav, jpeg/png/heic→jpeg, pdf), 4 MB
  cap, random Blob pathnames, never executed.
- **Abuse:** visitor submissions rate-limited per hashed IP per memorial (Methods EQ-010); pending
  until approved.
- **Prompt injection:** transcripts and contributions are data, not instructions; strict schemas
  and server-side citation checks mean injected text cannot add uncited claims.
- **Secrets:** env vars on Vercel only (names in [Ops](ops.md)); none in the public repo.
- **Known limits (hackathon):** public Blob capability URLs; free-tier data-use terms (ADR-002).

---

## Deployment topology

```
GitHub (public, MIT) ──push──▶ Vercel project "gunita" (Hobby, region sin1 [verify])
                                 ├─ Next.js app: family UI, /api/*, /m/*
                                 ├─ env: DATABASE_URL, BLOB_READ_WRITE_TOKEN, GROQ_API_KEY,
                                 │       GOOGLE_GENERATIVE_AI_API_KEY, BETTER_AUTH_SECRET, …
                                 └─▶ Neon project (free, AWS Singapore [verify]) · Blob store

Demo phones / judges ── HTTPS browser ──▶ https://<vercel-domain>
```

Environments: `production` (demo) and `preview` (per branch on Vercel). Neon branch per
environment. Seed script loads the fictional family (PRD BR-040).

---

## Scaling strategy

This is a demo-scale system: one family space, a few hundred items, tens of visitors. What limits it:

| Limit | Value (free tier, 2026-09-23) | Impact | Mitigation |
|---|---|---|---|
| Groq LLM tokens/min | 8K on gpt-oss-120b | ~2 answers/min | Gemini fallback; seeded demo; short prompts |
| Groq STT | 20 req/min, 28,800 audio s/day | ample for demo | none needed |
| Gemini Flash-Lite | 15 req/min, 1,000 req/day | vision and fallback share it | photos processed once |
| Neon storage | 0.5 GB | vectors and text only | media lives in Blob |
| Blob | 1 GB storage, 10 GB transfer/month | recap audio on judges' phones | compress audio (mono webm/opus or mp4/aac) and photos |

The public memorial page makes no AI calls, so a burst of QR scans only hits Neon and Blob.
Beyond the hackathon: paid tiers (ADR-002 consequences), private Blob store, job queue instead of
`after()`.

---

## Trade-offs considered

- **Segment-level spans** instead of word-level: less precise clips, but every span is verifiable
  from the provider's timestamps (see Methods EQ-006).
- **Deterministic abstention before any LLM call** when retrieval finds nothing above τ: saves
  tokens and makes "Hindi pa alam" provable. τ must be calibrated (Methods EQ-001).
- **Snapshot publishing** instead of live rendering for the memorial: the public page can never
  show something the steward did not publish.
- **Featured person without an account:** matches how elders will actually participate; reviews
  record "with the person" vs "steward alone" (BR-021).
- **Web-only vs Expo:** AppCon coverage is web or mobile; one stack wins Functionality points
  (ADR-004).

**Missing non-functional requirements (open):** Ask GUNITA latency target; processing time target
per recording; memorial availability after the hackathon; data retention and deletion timelines;
concurrent visitor load expected during judging.

---

## Stack currency (verify at scaffold; checked on npm 2026-09-23)

| Package | Version | Trap to check |
|---|---|---|
| `next` | 16.3.6 | Next 16 renames middleware to `proxy.ts`; `after()` from `next/server` |
| `ai` | 7.0.112 | Requires Node ≥ 22 and ESM; structured output via `Output.object` |
| `@ai-sdk/groq` | 4.0.47 | `groq.transcription('whisper-large-v3')` with `responseFormat: 'verbose_json'`, `timestampGranularities` |
| `@ai-sdk/google` | 4.0.78 | `google.embedding('gemini-embedding-001')`, `outputDimensionality: 768`, `taskType` |
| `@neondatabase/serverless` | 1.1.0 | use with `drizzle-orm/neon-http` |
| `drizzle-orm` | 0.45.3 | `vector` column + HNSW index migration |
| `@vercel/blob` | 2.8.0 | server `put()` limited by 4.5 MB request body |
| `better-auth` | 1.7.5 | cookie sessions; trusted origins = app URL |
| `zod` | 4.6.5 | schemas shared through `packages/core` |
| `qrcode` | 1.5.4 | server-side PNG/SVG generation |

Proposed ADRs if these change: job queue replacing `after()`; private Blob store; word-level spans.
