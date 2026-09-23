# Business Model Canvas — GUNITA (pitch-facing)

**Owner:** Alex (team lead) · **Status:** Hypothesis draft · **Date:** 2026-09-24
**Traces to:** [BRD business model hypothesis](brd.md) (owner), [ADR-003](adr/ADR-003-b2b2c-memorial-package.md),
[PRD](prd.md) (product scope), [Methods](methods.md) (metrics), [Ops](ops.md) (costs).
**Not generated yet:** pitch kit (Gian TASK-023).

> One-page business model for the pitch, derived from BRD §Business model hypothesis. Every claim
> below is a hypothesis unless marked **[validated]**; unvalidated ones carry `[need: …]` like the BRD.

---

## 1. Customer Segments

- **Family steward (buyer)** — the family member operating the archive; the one who buys the
  Memorial package at the time of the wake. (BRD Stakeholders)
- **Family members** — capture and learn from the featured person's knowledge while alive;
  contribute memories; no publishing rights.
- **Lamay visitors** — open the memorial by QR at the wake, remember, and share a memory quickly
  (`< 90 s`, BRD BO-3).
- **Funeral homes / memorial parks (B2B2C channel, future)** — resell or refer the Memorial
  package to every bereaved family they already serve.
- **Validation segment (post-hackathon):** people who already keep family photos or recipes
  (BRD §Validation plan). Not a market-size claim.

## 2. Value Propositions

- **Free During archive:** capture → review → archive → search → Ask GUNITA for one family, at no cost.
- **Truthful AI they can trust (differentiator):** answers only from reviewed family sources,
  otherwise **Hindi pa alam**; never impersonates the person, no invented memories, no synthetic
  voice (PRD F-022, Methods EQ-012).
- **A richer memorial than a template obituary:** the archive built while alive means the
  memorial carries the person's own words, voice, recipes, and context — not just dates.
- **Effortless visitor contribution:** QR opens instantly, no login, share in under 90 seconds
  (BRD BO-3 / Methods EQ-011).
- **Grief-safe:** no streaks, no engagement nudges, no re-engagement pushes (PRD BR-080);
  moderation keeps visitor memories respectful (PRD BR-062).

## 3. Channels

- **Direct (primary, MVP):** family/steward signs up and activates Memorial Mode in-app; QR
  published to the memorial URL (user-flow S-020–S-032).
- **Funeral partners (future, B2B2C):** funeral homes and memorial parks bundle or refer the
  Memorial package (ADR-003). **[need: partner interviews with a real offer]**.
- **Physical add-ons (out of hypothesis):** printed QR plaque, printed memory book — shown in
  TALA/UGAT tabs, not part of the core package until tested (BRD).

## 4. Customer Relationships

- **Self-serve archive** for the family; data and visibility controlled by the steward (PRD BR-002,
  BR-032, BR-033).
- **Consent-based:** capture and display are governed by the featured person's consent and chosen
  visibility — even after death, heirs may invoke data-subject rights (RA 10173 §17).
- **No engagement loops:** time-in-app is an anti-metric (PRD BR-080).
- **Care after death:** steward activates Memorial Mode; family moderates visitor memories;
  memorial hosting terms **required before selling** (BRD Risk).

## 5. Revenue Streams

- **Memorial package (one-time, core hypothesis):** published recap, QR, visitor wall, moderation
  (ADR-003). Price **unknown** — **[need: willingness-to-pay test at a real price]**.
- **Partner share:** contribution margin = price − (storage + AI + hosting + support + partner
  share) (BRD §Budget). **[need: measure per-family AI + storage cost]**.
- **Free:** During archive never charged — families are not billed for access to their own
  memories (ADR-003 rationale).
- Physical add-ons (**out of scope** for the hypothesis) (BRD).

## 6. Key Activities

- Capture pipeline: record (voice/text/photo; tap-to-play audio), transcribe (Groq STT), review,
  archive (System Design).
- AI retrieval & answer service: embeddings (Gemini), pgvector search, **Ask GUNITA** answering
  from reviewed sources only, citing evidence with provenance badges (F-015, F-016; Methods EQ-012).
- Curation & visibility: consent evidence, review states, family/memorial visibility, export
  (packages/core rules — TASK-003 / TASK-011).
- Memorial operations: activation, recap editor, publish, QR, visitor moderation.
- Autonomous antipattern guard: no impersonation / no synthetic voice / abstention training.

## 7. Key Resources

- **The archive itself** — the family-built content (reviews, provenance, reviewed sources) is the
  moat; richer than a template page.
- AI stack: Groq (STT + text), Gemini (embeddings + vision + fallback) — all free-tier for MVP,
  substitutes documented (ADR-002).
- Platform: Next.js app, Neon + pgvector, Vercel Blob, Better Auth sessions (System Design).
- Partner relationships (future) and team (5 members).

## 8. Key Partnerships

- **Funeral homes / memorial parks (future):** reach, trust, and the moment of purchase
  (ADR-003) — **[need: partner interviews]**.
- **Platform providers (MVP):** Vercel, Neon, Groq, Gemini — free tiers, documented substitutes
  for competition rules (PRD §0.2, ADR-002).
- **Family / stewards as content co-creators:** the During archive feeds every paid output.

## 9. Cost Structure

- **MVP: $0** — free tiers only (ADR-002, BRD §Budget).
- **Post-MVP unit prices (published, checked 2026-09-23):**

| Cost driver | Price |
|---|---|
| Transcription (Groq whisper-large-v3, paid) | $0.111 / hour of audio |
| Neon storage (Launch) | $0.35 / GB-month |
| Neon compute (Launch) | $0.106 / CU-hour |
| Media storage (Vercel Blob, Pro) | usage-based |
| Generation + embeddings | usage-based per token |

- Plus: support, partner share. **[need: per-family cost measurement before pricing]**.

---

## Validation status

| Element | Status |
|---|---|
| Problem exists | **Unvalidated.** Problem interviews: 10 people who keep photos/recipes; ≥5/10 show a concrete unknown-context instance (BRD §Validation plan) |
| Families capture while alive | **Unvalidated — riskiest assumption** (UGAT risk 1) |
| Partners will sell | **Unvalidated.** 3–5 partner interviews, paid-pilot commitment |
| Price accepted | **Unvalidated.** Real-price commercial test |
| Trust / AI quality | Target: 100% abstention, 0 impersonation, 0 leaks at hackathon demo (BRD BO-2) |

**Bottom line for the pitch:** free-to-build archive → paid outcome at the wake, sold directly and
through funeral partners. Powerful story; **entirely unvalidated** until the post-hackathon
validation plan runs — say that in the pitch, don't overclaim.