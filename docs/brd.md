# BRD — Business Requirements Document — GUNITA

> **Purpose:** the WHY, for stakeholders and judges. Owns business objectives, the business model
> hypothesis, and business risks.
> **Status:** Draft v0.2 · **Date:** 2026-09-23 · **Owner:** Alex
> **Traces back to:** [PRD](prd.md) (product scope), [ADR-003](adr/ADR-003-b2b2c-memorial-package.md)
> (business model), [ADR-004](adr/ADR-004-single-web-app.md) (delivery),
> [ADR-005](adr/ADR-005-ui-language.md) (language). `idea.md` not yet written.

## Executive summary

Filipino families lose knowledge when the relative who carries it (recipes, stories, who is in the
old photos) can no longer explain it. GUNITA is one family archive with two modes: while the person
is alive, the family captures and uses their knowledge; after they die, the same approved archive
becomes a memorial that lamay visitors can open by QR and add to.

For the business, the During archive is free to build trust and content. Revenue comes from a
**Memorial package** sold at the moment families already buy funeral services, directly or
through funeral homes and memorial parks. This is an unvalidated hypothesis. The immediate
objective is to win AppCon 2026 with a working, truthful **web** prototype that makes the case
credible.

## Business objectives

| # | Objective | Metric | Target | Horizon |
|---|---|---|---|---|
| BO-1 | Deliver a working prototype that scores on every judging criterion | Golden path runs live; all AppCon submission rules met (PRD §0.2) | 100% of the rules; demo passes twice in rehearsal | Sep 24, 2026 |
| BO-2 | Prove the AI can be trusted with family memory | PRD AI quality bar (Methods EQ-012) | 100% abstention on unanswerable, 0 impersonation, 0 leaks | Sep 24, 2026 |
| BO-3 | Show visitor contribution is effortless | Wake friction median (Methods EQ-011) | < 90 s | Sep 24, 2026 |
| BO-4 | Test whether families value the During archive | Families completing a capture → review → use cycle in a pilot | [need: pilot target set after hackathon] | post-hackathon |
| BO-5 | Test whether funeral partners will sell the Memorial package | Partners agreeing to a paid pilot at a stated price | [need: partner interviews] | post-hackathon |

## Scope

### In scope
- The MVP defined in the [PRD](prd.md): F-001–F-022, one family space, one featured person.
- Delivery as a single mobile-first Next.js web app (ADR-004); UI in Filipino (Taglish-friendly)
  or English (ADR-005).
- The business model hypothesis in ADR-003, for the pitch.
- Validation plan (below) for after the hackathon.

### Out of scope
- Payments, pricing pages, partner portals (not built in the MVP).
- Native iOS/Android apps, Expo, app-store distribution (ADR-004).
- Hard cuts from the PRD: AI films, visual novels, 3D avatars, voice cloning, full genealogy,
  historical records, complex public social features, Kalusugan.
- Any feature that simulates the person (PRD F-022).

## Stakeholders

| Stakeholder | Interest | Decision authority |
|---|---|---|
| Featured loved one | Their words shared only as they choose | Consent and visibility of their own material (PRD BR-002, BR-032) |
| Family steward | Preserve and later memorialize a relative; control what is public | Operates the space; activates Memorial Mode; moderates |
| Family members | Learn from and remember the person | Contribute memories; no publishing rights |
| Lamay visitors | Remember and share quickly | Submit memories; family decides display |
| Funeral homes / memorial parks (future channel) | A differentiated service for families | Whether to offer the Memorial package |
| AppCon judges / OTis | Product, technology, creativity, presentation (criteria in PRD §0.3) | Scoring |
| GUNITA team (5 members) | Win AppCon; ship a truthful product | Scope, build, pitch |

## Business model hypothesis (ADR-003)

| Element | Hypothesis |
|---|---|
| Free | During archive: capture, review, archive, search, Ask GUNITA for one family |
| Paid | Memorial package: Memorial Mode, published recap, QR, visitor wall, moderation |
| Buyer | The family (steward), at the time of the wake |
| Channel | Direct, plus funeral homes and memorial parks that bundle or refer the package |
| Why it might work | The purchase happens when families already pay for funeral services; partners already reach every bereaved family; the archive built while alive makes the memorial richer than a template obituary page |
| Why it might fail | Families may never start the During archive; partners may not want a digital add-on; price tolerance is unknown |

Physical add-ons (printed QR plaque, printed memory book) appear in the TALA and UGAT tabs. They
are not part of this hypothesis until the core package is tested.

## Success metrics

**Hackathon:** BO-1 to BO-3.

**Business (post-hackathon, all unvalidated):**
- Verified memories preserved per family (PRD product metric).
- Share of families in a pilot who activate a Memorial after a death (long horizon; tracked only
  with consent).
- Memorial package conversion when offered, at a real price.
- Partner count offering the package.
- Visitor contributions per memorial.
- Anti-metric: time in app is not a goal (PRD BR-080).

## Timeline

| Date | Milestone |
|---|---|
| Sep 23, 2026 | Opening day; theme drawn; PRD approved; FMD docs; build starts |
| Sep 24, 2026 | Final development, submission (time to confirm on Team Portal; call said 6:00 PM), judging, pitch/demo |
| Sep 25, 2026 | Awarding |
| After AppCon | Validation plan below, only if the team continues |

## Budget / cost-benefit

**MVP:** $0. Every service runs on a free tier (ADR-002): one Vercel Hobby Next.js deploy, Neon
Free, Vercel Blob Hobby, Groq free, Gemini free.

**Beyond the hackathon, known unit prices (checked 2026-09-23; per-family cost not yet measured):**

| Cost driver | Published price | Source |
|---|---|---|
| Transcription (Groq whisper-large-v3, paid) | $0.111 per hour of audio | Groq pricing as reported by DEV Community comparison |
| Database storage (Neon Launch) | $0.35 per GB-month | Neon pricing |
| Database compute (Neon Launch) | $0.106 per CU-hour | Neon pricing |
| Media storage (Vercel Blob, Pro) | usage-based | Vercel Blob pricing |
| Generation and embeddings | usage-based per token | Groq / Gemini pricing |

Contribution margin per Memorial package = price − (storage + AI + hosting + support + partner
share). Price and per-family costs are unknown: **[need: measure AI and storage cost per pilot
family; willingness-to-pay test]**.

**Benefit case:** the business value rests on the Memorial package's price and partner
distribution. Neither is evidenced yet.

## Constraints

- **Competition rules:** public repo, MIT license, all materials public, proprietary APIs documented
  with substitutes (PRD §0.2). AppCon does not require a native app; web delivery is enough
  (ADR-004).
- **Time:** about 25 hours of build time.
- **Cost:** free tiers only for the MVP; free-tier AI data-use terms limit the MVP to fictional data
  (ADR-002).
- **Platform:** HTTPS web app usable on iOS Safari and Android Chrome; browser mic for capture.
- **Language:** Filipino (Taglish-friendly) or English UI (ADR-005).
- **Law (Philippines):** RA 10173. Consent may be written, electronic, or recorded (§3(b)); health is
  sensitive personal information (§3(l)), hence the Kalusugan cut; heirs may invoke a deceased data
  subject's rights (§17), which matters for post-death deletion requests. Real users require a
  compliance review.
- **Ethics:** no simulation, no synthetic voice, no invented memories (PRD F-022).

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Judges expect a simulated "digital person" from the sub-theme | Medium | Relevance and Innovation in Design scores | Pitch "representation, not replica"; show real-voice answers through Ask GUNITA |
| Families care after a death, not before (UGAT risk 1), so the During archive stays empty | High | Memorial has little From them content | Memorial still works with family and visitor memories; test capture triggers in pilots |
| Funeral partners don't adopt | Medium | No channel | Direct sales first; partner interviews with a real offer |
| Willingness to pay unknown | High | No revenue | Real-price test; no pricing claims in the pitch beyond "hypothesis" |
| Privacy incident with real family data | Low (MVP uses fictional data) | Severe | Fictional data only; paid no-training tiers and private storage before real users (ADR-002) |
| Free-tier limits hit during judging | Medium | Demo failure | Gemini fallback; seeded data; rehearsal (Ops runbook) |
| Long-term memorial hosting obligation | Medium | Families lose memorials if hosting stops | Export and hosting terms to be defined before selling (post-MVP) |
| Grief sensitivity | Medium | Harm, reputation | Consent, moderation, no engagement loops (PRD BR-080) |

**Riskiest assumption:** families will capture knowledge while the person is alive, so that the
memorial has the person's own words.

## Validation plan (post-hackathon)

Adapted from the UGAT tab's validation phases:

1. **Problem interviews:** 10 people who already keep family photos or recipes. Prompt: "Show me one
   family photo whose full context you don't know." Signal: at least 5 of 10 show a concrete
   instance (UGAT's internal rule, not a market benchmark).
2. **Concierge pilot:** 3 families run capture → review → Ask with the team's help. Measure verified
   memories recovered and whether a GUNITA Question led to a new contribution.
3. **Partner interviews:** 3–5 funeral homes or memorial parks shown the Memorial package with a
   real price. Signal: a paid pilot commitment, not compliments.
4. **Commercial test:** a real offer to families at a real price, with a real payment method.
