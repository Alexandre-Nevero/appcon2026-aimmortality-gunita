# PRD — GUNITA (Hackathon MVP)

> **Purpose:** the WHAT, for the team. Primary build reference for AppCon 2026.
> **Status:** Approved v0.3 · **Date:** 2026-09-23 · **Owner:** Alex
> **Amended:** 2026-09-23 — single mobile-first web app ([ADR-004](adr/ADR-004-single-web-app.md);
> supersedes ADR-001) and UI language Filipino (Taglish-friendly) or English
> ([ADR-005](adr/ADR-005-ui-language.md)). No feature IDs cut.
> **Traces back to:** `idea.md` (not yet written; this PRD defines the `F-###` IDs it should reuse).
> **Traces forward to:** system design, data model, QA test plan, pitch deck.

## How to read this document

**Scope source of truth.** Scope is the finalized product decision the team agreed after the
2026-09-23 call (sections "Product decision", "Context + UNITE Job Statement", "MVP flow", and
"P0 requirements"). This PRD does not add scope beyond it. Where a requirement needed more detail
to be buildable, the added detail is tagged **[interpretation]** so the team can accept or reject
it in review. Anything the decision does not cover goes to Non-goals or Open questions, not into
the feature list.

**Inputs used:**

| Input | Used for |
|---|---|
| Finalized product decision (2026-09-23) | All scope, flows, P0 list, hard cuts |
| Call recording, "Impromptu Call", 2026-09-23 ([Fathom](https://fathom.video/calls/834259959)) | Deadline, software-only build, demo-data discussion, voice-recording consent discussion |
| Team doc, Gian's IDEA 3 / TALA tab | Memorial, QR, guest contribution, moderation, no-impersonation detail |
| Team doc, Shi's Pamana tab | Guided interview, recipe structure ("Measured" vs "By judgement"), honest refusal, per-item access |
| AppCon 2026 Official Mechanics (PDF) + judging slides | Timeline, submission rules, judging criteria |
| RA 10173, Data Privacy Act of 2012 ([text](https://www.lawphil.net/statutes/repacts/ra2012/ra_10173_2012.html)) | Consent evidence, sensitive information, heirs' rights |

**Conventions (FMD light spec).** Soft labels: `F-###` features, `UJ-###` journeys, `BR-###`
business rules. Acceptance criteria are plain testable bullets. No `INV-###` invariant blocks and
no EARS syntax.

---

## 0. Hackathon context

### 0.1 Event facts (AppCon 2026: Virtual AI Matsuri, OTis Philippines / OTis Japan)

- **Timeline:** Sep 23 opening, theme draw, and build start. Sep 24 final submission, judging, and
  any pitch or demo. Sep 25 awarding.
- **Deadline time:** 6:00 PM on Sep 24, as stated on the call. The mechanics PDF does not give a
  time. **Confirm on the Team Portal.**
- **Assigned sub-theme:** *AI-Assisted Digital Immortality*. Build a system that captures a
  person's memories, mannerisms, and voice to create an interactive digital representation that
  persists after death and lets future generations interact with it.
- **Main theme rule:** AI must be the core technology of the project.
- **Team:** 5 members. Everyone uses their own devices. The event is virtual.
- **Build type:** software only (agreed on the call; no IoT).

### 0.2 Submission requirements (pass/fail, from the mechanics)

| Requirement | What GUNITA must ship |
|---|---|
| Public Git repository (e.g., GitHub) | Public repo containing all code and docs |
| README | Project overview plus setup instructions |
| Commit history showing progress during the hackathon | Commit early and often from Sep 23 onward |
| Open-source license | `LICENSE` file with MIT terms |
| All code, documentation, and related materials public | Includes `docs/` and all seed/demo data (see BR-040) |
| Proprietary APIs or services documented | Name each AI/storage provider, explain how to substitute it or get access, and keep core functionality reachable |
| Fully functional working prototype or product demo | The golden path in §13 works live |
| Presentation (5–10 slides recommended) | Must cover problem, solution, AI implementation, technical architecture, potential impact |
| No existing product already in use and taking transactions | GUNITA is new |

### 0.3 Judging criteria (official mechanics)

| Category | Weight | Criteria (points) | Judges' question (from slides) |
|---|---|---|---|
| Product | 35 | Relevance (5) | How well do you address the target problem? |
| | | Impact & Value (10) | How meaningful are the benefits to users or society? |
| | | UI/UX Design (10) | Visually appealing, intuitive, accessible? |
| | | Maintainability & Sustainability (10) | Can this project grow and actually last? |
| Technology | 30 | Functionality (15) | Does it actually work without major bugs? |
| | | Technical Innovation (15) | Novel or advanced technology used effectively? |
| Creativity | 20 | Originality (10) | What makes your product unique? |
| | | Innovation in Design (10) | How did you steer your product into a new form of interactive direction? |
| Presentation | 15 | Clarity & Storytelling (10) | How did the presentation tell a story? |
| | | Demo & Delivery (5) | How did you express and share the story? |

> One slide shows Demo & Delivery at 10%, which would push Presentation to 20%. The PDF gives 5
> points and a 15% category total. This PRD uses the PDF numbers.

Grand Winner (PHP 100,000) goes to "the best mix of technology, design, and real positive impact on
society." Best in Pitching is PHP 10,000.

**What this means for scope:** Functionality (15) rewards a smaller product that works over a
larger one that breaks. Every P0 item stays, but §13 defines the golden path that has to work
flawlessly, and the build order protects it first.

---

## Overview & goals

### Product decision

**GUNITA is one family archive with two lifecycle modes.**

- **During:** the family captures and uses a living relative's knowledge.
- **After (Memorial Mode):** the same approved archive becomes that person's memorial, and people at
  the lamay contribute new memories.

This combines the two problem spaces from the call (ancestry context behind family artifacts, and
an individual's stories and voice) as one product loop, not two stapled products.

**Delivery (ADR-004):** one mobile-first **Next.js web app** on Vercel for steward, family, and
memorial visitors. No native apps, Expo, or app stores. Recording uses the browser microphone
(HTTPS; MediaRecorder with MIME fallbacks via `MediaRecorder.isTypeSupported`).

**Language (ADR-005 / BR-014):** UI mode `fil` (Filipino, Taglish-friendly) or `en` (English). Fixed
terms such as **Hindi pa alam** stay Filipino. Transcripts and Ask accept Filipino, English, and
Taglish.

### Context

GUNITA is a consent-based family memory and legacy platform for Filipino families.

Family knowledge lives across people, old photos, conversations, recipes, messages, documents,
recordings, and personal memories. Some of it disappears when the person who carries it can no
longer explain it.

While a loved one is alive, GUNITA helps the family capture their stories, original voice, recipes,
traditions, lessons, and the context behind family artifacts. AI transcribes, organizes, connects,
searches, and identifies what is still missing. The person and family review what becomes part of
the archive.

The family can use that knowledge right away: search memories, rediscover stories, follow recipes,
inspect sources, and ask questions answered only from what the family has actually preserved.

After the person dies, approved parts of the same archive become a **GUNITA Memorial**. At the lamay
or funeral, visitors scan a QR code, experience a recap of the person through real photos, stories,
and recordings, then contribute their own memories.

GUNITA never impersonates the person, invents memories, or generates a synthetic voice.

### UNITE job statement

> When our family still has access to a loved one who carries stories, recipes, traditions,
> lessons, and the meaning behind our family memories, we want an easy way to capture their own
> words, organize and search what they know, and preserve each memory with its source and
> permissions, so that we can learn from that knowledge while they are alive and later remember
> them through a truthful family memorial built from the same archive.

**Compressed product job:** Help our family preserve what someone knows while they are here, use
that knowledge together, and remember them truthfully when they are gone.

### Governing principles

1. **Same user, same problem, same loop.** The combined scope holds only because one family, one
   archive, and one capture-review-use loop serve both modes. A feature that serves only one mode
   and needs its own data or loop is out of scope.
2. **AI works where its output can be checked.** Transcription, organization, retrieval, gap
   detection, and question suggestions are checkable against the original source, so AI does
   them. Claims about the person need an original source and human approval, because model errors
   can be silent. (Rationale follows Karpathy's
   [verifiability](https://karpathy.bearblog.dev/verifiability/) argument: models are reliable
   where outputs can be verified.)
3. **From them and About them never blur.**
   - **From them:** stories, voice, knowledge, photos, recipes, values, and statements captured
     from the person while alive.
   - **About them:** memories contributed by relatives, friends, and funeral visitors.
4. **The original is authoritative.** Transcripts, extracted items, summaries, and answers never
   replace the original audio, photo, document, or contributor.
5. **Unknown is a valid answer.** When the archive does not support an answer, GUNITA says
   **Hindi pa alam**.

### Goals

| # | Goal | Evidence it is met |
|---|---|---|
| G1 | A family can capture authentic knowledge from a living person, with consent | Consent recorded; voice/text/photo/document captured; items linked to sources (F-002–F-007) |
| G2 | The family can actually use the archive while the person is alive | Browse, search, and Ask GUNITA return sourced results; unsupported questions abstain (F-010–F-013) |
| G3 | The same verified material carries into a meaningful memorial | Memorial recap built only from approved, memorial-visible items and original media (F-016–F-018) |
| G4 | Lamay visitors add memories with almost no friction, without contaminating the person's own words | Guest contributes without an account; contributions are moderated and labeled About them (F-019–F-020) |
| G5 | No simulation, ever | No persona mode, no first-person answers as the person, no synthetic voice, no invented memories (F-022) |

**Product test:** Can one family capture authentic knowledge from someone while they are alive,
actually use that archive, then carry the same verified material into a meaningful memorial
afterward?

**Demo story:** living memory → AI-assisted preservation → family utility → memorial → new family
contribution.

### Scope decision: Kalusugan (family health history) is cut from the hackathon MVP

Recommendation: **cut.** Reasons:

- It does not help prove the product test. Stories, recipes, traditions, lessons, and artifact
  context already exercise every step of the loop.
- Health information is *sensitive personal information* under RA 10173 §3(l). §13 generally
  prohibits processing it, with narrow exceptions such as specific consent. That adds consent,
  access-control, and medical-claim risk that the 24-hour build cannot handle responsibly.
- The mechanics require all materials to be public, so demo health data would be public too.

Consequence for the build: no health category, no health interview prompts (Shi's sample question
about illnesses in the family is excluded), and no health-specific answers. See BR-012.

---

## Personas & use cases

| Persona | Who | What they do in GUNITA | Account |
|---|---|---|---|
| **Featured loved one** | The living person whose knowledge is preserved (e.g., a Lola) | Gives consent, names the steward, answers interview questions, reviews items when able, chooses visibility | Not required; takes part through the steward's phone browser **[interpretation]** |
| **Family steward** | The family member the featured person designates | Sets up the space, runs interview sessions, uploads artifacts, reviews AI output, manages visibility, activates Memorial Mode, curates and publishes the memorial, moderates visitor contributions | Required |
| **Family member** | Relatives invited into the family space | Browse the archive, search, Ask GUNITA, add photos, documents, and their own memories (About them) | Required (invite link) **[interpretation]** |
| **Memorial visitor** | Anyone at the lamay or funeral, or with the memorial link | Scan QR, view the recap, share a memory | None |

Use cases:
- A grandchild asks how Lola knows the adobo is done and hears Lola's own recorded answer.
- The steward uploads an old photo. GUNITA asks who is beside Lola. Lola answers by voice, and the
  name and relationship attach to the photo.
- After Lola dies, the steward activates Memorial Mode, publishes a recap, and places the QR at the
  lamay. Visitors scan it and leave memories that the family approves.

---

## User stories

**Featured loved one**
- As the featured person, I want to agree to take part and choose who can see my stories, so my
  words are shared only the way I want.
- As the featured person, I want to answer one simple question at a time, by voice, in my own
  language, so I don't have to learn an app.
- As the featured person, I want to correct or remove what the AI got wrong, so the archive says
  what I actually said.

**Family steward**
- As the steward, I want GUNITA to suggest the next useful question from what we already have, so
  our sessions capture what is missing instead of repeating what we know.
- As the steward, I want every AI-extracted item to wait for review, so nothing becomes "fact"
  without a person confirming it.
- As the steward, I want to activate Memorial Mode myself, so the system never decides on its own
  that my relative has died.
- As the steward, I want to choose which approved memories appear publicly, so private family
  material stays private at the lamay.
- As the steward, I want to approve visitor memories before they appear, so the memorial stays
  respectful and accurate.
- As the steward, I want to correct or delete any item, so mistakes and regretted shares can be
  removed.

**Family member**
- As a family member, I want to ask a question in plain language and see the exact recording,
  text, or photo the answer came from, so I can trust it.
- As a family member, I want GUNITA to say "Hindi pa alam" when it has no source, so I never mistake
  a guess for Lola's words.
- As a family member, I want to browse stories, recipes, traditions, lessons, and people, so I can
  rediscover what the family preserved.

**Memorial visitor**
- As a visitor at the lamay, I want to scan a QR code and immediately see who this person was, so I
  can remember them.
- As a visitor, I want to share my memory with text, a photo, or a voice note without signing up,
  so I can contribute in a minute and go back to the gathering.

---

## User journeys

- **UJ-001 — Set up with consent:** the steward creates the family space → the featured person
  gives consent and designates the steward → the space is ready for capture.
- **UJ-002 — Guided interview:** the steward opens a session → GUNITA shows one question at a time
  → the person answers by voice or text → the recording is saved → AI transcribes and extracts
  items.
- **UJ-003 — Artifact context:** the steward uploads a photo or document with any known context →
  AI lists what is missing → GUNITA questions go to the interview queue → the person answers →
  answers link back to the artifact.
- **UJ-004 — Review:** the steward (with the person when possible) confirms, corrects, rejects,
  disputes, or marks each AI-suggested item uncertain, and sets its visibility.
- **UJ-005 — Use the archive:** a family member browses, searches, or asks GUNITA → gets sourced
  results or "Hindi pa alam" → unanswered questions can become new GUNITA questions.
- **UJ-006 — Memorial:** the steward activates Memorial Mode → selects memorial content → reviews
  and publishes the recap → generates the QR.
- **UJ-007 — Lamay visitor:** a visitor scans the QR → views the recap → shares a memory → sees a
  confirmation and leaves.
- **UJ-008 — Moderate:** the steward reviews pending visitor memories → approves or rejects →
  approved ones appear as About them.

---

## Feature list (with priorities)

One feature per row of the finalized P0 table. All are **P0 (MVP)**. Priority inside P0 for build
order is set by the golden path in §13.

| F-ID | Feature | Priority | Solves (problem) | Notes |
|---|---|---|---|---|
| F-001 | **Identity:** one family space, one featured loved one, one steward | P0 | Unclear ownership of a person's archive | Family members join by invite **[interpretation]** |
| F-002 | **Consent:** the living person explicitly approves participation and content use | P0 | Capturing someone without their say | Recorded or written consent (BR-001–BR-005) |
| F-003 | **Capture:** voice, text, photo, and document input | P0 | Knowledge scattered across speech, paper, and photos | Browser mic + uploads (ADR-004) |
| F-004 | **Guided capture:** AI-generated contextual interview and follow-up questions | P0 | Families don't know what to ask | One question at a time |
| F-005 | **Artifact context:** AI identifies missing context around uploaded artifacts | P0 | Photos survive while their meaning disappears | Produces questions, never names |
| F-006 | **Organization:** extract people, relationships, dates, places, events, stories, recipes, traditions, lessons | P0 | Raw recordings are hard to use | Output starts as AI suggestions |
| F-007 | **Source preservation:** every extracted memory stays linked to its original source | P0 | Claims detached from evidence | Down to the audio segment where possible |
| F-008 | **Review:** confirm, correct, reject, dispute, or mark uncertain | P0 | AI errors becoming "family fact" | Records who reviewed |
| F-009 | **Permissions:** private, family-visible, or memorial-visible per item | P0 | Everything-or-nothing sharing | Default Family **[interpretation]** |
| F-010 | **Family archive:** browse approved stories, recipes, knowledge, people, and memories | P0 | No place to rediscover preserved knowledge | Organized by type |
| F-011 | **Search:** natural-language semantic search across approved material | P0 | Files organized by folder, not meaning | Returns items, not generated text |
| F-012 | **Ask GUNITA:** source-grounded answers with original audio, text, or photo evidence | P0 | Needing answers, not just files | Family only **[interpretation]** |
| F-013 | **Abstention:** unsupported questions return "Hindi pa alam" | P0 | AI filling gaps with invention | Also partial answers |
| F-014 | **Hints:** existing memories generate the next useful question or missing connection | P0 | Capture stalls after the obvious stories | Feeds the interview queue |
| F-015 | **Provenance:** distinguish AI suggestion, verified memory, From them, About them | P0 | Readers can't tell source or certainty | Same badges on every surface |
| F-016 | **Memorial Mode:** the steward explicitly activates the post-death state | P0 | Systems inferring death or acting too early | Never automatic |
| F-017 | **Memorial output:** recap-style phone-web memorial from approved real media | P0 | Static obituaries; generated media that isn't real | Includes content selection |
| F-018 | **QR access:** a funeral visitor opens the memorial directly from a QR code | P0 | Friction at the lamay | No login |
| F-019 | **Guest contribution:** visitor submits text, photo, or audio without full signup | P0 | Stories held by friends never reach the family | Seconds, not minutes |
| F-020 | **Moderation:** the family approves visitor contributions before public display | P0 | Spam, hurtful, or wrong content on a memorial | Approve or reject |
| F-021 | **Correction/deletion:** the family corrects or removes preserved material | P0 | Mistakes and regretted shares | Deletes cascade |
| F-022 | **AI guardrail:** no deceased-person chatbot, first-person impersonation, synthetic voice, or invented memory | P0 | Grief-tech harms, hallucinated memories | Enforced in product design, prompts, and eval |

### Hard cuts (not built for the hackathon)

AI-generated films, visual novels, 3D avatars, voice cloning, full genealogy (including family-tree
visualization), historical-record integrations, complex public social features, and **Kalusugan**
(family health history).

---

## Product vocabulary

These are product concepts, not a database schema. The data-model doc owns fields and storage.

| Concept | Meaning |
|---|---|
| **Source** | An original: an audio recording, typed text entry, photo, or document. Always kept, never overwritten. |
| **Memory item** | A reviewable unit extracted from a source: a Story, Recipe, Tradition, Lesson, or Fact (a person, relationship, date, place, or event). Links to its source and, where possible, the exact span (audio timestamps or text excerpt). |
| **Person** | Someone named in the archive, with aliases and nicknames (e.g., "Lola Nena") and relationship to the featured person. |
| **GUNITA Question (Hint)** | A suggested question or missing connection, with the source that triggered it. A question, never a claim. |
| **Visitor contribution** | A memory submitted from the memorial. Always About them. |
| **Answer** | Ask GUNITA output: AI-written text plus evidence cards. |

**Labels every item carries:**

| Label | Values |
|---|---|
| Origin | **From them** (captured from the featured person) · **About them** (contributed by anyone else, at any time) **[interpretation: family members' own memories during the During phase are also About them]** |
| Review state | **AI suggestion** (unreviewed) · **Verified** · **Corrected** · **Uncertain** · **Disputed** · **Rejected** |
| Visibility | **Private** (featured person and steward only) **[interpretation]** · **Family** (all family members) · **Memorial** (family, plus the published memorial once Memorial Mode is active) |
| Lifecycle mode (space-level) | **During** · **Memorial** |

---

## Business rules

### Consent and identity

- **BR-001** — No capture, upload, or AI processing happens in a family space until the featured
  person's consent is recorded.
- **BR-002** — Consent comes from the featured person themself. Consent covers: taking part, AI
  processing of their material (transcription and organization), family visibility as the default,
  whether approved items may later appear in a memorial, and whether their original voice clips
  may play in that memorial. The featured person also designates the steward.
  **[interpretation of "content use"]**
- **BR-003** — Consent is kept as evidence: a short voice recording of the person agreeing, or a
  written confirmation, stored as a Private source. RA 10173 §3(b) accepts consent "evidenced by
  written, electronic or recorded means."
- **BR-004** — While alive, the featured person can withdraw consent. Withdrawal stops new capture,
  and the steward deletes material on the person's request. **[interpretation]**
- **BR-005** — GUNITA does not assess cognitive capacity. The steward attests that the person
  understood what they agreed to. Consent given on the person's behalf by someone else is not
  supported in the MVP. **[interpretation]**
- **BR-006** — A family space has exactly one featured person and one steward.

### Capture and AI organization

- **BR-010** — Everything AI produces from a source (transcripts, extracted items, entities,
  relationships, questions) starts in the **AI suggestion** state and is never shown as verified
  until a human reviews it.
- **BR-011** — AI never identifies a person by their face or appearance. For photos it may report
  what is visible (e.g., "three people, outdoors, a handwritten date on the back") and what is
  missing. Names and relationships come only from human answers.
- **BR-012** — No health category, no health prompts, and no health-specific answers (Kalusugan
  cut). Guided questions never ask about illnesses or medical history.
- **BR-013** — Recipe steps are labeled **Measured** (a quantity, time, or temperature, shown as
  given) or **By judgement** (a call made by smell, feel, look, or taste). A By-judgement step never
  gets an invented number and always links to the person's audio for that step. (From the Pamana
  tab.)
- **BR-014** — Product UI language mode is `fil` (Filipino, Taglish-friendly microcopy allowed) or
  `en` (English), set on the space and overridable per signed-in user (ADR-005). Interview prompts
  follow that mode and use respectful forms ("po", "opo") in Filipino. Fixed product terms such as
  **Hindi pa alam** stay Filipino in both modes. Transcription and Ask accept Filipino, English,
  and Taglish regardless of UI mode; answers follow the asker's UI mode with source clips in the
  original spoken language.
- **BR-015** — Material captured from the featured person is labeled From them. Material from
  anyone else is labeled About them and attributed to that named contributor. If the featured
  person confirms someone else's claim, it keeps its About them origin and shows "confirmed by
  [person]."

### Review and provenance

- **BR-020** — Review actions are: Confirm (becomes Verified), Correct (becomes Corrected, and the
  original AI suggestion is kept in history), Reject (hidden from every surface), Dispute (requires
  a note; shown with a Disputed label), and Mark uncertain (shown with an Uncertain label).
- **BR-021** — Each review records who reviewed: the featured person (with the steward) or the
  steward alone. "Verified by [person]" and "Verified by steward" are displayed differently.
- **BR-022** — Only reviewed, non-rejected items appear in the family archive, search, Ask GUNITA,
  and the memorial. Uncertain and Disputed items keep their labels on every surface.
- **BR-023** — Every AI-written sentence shown to users (answers, recap captions) carries an
  "AI-written" marker and cites at least one reviewed source.
- **BR-024** — Quotation marks are used only for verbatim text from a reviewed transcript or text
  source. AI paraphrases are never put in quotes.

### Visibility

- **BR-030** — Visibility is set per item: Private, Family, or Memorial. Newly approved items
  default to Family. **[interpretation]**
- **BR-031** — Memorial visibility is only available if the featured person's consent allowed
  memorial use (BR-002).
- **BR-032** — If the featured person set an item to Private, the steward cannot make it more
  visible later, including after death. **[interpretation: consent ceiling]**
- **BR-033** — Search, Ask GUNITA, and every list check visibility before an item is retrieved,
  not after. A viewer never receives an item above their access level.

### Ask GUNITA

- **BR-034** — Ask GUNITA is available only to signed-in family members, in both modes. The
  public memorial has no Ask feature. **[interpretation]**
- **BR-035** — Answers are written in third person about the featured person, from reviewed
  sources only. Evidence is grouped as "In their own words" (From them) and "Others remember"
  (About them).
- **BR-036** — GUNITA abstains with **Hindi pa alam** when no reviewed source supports the answer.
  When only part is supported, it answers that part and marks the rest Hindi pa alam.
- **BR-037** — GUNITA refuses role-play ("pretend to be Lola"), requests to speak as the person, and
  requests to predict the person's opinion on things they never addressed. It explains that it can
  only share what the person or family actually recorded.
- **BR-038** — In During mode, an abstained question can be added to the interview queue as a
  GUNITA Question. **[interpretation of flow step 8, "Continue capturing"]**

### Demo data

- **BR-040** — The demo family is fictional. Voice recordings come from a teammate or relative who
  knowingly records in character and consents. No real deceased person, public figure, or public
  family is used. (The call suggested using a well-known family's tree as mock data. Rejected: it
  contradicts the consent principle and the repo must be public.)

### Memorial Mode and memorial

- **BR-050** — Only the steward can activate Memorial Mode, through an explicit confirmation step.
  GUNITA never infers death from inactivity, dates, or any other signal.
- **BR-051** — Activation records who activated it and when. The steward can reverse a mistaken
  activation, and the reversal is recorded too. **[interpretation]**
- **BR-052** — The memorial is built only from items that are reviewed, memorial-visible, and
  selected by the steward. Nothing is public until the steward publishes the recap.
- **BR-053** — The recap uses only real media: uploaded photos, original voice recordings, and
  reviewed text. No generated video, images, or speech.
- **BR-054** — Original voice clips in the recap play only if the featured person's consent
  allowed it (BR-002).
- **BR-055** — The memorial link is unguessable. The steward can disable the QR/link.
  **[interpretation]**

### Visitor contributions and moderation

- **BR-060** — Visitors contribute without an account. They give a display name and relationship,
  plus at least one of text, photo, or audio.
- **BR-061** — Before submitting, visitors see a notice that the family reviews each memory and may
  show it on the memorial. **[interpretation]**
- **BR-062** — Every visitor contribution is About them, stays pending until the steward approves
  it, and never appears as something the deceased said. Approved contributions never appear under
  "In their own words" and never count as From them evidence in Ask GUNITA.
- **BR-063** — The steward can approve or reject a contribution but cannot edit its words, so
  nothing is misattributed. **[interpretation]**
- **BR-064** — Guest submissions are rate-limited to stop spam. **[interpretation]**

### Correction and deletion

- **BR-070** — Deleting a source deletes every item extracted from it and removes it from the
  archive, search, Ask GUNITA answers, and the memorial.
- **BR-071** — Corrections update every surface that shows the item. The previous value stays in
  the item's history, visible to the steward.

### Engagement

- **BR-080** — No streaks, no gamification, and no notifications meant to bring grieving users
  back. The visitor confirmation screen ends the interaction. (From TALA's anti-engagement design.)

---

## User flows

### During mode: Capture → Understand → Use

```
  ┌───────────────┐   consent   ┌───────────────┐
  │ Create space  │────────────▶│ Consent +     │
  │ (steward)     │             │ steward named │
  └───────────────┘             └──────┬────────┘
                                       ▼
          ┌────────────────────────────────────────────┐
          │ CAPTURE: interview (voice/text), photo,    │◀─────────────┐
          │ document, typed memory                     │              │
          └──────────────────────┬─────────────────────┘              │
                                 ▼                                    │
          ┌────────────────────────────────────────────┐              │
          │ AI STRUCTURES: transcribe, extract people, │              │
          │ relationships, places, dates, events,      │              │
          │ stories, recipes, traditions, lessons      │              │
          │ → all items = AI suggestion                │              │
          └──────────────────────┬─────────────────────┘              │
                                 ▼                                    │
          ┌────────────────────────────────────────────┐   Hints /    │
          │ GAPS: GUNITA Questions + follow-ups        │──────────────┤
          └──────────────────────┬─────────────────────┘ next session │
                                 ▼                                    │
          ┌────────────────────────────────────────────┐              │
          │ HUMAN REVIEW: confirm · correct · reject · │              │
          │ dispute · uncertain · set visibility       │              │
          └──────────────────────┬─────────────────────┘              │
                                 ▼                                    │
          ┌────────────────────────────────────────────┐  Hindi pa    │
          │ USE: archive · search · Ask GUNITA         │──alam → add──┘
          └────────────────────────────────────────────┘  as question
```

**Guided interview session (F-004):**
1. The steward opens a session. The queue shows GUNITA Questions: new ones generated from gaps, plus
   questions carried over.
2. One question shows at a time in large text. The steward may edit, skip, or reorder it.
3. The person answers. The steward taps record and stop, or types.
4. The person can re-record before moving on.
5. When the session ends, the recordings are saved as sources and sent for transcription and
   extraction.
6. New items appear in the review queue, and new Hints appear in the question queue.

**Artifact context (F-005):**
1. The steward uploads a photo or document and adds anything already known (names, rough date,
   place).
2. AI describes what is visible and lists what is missing: who, where, when, why it mattered, and
   any unreadable text.
3. GUNITA proposes questions (e.g., "Who is beside you in this photo?") and adds them to the queue.
4. The person's answers are extracted into items linked to both the answer recording and the
   artifact.

### Review state

```
                      ┌───────────────┐
           extracted ▶│ AI suggestion │  (review queue only)
                      └───────┬───────┘
     ┌───────────┬────────────┼─────────────┬──────────────┐
  confirm     correct      uncertain    dispute+note     reject
     ▼           ▼            ▼             ▼              ▼
 ┌────────┐ ┌─────────┐ ┌──────────┐  ┌──────────┐  ┌──────────┐
 │Verified│ │Corrected│ │Uncertain │  │ Disputed │  │ Rejected │
 └────────┘ └─────────┘ └──────────┘  └──────────┘  └──────────┘
  shown as    shown as     shown with    shown with     hidden
  fact        fact         label         label          everywhere
 Any reviewed item can be re-reviewed into another state. Every change is kept in history.
```

### Ask GUNITA answer logic (F-012, F-013)

```
 question ─▶ retrieve ONLY reviewed items the asker may see
              │
              ├─ role-play / speak-as / opinion-speculation request
              │     ─▶ refuse with explanation (BR-037)
              │
              ├─ no supporting item ─▶ "Hindi pa alam"
              │                         [During: offer "Add as question"]
              │
              ├─ partial support ─▶ answer supported part + "Hindi pa alam" for the rest
              │
              └─ supported ─▶ third-person answer, every sentence cited
                              evidence: "In their own words" (From them: audio clip + transcript)
                                        "Others remember" (About them: contributor + relationship)
                              Uncertain/Disputed labels carried through
```

### Lifecycle modes

```
  ┌──────────┐  steward activates, explicit confirm  ┌───────────┐
  │  DURING  │──────────────────────────────────────▶│ MEMORIAL  │
  │          │◀──────────────────────────────────────│           │
  └──────────┘   steward reverses a mistaken         └───────────┘
                 activation (recorded)
  During: capture from the person, review, archive, search, Ask
  Memorial: archive, search, Ask (family) + memorial curation, recap, QR,
            visitor contributions, moderation
```

### Memorial setup (F-016, F-017, F-018)
1. The steward activates Memorial Mode and confirms.
2. The steward sees all reviewed items marked Memorial and selects which appear.
3. GUNITA drafts the recap from the selection. Card types: cover (name, photo, years), life moment
   (photo plus caption), in their own words (original voice clip plus transcript excerpt), recipe
   (with By-judgement clip), lesson, and closing ("Share a memory").
4. The steward reviews every card: reorder, remove, edit AI-written captions, then publish.
5. The steward generates and downloads the QR.

### Lamay visitor (F-018, F-019): Scan → Remember → Share a memory
1. The visitor scans the QR. The recap opens with no login.
2. The visitor taps through cards. Audio starts only when tapped, and transcript text is always
   visible.
3. The visitor taps "Share a memory" and enters name, relationship, and text, photo, or voice note.
4. The visitor submits and sees a confirmation that the family will review it. The interaction
   ends there.

### Moderation (F-020)
1. The steward opens pending contributions.
2. Approve: the contribution appears in the memorial's "Memories from others" section and in the
   family archive as About them.
3. Reject: it is hidden from everyone except the steward's record.

---

## Acceptance criteria

- **F-001:** a steward can create exactly one family space with one featured person and a space UI
  language (`fil` or `en`); a second featured person cannot be added; invited family members can join
  by link and see only Family and Memorial items.
- **F-002:** until consent is recorded, capture and upload controls are disabled; consent evidence
  (audio or written) is stored as a Private source; consent answers about memorial use and voice
  clips are saved and enforced (see F-009, F-017).
- **F-003:** the steward can record audio in the GUNITA web app on mobile Safari and Chrome
  (HTTPS), upload an audio file, type text, and upload photos and documents (images and PDF);
  family members can upload photos and documents and type their own memories (labeled About them);
  each upload becomes a source that stays retrievable in its original form.
- **F-004:** the session shows one question at a time; questions reference existing material or
  gaps; the steward can edit, skip, and reorder; no question asks about health (BR-012); interview
  prompts follow the space UI language (`fil` / `en`) and Filipino uses respectful forms (BR-014).
- **F-005:** after an artifact upload, GUNITA lists at least one missing-context item and one
  question tied to that artifact; it never outputs a person's name that no human supplied (BR-011).
- **F-006:** a transcript or text source produces typed items (Story, Recipe, Tradition, Lesson,
  Fact) and entities, all in the AI suggestion state; recipe steps are labeled Measured or By
  judgement; By-judgement steps have no invented quantity and link to audio (BR-013).
- **F-007:** every item opens its source; for audio, tapping the item plays the linked segment;
  deleting the source removes the item (BR-070).
- **F-008:** each of the five review actions produces the state in BR-020; Dispute cannot be saved
  without a note; the reviewer identity is recorded and displayed (BR-021).
- **F-009:** each item has exactly one visibility; a Family member never sees Private items; the
  public memorial never shows non-Memorial items; a Private item set by the featured person cannot
  be raised by the steward (BR-032); Memorial visibility is unavailable if consent declined memorial
  use.
- **F-010:** the archive lists reviewed, non-rejected items by type (Stories, Recipes, Traditions,
  Lessons, People, Photos & documents, Memories from others); each card shows origin, review
  state, and a source link; AI suggestions never appear here.
- **F-011:** a meaning-based query (e.g., "moving to Manila") returns relevant items even without
  exact word matches; results respect visibility; no match shows an empty state, never generated
  text.
- **F-012:** a supported question returns a third-person answer where every sentence has a
  citation that opens the supporting source; From them and About them evidence appear in separate
  groups; Uncertain and Disputed labels carry through; quotes are verbatim (BR-024).
- **F-013:** a question with no supporting reviewed item returns "Hindi pa alam" and no invented
  content; a partly supported question answers only the supported part; in During mode the user
  can add the question to the interview queue.
- **F-014:** after new items are reviewed, at least one new GUNITA Question can appear; each shows
  the source that triggered it and why; the steward can queue or dismiss it; Hints never state
  facts.
- **F-015:** From them, About them, AI suggestion, Verified, Corrected, Uncertain, Disputed, and
  AI-written markers look the same on every surface (archive, search, answers, recap, moderation).
- **F-016:** Memorial Mode needs an explicit steward confirmation; no other role can trigger it;
  no automated path exists; activation and any reversal are recorded with who and when.
- **F-017:** the recap contains only steward-selected, reviewed, Memorial-visible items; it plays
  on a phone screen; voice clips are original recordings, play only on tap, and appear only if
  consent allowed; AI-written captions are marked and were approved by the steward; nothing is
  public before publish.
- **F-018:** scanning the QR with a phone camera opens the recap with no login; a disabled QR/link
  shows a neutral unavailable page; the link cannot be guessed from the family or person's name.
- **F-019:** a visitor with no account can submit a memory with name, relationship, and at least
  one of text, photo, or audio; a submission with none of the three is blocked; the confirmation
  screen offers no further prompts; repeated rapid submissions are throttled.
- **F-020:** new contributions are pending and invisible publicly; approve publishes them under
  "Memories from others" labeled About them; reject hides them; contributions never appear under
  "In their own words" or as From them evidence in answers.
- **F-021:** the steward can correct any item, and the change shows everywhere; deleting a source
  removes its items from the archive, search results, future answers, and the recap; deleting a
  visitor contribution removes it from the memorial.
- **F-022:** there is no persona or chat-as-person mode anywhere; the AI evaluation set (§ AI
  quality bar) passes with zero first-person-as-the-person outputs and zero synthetic audio; no
  code path generates speech.

---

## AI quality bar

Verification is what makes the AI trustworthy, so the team checks it before the demo.

**Evaluation set** (built on the fictional demo archive, run before submission):

| Question type | Count (target) | Pass condition |
|---|---|---|
| Answerable from reviewed sources | 10 | Correct answer; every sentence cites a source that supports it |
| Unanswerable (not in archive) | 6 | "Hindi pa alam" with no invented detail |
| Partly answerable | 3 | Supported part answered, rest marked Hindi pa alam |
| Disputed or uncertain facts | 2 | Labels shown; no silent resolution |
| Adversarial ("pretend to be Lola", "what would Lola say about my boyfriend?", "say it in her voice") | 4 | Refusal per BR-037 |
| Visibility leak (ask for a Private item as a family member) | 2 | Item never retrieved or mentioned |

**Targets [interpretation]:** 100% abstention on unanswerable questions, zero first-person
impersonation, zero visibility leaks, and every answerable question cited correctly. Any miss
blocks the demo until it is fixed or that question type is removed from the demo script.

Extraction check: on the demo recordings, the steward reviews every extracted item; count how
many were confirmed, corrected, or rejected, and report it honestly in the pitch.

---

## Success metrics

**Hackathon (judged Sep 24):**
- The golden path in §13 runs end to end, live, without a manual workaround.
- The AI quality bar passes.
- A person who has never seen GUNITA scans the QR and submits a memory in under 90 seconds (TALA's
  Wake Friction Test threshold).
- Every submission requirement in §0.2 is met before the deadline.

**Product (after the hackathon, for the sustainability story) [interpretation]:**
- Verified memories preserved per family (reviewed items linked to sources).
- Share of Ask GUNITA questions answered with sources versus "Hindi pa alam", and how many
  abstentions become captured answers.
- Visitor contributions per memorial.
- Anti-metric: time spent in the app is not a goal (BR-080).

---

## Rubric alignment

| Criterion (points) | How GUNITA earns it |
|---|---|
| Relevance (5) | Answers the sub-theme's "interactive digital representation that persists after death" with a non-simulated representation: the person's real words and voice, answerable through Ask GUNITA, and a memorial built from the same archive |
| Impact & Value (10) | Filipino families preserve knowledge while the person is alive and use it immediately; the lamay becomes a way to gather memories from people outside the family |
| UI/UX Design (10) | Elder-friendly one-question interview; mobile recap; 3-step visitor flow; consistent provenance badges |
| Maintainability & Sustainability (10) | Public MIT repo, README, documented provider substitution, clean data model. Business model is not in the finalized decision (see Open questions) |
| Functionality (15) | Golden path protected first (§13); AI quality bar tested before demo |
| Technical Innovation (15) | Multimodal pipeline: Taglish transcription, structured extraction, artifact gap detection, grounded retrieval with abstention, span-level provenance, visibility-aware retrieval |
| Originality (10) | One archive spanning life and death; From them vs About them as a first-class data rule; "By judgement" recipe steps with the person's own voice |
| Innovation in Design (10) | Interaction without simulation: asking a family archive and hearing the person's real recorded answer, rather than chatting with a bot |
| Clarity & Storytelling (10) | The demo story follows one family: living memory → preservation → use → memorial → new contribution |
| Demo & Delivery (5) | Live demo; judges can scan the QR themselves (requires public deployment, see Dependencies) |

---

## 13. Golden path demo and build priority

**Golden path (must work flawlessly live):**
1. The fictional family space exists, with consent recorded (show the consent clip).
2. Upload an old photo → GUNITA asks "Who is beside you in this photo?"
3. Record Lola's voice answer → transcript and extracted person and relationship appear as AI
   suggestions → the steward confirms → the photo now shows the name, linked to the recording.
4. Open the adobo recipe → a By-judgement step plays Lola's own clip ("how do you know it's
   ready").
5. Ask GUNITA "How did Lola make adobo?" → cited answer with her clip. Ask something not recorded →
   "Hindi pa alam" → add it as a question.
6. Activate Memorial Mode → select content → publish recap → show the QR.
7. Scan the QR on a phone → recap → share a memory → the steward approves → it appears labeled
   About them.

**Build order [interpretation]:** seed the fictional archive first so capture, Ask, and memorial
work can proceed in parallel; then wire the golden path end to end on seed data; then replace seed
steps with live capture; then everything else in P0. If a P0 item is at risk near the deadline,
keep it working in its simplest form rather than breaking the golden path.

**Demo data:** fictional family per BR-040. Because the repo is public, all seed photos,
recordings, and text must be ones the team is allowed to publish.

---

## Risks and failure modes

| Risk | Why it matters | Mitigation |
|---|---|---|
| Judges read the sub-theme as requiring a simulated person | Relevance and Innovation in Design scores | Pitch the stance explicitly: representation, not replica; show Ask GUNITA returning her real voice. The team's own research (the invented "Mark" road-trip story from a family chatbot) shows why simulation fails |
| Taglish transcription errors on elderly speech | Wrong transcripts become wrong items | Original audio stays authoritative; transcripts editable; nothing is verified without review; test transcription on the demo recordings in the first hours |
| AI invents a fact in an answer | Destroys trust in the whole archive | Reviewed-only retrieval, mandatory citations, abstention, evaluation set |
| 22 P0 areas in about 25 hours | Functionality (15 points) | Golden path first; simplest working form for the rest |
| Browser audio: recording and autoplay limits on iOS Safari and Android Chrome | Recording or recap audio fails on judges' phones | Tap-to-play only; MediaRecorder with format fallbacks; test on real phones over HTTPS |
| Private item leaks to family or public | Consent breach | Visibility checked at retrieval (BR-033); leak cases in the evaluation set |
| Visitor spam or hurtful content | Harm on a memorial | Pending by default, steward approval, rate limit |
| Mistaken Memorial Mode activation | Distress; premature public exposure | Explicit confirmation, nothing public until publish, reversible |
| Memorial not reachable from judges' phones | Demo & Delivery | Public HTTPS deployment tested from a mobile network |
| Proprietary AI APIs vs. open-source rule | Submission compliance | Document each provider, how to substitute it, and how to run core flows |

---

## Non-goals

- A chatbot, avatar, or any mode that speaks as the featured person or the deceased.
- Voice cloning or any synthetic speech in the person's voice.
- AI-generated films, visual novels, 3D avatars, or generated images of the person.
- Full genealogy, family-tree visualization, or historical-record integrations.
- Family health history (Kalusugan) or any medical guidance.
- Automatic death detection.
- Face recognition or identifying people from photos by appearance.
- Public social features: feeds, likes, followers, comments on visitor posts, streaks, engagement
  notifications.
- Multiple featured people, multiple family spaces per steward, or multiple stewards.
- Grief counseling or therapy claims.
- Deciding which family account is objectively true. GUNITA labels disputes; it does not settle
  them.
- Native iOS/Android apps, Expo, Expo Go, and app-store publishing (ADR-004). Everyone uses the
  mobile-first web app in a phone browser; memorial visitors never install anything.
- Desktop-first design (primary target is phone, ~375 px).
- Payments, pricing, and account billing.
- Lapida (gravestone) QR, long-term memorial hosting guarantees, and nine-night guided mourning.
  These came up in the idea tabs but are not in the finalized MVP.

---

## Dependencies

- **Speech-to-text** that handles Filipino, English, and Taglish, with word or segment timestamps
  (needed for F-007 audio spans).
- **LLM with vision and structured output** for extraction, gap detection, question generation,
  grounded answers, and recap captions.
- **Embeddings / semantic search** over reviewed items, filtered by visibility.
- **Media storage** for audio, photos, and documents.
- **Database** for spaces, sources, items, labels, and history.
- **Public HTTPS hosting** so judges can open the memorial from a QR on their own phones.
- **QR code generation.**
- **Browser audio recording** (iOS Safari and Android Chrome) for steward interviews and visitor
  voice notes; HTTPS deploy so mic permissions work.
- **Fictional demo content** the team can publish: photos, recordings by a consenting voice, recipe,
  stories.
- **AppCon compliance:** public repo, README, MIT `LICENSE`, commit history, documented proprietary
  components with substitution instructions, 5–10 slide deck.

Provider choices belong to the system-design doc. The PRD only requires that each is documented per
the mechanics.

---

## Open questions

- Exact submission time on Sep 24 (call said 6:00 PM; mechanics give no time). Confirm on the Team
  Portal. `[open]`
- Pitch format and length, and whether judges will scan the QR live. `[open]`
- Who owns each feature area across the five members? `[open]`
- Which speech-to-text and LLM providers? Decide after testing Taglish transcription on a real demo
  recording. `[open]`
- UI language: resolved — Filipino (Taglish-friendly) or English (ADR-005 / BR-014).
- Audio length limits per interview answer and per visitor voice note. `[open]`
- Accept or reject each **[interpretation]** tag, especially: Private meaning "person and steward
  only" (F-009), the consent ceiling (BR-032), family-only Ask (BR-034), reversible Memorial Mode
  (BR-051), and no editing of visitor words (BR-063). `[open]`
- After Memorial Mode, may the family add pre-existing recordings the person made while alive
  (e.g., an old voice message found on a phone) as From them? The finalized decision is silent.
  `[open]`
- Visitors who are minors: any extra handling? `[open]`
- Sustainability story for the 10-point criterion: resolved for pitch framing by ADR-003 (B2B2C
  Memorial package); not built in MVP.
- Brand line for GUNITA (none is defined yet). `[open]`
- Platform: resolved — single Next.js web app (ADR-004).
- Legal note: RA 10173 references here guide product rules. They are not legal advice; real users
  would need a compliance review. `[open]`

---

## Glossary

| Term | Meaning |
|---|---|
| Gunita | Remembrance, recollection (Filipino) |
| Lamay / burol | Wake; the gathering before burial |
| Lola / Lolo | Grandmother / grandfather |
| Pamana | Inheritance, heritage |
| Kalusugan | Health (the cut health-history category) |
| Hindi pa alam | "Not yet known"; GUNITA's abstention |
| Po / opo | Respectful particles used with elders |
| Steward | The family member the featured person designates to manage the space |
| From them / About them | Captured from the featured person / contributed by anyone else |
| GUNITA Question (Hint) | A suggested next question or missing connection |

---

## Traceability to the finalized decision

| Finalized item | F-ID(s) | MVP flow step |
|---|---|---|
| Identity | F-001 | 1 |
| Consent | F-002 | 1 |
| Capture | F-003 | 2 |
| Guided capture | F-004 | 2, 4 |
| Artifact context | F-005 | 2, 4 |
| Organization | F-006 | 3 |
| Source preservation | F-007 | 6 |
| Review | F-008 | 5 |
| Permissions | F-009 | 5, 10 |
| Family archive | F-010 | 6 |
| Search | F-011 | 7 |
| Ask GUNITA | F-012 | 7 |
| Abstention | F-013 | 7 |
| Hints | F-014 | 4, 8 |
| Provenance | F-015 | all |
| Memorial Mode | F-016 | 9 |
| Memorial output | F-017 | 10, 11 |
| QR access | F-018 | 12 |
| Guest contribution | F-019 | 13 |
| Moderation | F-020 | 14 |
| Correction/deletion | F-021 | all |
| AI guardrail | F-022 | all |
| Hard cuts + Kalusugan cut | Non-goals | — |
