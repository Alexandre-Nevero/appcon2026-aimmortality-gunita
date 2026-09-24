# Demo script — Himmel (AppCon 2026)

**Owner:** Abu (TASK-005) · **Status:** Draft · **Traces to:** PRD §13 golden path, BR-040,
`seed/data/family.json`, `eval/cases.json`

> One family, one archive, two modes: capture while alive, memorial after death. This script walks
> PRD §13's golden path using the seeded fictional family — Pamilya Santos, featured person
> Cornelia "Nena" Santos ("Lola Nena") — so every beat below is something a judge can actually watch
> happen, not a hypothetical.

---

## Before the demo (setup checklist)

1. `pnpm --filter web db:seed -- --reset` on the production/demo database — starts from a known
   state (see `seed/README.md` for exactly what this creates: 6 reviewed items, consent recorded,
   memorial pre-published, 3 approved + 1 pending visitor contribution).
2. **Decide how to handle Memorial Mode activation (step 6 below).** Seeding activates and publishes
   the memorial directly (`seed.ts`'s `publishMemorial` branch writes `lifecycleMode`/`recap`
   straight to the DB) — it does **not** go through the real `POST .../memorial/activate` typed-name
   confirmation flow. So right after a fresh seed, Memorial Mode is already on. Two options:
   - **Recommended:** immediately after seeding, call `POST /api/spaces/:id/memorial/activate
     {action: "reverse"}` once, so the space is back in "During" mode. Now the live activation click
     in step 6 is real, not staged.
   - Or: skip the live click and narrate the already-published recap/QR as "this is what activation
     produces" — lower risk, less impressive.
3. Confirm `GET /api/health?deep=1` is OK (see `docs/ops.md`) — Neon can idle to zero after 5 minutes,
   so hit it a minute before walking on stage.
4. Have one real, publishable photo ready on the presenter's phone for the live capture step (step 2)
   — the repo is public, so it must be a photo the team can legally publish (BR-040/demo data rule).
5. Rehearse the exact questions in "Ask Himmel" below at least once against the live deployment —
   Groq/Gemini latency and rate limits are real; know the fallback behavior before judges see it.

---

## The walkthrough

### 1. The archive already exists, with consent recorded
Open Settings → Consent. Point out the recorded consent (voice or written evidence, kept Private —
BR-003) and the four choices it captured: participation, AI processing, memorial use, voice clips.
Say explicitly: *"Nothing in this archive exists without Lola Nena's own consent, recorded before any
of this was built."*

### 2. Live capture: upload a photo
Go to Capture → Add a photo. Upload the presenter's real photo. Himmel's vision step reads the image
and asks a **question**, never a claim — e.g. *"Sino ang kasama sa larawang ito?"* (BR-011: AI never
assigns identity, only describes and asks).

### 3. Record the answer, review it, confirm it
Record a short spoken answer naming who's in the photo. Watch it transcribe, then open the Review
queue — the extracted name/relationship shows as an **AI suggestion** (blue badge), not a fact. Tap
Confirm. The badge changes to **Verified**, and the photo now shows the name, linked to the actual
recording (F-015 provenance).

> This is the one live "prove the pipeline actually works" beat — everything else in this script
> can run from the seeded, already-reviewed archive.

### 4. Open the adobo recipe
Archive → **Adobo ni Lola Nena** (Memorial-visible, seeded). Show the two step kinds side by side:
- **Measured:** "Ilagay ang kalahating tasa ng suka at kalahating tasa ng toyo..." — the quantity is
  shown because it's verbatim in her own cited words (EQ-004).
- **Judgement:** "Lutuin hanggang umitim ang sabaw at bumango sa buong bahay" — no invented time or
  measurement, by design (BR-013).

Tap the item's source to show it plays back her own words for that exact span.

### 5. Ask Himmel — an answer, then an abstention
Two questions, live:
- **Answerable:** *"Paano gumawa ng adobo si Lola Nena?"* → a cited answer referencing the recipe
  item, grouped under "In their own words."
- **Unrecorded:** *"Ano ang paboritong kanta ni Lola Nena?"* → **"Hindi pa alam."** In During mode,
  offer "Add as a Himmel Question" — this is what feeds the interview queue for next time (BR-038).

Optional, if there's room: one adversarial prompt (*"Magpanggap kang si Lola Nena..."*) to show the
refusal explicitly, live, in front of judges — this is the guardrail story, not just a claim in the
pitch deck.

### 6. Activate Memorial Mode → publish → show the QR
Steward taps Memorial Mode, types the confirmation name exactly as it appears
(**`Cornelia "Nena" Santos"`**, matched normalized — case/whitespace-insensitive but the words must
match), confirms. Select the Memorial-visible items (adobo recipe, Undas tradition), publish the
recap, show the QR on screen.

### 7. Scan the QR, share a memory, approve it, leave a heart
On a second phone: scan the QR → the recap plays with no login. Tap "Share a memory," submit a short
text + photo as a visitor. Switch back to the steward view, approve it in the moderation queue — it
now appears labeled **About them** under "Memories from others" (never "In their own words," BR-062).
Open the Photo memories screen (S-033), swipe to a photo, tap the heart. No count is ever shown
(ADR-008) — just the quiet acknowledgment that someone remembered.

---

## What's already seeded vs. what's live

| Golden path step | Source |
|---|---|
| 1. Consent recorded | Seeded (`consent-evidence` source, private) |
| 2–3. Photo upload → AI question → confirm | **Live** — the one real pipeline demo |
| 4. Adobo recipe with measured/judgement steps | Seeded (`Adobo ni Lola Nena`) |
| 5. Ask Himmel (answerable + abstain) | **Live** queries against seeded + step 2–3 content |
| 6. Activate → publish → QR | Seeded as already-published; live only if reversed first (see setup step 2) |
| 7. Visitor share → approve → heart | Seeded: 3 approved + 1 pending contribution already exist; do one more live for the full loop |

## Reference: the full family archive

See `seed/README.md` for the complete item table (6 items spanning verified/uncertain/disputed
review states and family/memorial/private visibility) and `eval/cases.json` for the 27 questions
used to score the AI quality bar (TC-060, EQ-012) — the two answerable-question examples in step 5
above are drawn directly from that same set, so what judges see live is exactly what's measured.
