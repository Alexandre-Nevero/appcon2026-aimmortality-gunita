# Himmel

*For stories that stay with us.*

> **AppCon 2026 Submission** | Theme: *AI-Assisted Digital Immortality*

Himmel is a consent-based family memory and legacy platform. It answers the challenge of digital
immortality not with creepy AI chatbots or synthetic clones, but through **truthful, human-verified
archiving and representation**.

Himmel operates as **one family archive with two lifecycle modes**:

1. **During (Self-Archive & Family Vault):** A quiet, private space where users can curate their
   own life story (like a personal visual journal) and invite family members to capture knowledge,
   recipes, and voice notes while elders are alive.
2. **After (Memorial Mode):** When the time comes, the approved archive transforms seamlessly into
   a public memorial accessed via QR code at the wake (*lamay*), allowing visitors to contribute
   safely without engagement loops or grief exploitation.

---

## ✨ Core Pillars & Ethical Guardrails

- **Representation, Not Replica (F-022):** Himmel strictly refuses role-play, first-person
  impersonation, or voice cloning. It shares only what real humans recorded.
- **Truthful AI & Abstention (F-013):** If Ask Himmel lacks supporting reviewed sources, it never
  guesses or hallucinates. It explicitly abstains with **"Hindi pa alam"** (Not yet known).
- **Strict Provenance (F-015):** Material captured from the featured person is labeled **From
  them**. Visitor and family contributions are labeled **About them**. They never blur.
- **Grief-Safe Design (BR-080):** Zero streaks, zero gamification, and zero notification nudges.
  The visitor contribution flow concludes cleanly at the confirmation screen.

---

## 🛠️ Tech Stack & Architecture

- **Framework:** [Next.js 16](https://nextjs.org) (App Router), mobile-first web app (~375px design
  target), hosted on Vercel. No native apps or app stores ([ADR-004](docs/adr/ADR-004-single-web-app.md)).
- **Database & Storage:** Neon (PostgreSQL + pgvector) · Vercel Blob for media (audio, photos,
  documents) · Drizzle ORM.
- **Auth:** Better Auth (email + password, cookie sessions).
- **AI & NLP pipeline:** Groq (`whisper-large-v3` for Taglish STT with segment timestamps;
  `gpt-oss-120b` for structured extraction and grounded answers) and Google Gemini
  (`gemini-2.5-flash-lite` for vision/fallback text, `gemini-embedding-001` for 768-dim retrieval
  embeddings) via AI SDK 7. Every model ID is an environment variable — see
  [`apps/web/src/ai/models.ts`](apps/web/src/ai/models.ts).
- **UI language:** Filipino (Taglish-friendly) or English ([ADR-005](docs/adr/ADR-005-ui-language.md)).
- **Compliance:** Data Privacy Act of 2012 ([RA 10173](https://www.lawphil.net/statutes/repacts/ra2012/ra_10173_2012.html))
  aligned data handling. Not legal advice — see [docs/brd.md](docs/brd.md) Constraints.

---

## 🚀 Local Development & Setup

### Prerequisites

- **Node.js 22 or newer** (enforced via `engines` in `package.json`)
- **pnpm 12.5.1** (`packageManager` pin) — install with `npm i -g pnpm@12.5.1` if corepack is missing

### 1. Clone the repository

```bash
git clone https://github.com/Alexandre-Nevero/appcon2026-aimmortality-gunita.git
cd appcon2026-aimmortality-gunita
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

Copy the template and fill in your keys. Next.js loads env from `apps/web/.env.local`
(git-ignored — never commit values; the repo is public).

```bash
cp .env.example apps/web/.env.local
```

| Variable | Needed for |
|---|---|
| `DATABASE_URL` | runtime DB (Neon pooled) |
| `DATABASE_URL_UNPOOLED` | migrations (`pnpm db:migrate`) |
| `DATABASE_URL_TEST` | CI integration tests only |
| `BLOB_READ_WRITE_TOKEN` | source uploads (Vercel Blob) |
| `GROQ_API_KEY` | transcription + text |
| `GOOGLE_GENERATIVE_AI_API_KEY` | embeddings, vision, fallback text |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | sessions |
| `IP_HASH_SECRET` | visitor rate limiting, tribute cookie HMAC |
| `PUBLIC_WEB_URL`, `NEXT_PUBLIC_APP_URL` | base URL for memorial QR codes and client links |
| `MODEL_TRANSCRIBE`, `MODEL_TEXT`, `MODEL_TEXT_FALLBACK`, `MODEL_VISION`, `MODEL_EMBED` | optional — model IDs (defaults match System Design) |
| `ASK_TAU`, `ASK_TOP_K` | optional — abstention threshold and candidate count |

Full list with notes: [`.env.example`](.env.example) · [docs/ops.md](docs/ops.md) § Configuration & secrets.

### 4. Run the development server

```bash
pnpm dev
```

Open http://localhost:3000 in your browser (mobile view recommended).

Memorial pages and visitor contributions hit the database only (no AI calls). Upload → transcribe
→ extract, semantic search, review-confirm embedding, and Ask Himmel need the AI keys above.

### 5. Database (optional for a UI-only look)

```bash
pnpm db:generate   # diff schema → apps/web/drizzle
pnpm db:migrate    # needs DATABASE_URL_UNPOOLED
pnpm db:seed       # needs DATABASE_URL; add -- --reset to reseed
```

Seed data is a fictional family ([BR-040](docs/prd.md)) — required, because the repo is public and
AI providers are on free tiers.

### 6. Verify

```bash
pnpm typecheck   # web + core
pnpm test        # vitest, web + core
```

---

## 🔌 Proprietary API Substitution Instructions

Per AppCon submission rules, each proprietary service can be swapped while keeping core
functionality reachable. **Most swaps are environment variables — no code change.**

| Service | Default | How to substitute |
|---|---|---|
| **Speech-to-text** | Groq `whisper-large-v3` (Taglish, segment timestamps) | Set `MODEL_TRANSCRIBE` to any AI SDK transcription model. Code: [`apps/web/src/ai/transcribe.ts`](apps/web/src/ai/transcribe.ts). Documented paid substitute: ElevenLabs Scribe v2 ([docs/system-design.md](docs/system-design.md) → Stack currency). |
| **LLM extraction / Ask** | Groq `openai/gpt-oss-120b`, Gemini `gemini-2.5-flash-lite` fallback | Set `MODEL_TEXT` / `MODEL_TEXT_FALLBACK`. Provider wiring: [`apps/web/src/ai/models.ts`](apps/web/src/ai/models.ts). Any AI SDK–compatible provider works, including local models (e.g. Ollama). |
| **Vision / document reading** | Gemini `gemini-2.5-flash-lite` | Set `MODEL_VISION`. Same file as above. |
| **Embeddings** | Gemini `gemini-embedding-001` | Set `MODEL_EMBED`. **Must emit 768 dimensions** — the `item.embedding` column is fixed at 768 in [`apps/web/src/db/schema.ts`](apps/web/src/db/schema.ts). Changing it needs a migration + full re-embed. |
| **Database** | Neon Serverless Postgres + pgvector | Any PostgreSQL with the `pgvector` extension: point `DATABASE_URL` and `DATABASE_URL_UNPOOLED` at it, run `pnpm db:migrate && pnpm db:seed`. Docker `pgvector/pgvector` image works. |
| **Media storage** | Vercel Blob (byte-range reads for iOS audio playback) | Any object store with HTTP range support (e.g. Cloudflare R2, per [ADR-002](docs/adr/ADR-002-free-tier-stack.md)). Code: [`apps/web/src/media/blob.ts`](apps/web/src/media/blob.ts). |

Without any AI keys the app still boots: you can browse seeded content, open a memorial by QR, and
submit a visitor memory. Transcription, extraction, semantic search, review-confirm embedding, and
Ask Himmel need the keys above.

---

## 📚 Docs

Start at [`docs/index.md`](docs/index.md) (source-of-truth map).

| Need | Open |
|---|---|
| What we build | [PRD](docs/prd.md) · [BRD](docs/brd.md) |
| How it's built | [System Design](docs/system-design.md) · [Data Model](docs/data-model.md) |
| Screens / flows | [Sitemap](docs/sitemap.md) · [User Flow](docs/user-flow.md) |
| Why / pivots | [`docs/adr/`](docs/adr/) |
| Tests · numbers · deploy | [QA](docs/qa-test-plan.md) · [Methods](docs/methods.md) · [Ops](docs/ops.md) |
| Living build plan | [Implementation Plan](docs/implementation-plan.md) |
| Agent guide | [AGENTS.md](AGENTS.md) |

---

## 📄 License

MIT. The `LICENSE` file is added at submission (required by AppCon pass/fail rules).
