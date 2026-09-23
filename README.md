# GUNITA

Consent-based family memory archive for Filipino families (AppCon 2026 — Virtual AI Matsuri).

While a loved one is alive, the family captures stories, voice, recipes, and artifact context.
After death, the steward activates Memorial Mode so lamay visitors can open a QR memorial and share
memories. AI organizes and answers only from reviewed family sources — otherwise it says
**Hindi pa alam**.

## Platform

Single **mobile-first Next.js web app** on Vercel (ADR-004). No native / Expo apps.
UI language: **Filipino (Taglish-friendly)** or **English** (ADR-005).

## Docs

Start at [`docs/index.md`](docs/index.md). Decision audit: [`docs/adr/`](docs/adr/).
Build tasks: [`docs/implementation-plan.md`](docs/implementation-plan.md).
Agent guide: [`AGENTS.md`](AGENTS.md).

## Stack (planned)

Next.js 16 · Neon + pgvector · Vercel Blob · Groq · Gemini · Better Auth · AI SDK 7

## License

MIT (to be added at submission).
