# ADR-002 — Free-tier stack: Neon, Vercel Blob, Groq, Gemini

- **Date:** 2026-09-23
- **Status:** Accepted
- **Owners / agents:** Alex (team lead), with the docs agent
- **Related:** F-003–F-014, F-022; `docs/system-design.md`, `docs/methods.md`, `docs/ops.md`;
  auth client surface softened by [ADR-004](ADR-004-single-web-app.md) (cookie sessions only; no Expo plugin).

### Context
The team requires every service to be free for the MVP, with Neon as the database and low-cost AI
providers such as Groq. The AppCon mechanics require a public MIT repo and documentation for any
proprietary API, with instructions to substitute it. Transcription must handle Filipino/Taglish
and return timestamps so answers can play the exact audio clip (F-007).

### Why now
Provider limits shape the system design, the demo plan, and the failure runbook.

### Options considered
1. **Groq + Gemini free tiers** (checked 2026-09-23):
   - Groq `whisper-large-v3`: Tagalog via Whisper, word and segment timestamps, free 20 req/min,
     2,000 req/day, 7,200 audio s/hour, 28,800 audio s/day, 25 MB per file.
   - Groq `openai/gpt-oss-120b`: strict JSON-schema output; free 30 req/min, 1,000 req/day,
     8K tokens/min, 200K tokens/day.
   - Groq has no embedding model.
   - Gemini free tier: `gemini-embedding-001`; Flash-Lite with vision/PDF input at 15 req/min,
     1,000 req/day, 250K tokens/min. Free-tier content may be used by Google to improve products.
2. **Vercel AI Gateway** for everything. Rejected: speech-to-text on the Gateway is beta and
   "rolling out gradually", so it may not be available to the team; not free beyond credits.
3. **ElevenLabs Scribe v2** (Filipino rated 5–10% WER). Rejected for now: not free; kept as the
   documented substitute.

Storage: Neon has no file storage, and iOS media playback needs byte-range support. Vercel Blob
Hobby (free, 1 GB, 10 GB transfer/month) serves files with ranges. Cloudflare R2 has a larger free
tier but needs a payment method on file.

### Decision
- **Database:** Neon Postgres (free: 0.5 GB, 100 CU-hours/month, pgvector with HNSW).
- **Files:** Vercel Blob (public store, random unguessable pathnames).
- **Auth:** Better Auth running in the Next.js app, tables in Neon (cookie sessions for the web UI).
- **Transcription:** Groq `whisper-large-v3` with `verbose_json`, word + segment timestamps.
- **Text generation (extraction, hints, answers, recap captions):** Groq `openai/gpt-oss-120b`
  with strict JSON schema.
- **Embeddings:** Gemini `gemini-embedding-001` at 768 dimensions.
- **Vision and document reading, plus fallback text model on Groq 429:** Gemini Flash-Lite.
- All model IDs are environment variables behind the AI SDK, so any provider can be swapped.

### Why this option
Zero cost, verified Tagalog transcription with timestamps, and schema-constrained output on the
model that writes answers. The AI SDK keeps providers swappable, which satisfies the
proprietary-API rule.

### Overrides
- **Prior ADRs:** none
- **Doc / plan truth:** none (greenfield)
- **Out of scope:** Does not permit synthetic speech; no TTS provider is integrated.

### Consequences
- **Easier:** no billing setup; one SDK for all AI calls.
- **Harder / owed:**
  - Groq's 8K tokens/min limits live Ask GUNITA to roughly two answers per minute, so the demo
    uses the Gemini fallback on 429 and pre-seeded data.
  - Gemini free tier may use submitted content for product improvement: acceptable only for the
    fictional demo family (PRD BR-040). Real families require paid tiers with no-training terms.
  - Public Blob URLs are capability URLs: anyone holding one can fetch the file. The API only
    reveals URLs to viewers allowed to see the item. Real families require a private store served
    through an authorized route.
  - Free-tier limits and model IDs must be rechecked at scaffold time.
- **Follow-up:** document providers and substitutes in the README.
