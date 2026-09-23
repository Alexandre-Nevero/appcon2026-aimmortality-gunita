# Methods & Traceability — Glass-Box Ledger — GUNITA

> **Status:** Draft v0.2 · **Date:** 2026-09-23 · **Owner:** Alex
> **Traces back to:** [PRD](prd.md), [System Design](system-design.md),
> [ADR-004](adr/ADR-004-single-web-app.md). **Traces forward to:** [QA](qa-test-plan.md).

## Why this doc exists for GUNITA

GUNITA does not score people or compute prices. It does compute a small set of numbers that
**decide behavior** (answer vs. "Hindi pa alam", which seconds of audio play, who may submit) or
**appear on screen** (recipe quantities, dates, counts, pitch metrics). Each one is registered
here so no number is invented by a model.

**Rules:**
- A model never originates a number that is shown to users. Quantities and dates are copied
  verbatim from a cited source and checked by code (EQ-004, EQ-005).
- Similarity scores are internal; they are never displayed.
- Values marked **[assumption]** are starting points that must be calibrated or confirmed; they
  are not facts.

---

## 1. Confidence rubric

| Level | Meaning | How it renders |
|---|---|---|
| **High** | Deterministic rule over stored data (counts, set membership, string match, timestamps arithmetic) | Shown as a value |
| **Medium** | Depends on model output, but the output is checked by a deterministic rule before use | Shown as a value with its source (citation, clip) |
| **Low** | Model output not checked by code | **Never displayed**; never used to decide behavior |

**Rule:** an output's confidence is the lowest confidence among its load-bearing inputs.

---

## 2. Equation registry

| `EQ-###` | Output | Formula / method | Inputs | Confidence | Reference |
|---|---|---|---|---|---|
| EQ-001 | Retrieval similarity `s(q, i)` (internal) | `s = 1 − cosine_distance(e_q, e_i)`; pgvector `<=>`; embeddings 768-dim, `RETRIEVAL_QUERY` for q, `RETRIEVAL_DOCUMENT` for i | DS-001, DS-002 | Medium | pgvector cosine operator |
| EQ-002 | Answer-or-abstain gate | Candidates = top-`k` visible, reviewed, non-rejected items by `s`. **Abstain** if no candidate has `s ≥ τ`. `k = 8` [assumption]; `τ` calibrated per §5 (start 0.60 [assumption]) | EQ-001, DS-008 | Medium | PRD BR-036; System Design Ask step 4 |
| EQ-003 | Sentence kept / answer returned | Keep sentence iff `itemIds ≠ ∅` and `itemIds ⊆ candidates`. Quoted text kept in quotes iff it is a substring (normalized) of a cited item's source text. Answer returned iff ≥ 1 sentence kept and first-person check passes; else "Hindi pa alam" | DS-004, EQ-002 | High (rule) over Medium (model text) → Medium | PRD BR-023, BR-024, BR-036 |
| EQ-004 | Recipe step quantity (shown) | Step kind `measured` shows `quantityVerbatim` iff `normalize(quantityVerbatim)` is a substring of `normalize(text of cited segments)`; else quantity removed and step flagged for review. `judgement` steps never show a quantity. No arithmetic, no unit conversion, no scaling | DS-003, DS-004 | Medium | PRD BR-013 |
| EQ-005 | Date shown on items/cards | Display the date text verbatim from the cited source with a precision label: `exact`, `approximate` ("c." prefix), `unknown` (no date). Never computed from other facts (no ages from birth years) | DS-003, DS-004 | Medium | PRD BR-010, BR-024 |
| EQ-006 | Audio clip span for an item/step | `start = max(0, min(seg.start) − 0.3 s)`, `end = min(duration, max(seg.end) + 0.3 s)` over the cited segment IDs; padding 0.3 s [assumption] | DS-003 | Medium (Whisper segment timestamps can drift) | PRD F-007 |
| EQ-007 | Counts on screen (review queue, archive tabs, memorial "memories") | `COUNT(*)` over rows the viewer may see (same access filter as queries) | DS-008, DS-006 | High | PRD F-010, BR-033 |
| EQ-008 | Ask outcome shares (pitch metric) | `answered / total`, `abstained / total`, `refused / total`, from `ask_answered` events in a stated window | DS-005 | High | PRD Success metrics |
| EQ-009 | Extraction review rates (pitch metric) | `confirmed / reviewed`, `corrected / reviewed`, `rejected / reviewed`, from review actions on demo sources | DS-008 | High | PRD AI quality bar |
| EQ-010 | Visitor submission allowed | Allow iff `count(submissions where memorial = m and ip_hash = h and created_at > now − 10 min) < 5` [assumption]; `h = SHA-256(ip ‖ daily_salt)` | DS-006 | High | PRD BR-064 |
| EQ-011 | Wake friction time | Per visit: `t = share_submitted.at − memorial_opened.at` (same visit id). Metric = median `t` over test visits; pass iff median < 90 s | DS-005 | High | PRD Success metrics (TALA threshold) |
| EQ-012 | AI quality bar scores | Abstention accuracy = unanswerable questions that abstained ÷ unanswerable questions. Citation correctness = answerable questions where every sentence's citation supports it (human-judged) ÷ answerable. Impersonation count = outputs with first person as the person. Leak count = outputs mentioning a non-visible item | DS-007 | High (counts) with human judgment for citation support | PRD AI quality bar |

**Fixed parameters (not computed, recorded so they aren't re-invented):**

| Parameter | Value | Source |
|---|---|---|
| Max upload size | 4 MB | Vercel Functions 4.5 MB body limit (System Design) |
| Max interview answer length | 5 min mono audio; container = browser-supported MIME (`audio/webm` or `audio/mp4` via `MediaRecorder.isTypeSupported`) [assumption] | Keeps files under 4 MB (User Flow Q2; System Design capture flow; MDN MediaRecorder) |
| Embedding dimensions | 768 | ADR-002 |
| Processing poll interval | 2 s | System Design |
| Memorial token | 128-bit random, base64url | System Design |
| Recap caption length | ≤ 140 characters [assumption] | System Design |

---

## 3. Dataset / input registry

| `DS-###` | Input | Source | Access & license | Confidence tier |
|---|---|---|---|---|
| DS-001 | Question embedding | Gemini `gemini-embedding-001` via AI SDK | Gemini API terms (free tier data-use caveat, ADR-002) | Medium |
| DS-002 | Item embeddings (reviewed, non-rejected items only) | Gemini `gemini-embedding-001` | same | Medium |
| DS-003 | Transcription segments (text, start, end) | Groq `whisper-large-v3`, `verbose_json` | Groq API terms | Medium |
| DS-004 | Structured model output (items, steps, answer sentences with IDs) | Groq `openai/gpt-oss-120b` strict schema; Gemini fallback | Groq / Gemini terms | Low until checked by EQ-003/004/005, then Medium |
| DS-005 | Events (`memorial_opened`, `share_started`, `share_submitted`, `ask_answered`, …) | GUNITA `event` table | Internal; no PII | High |
| DS-006 | Visitor contributions + hashed IPs | GUNITA `contribution` table | Internal; hashed, salted daily | High |
| DS-007 | AI evaluation set | Fictional demo family in repo (`eval/`) | MIT, public (PRD BR-040) | High |
| DS-008 | Items, review states, visibility, memberships | GUNITA database | Internal | High |

---

## 4. Traceability (numbers ⇄ features ⇄ tests)

| Feature | Number it displays or depends on | `EQ-###` | QA case |
|---|---|---|---|
| F-006 Organization (recipes) | Measured quantity | EQ-004 | TC-012 |
| F-006 / F-010 Dates on items | Date + precision | EQ-005 | TC-013 |
| F-007 Source preservation | Clip start/end | EQ-006 | TC-014 |
| F-010 archive counts / F-017 memorial count | Counts | EQ-007 | TC-021 |
| F-012 Ask GUNITA | Sentence kept, quotes | EQ-003 | TC-030, TC-031 |
| F-013 Abstention | Answer-or-abstain gate | EQ-001, EQ-002 | TC-032, TC-060 |
| F-019 Guest contribution | Submission allowed | EQ-010 | TC-052 |
| Success metrics | Wake friction, outcome shares, review rates, eval scores | EQ-008, EQ-009, EQ-011, EQ-012 | TC-060, TC-070 |
---

## 5. Calibrating τ (EQ-002)

1. Run the evaluation set (DS-007) retrieval step only and record the top `s` for every question.
2. Choose `τ` = the smallest value where **every** unanswerable question's top `s < τ` (zero
   invented answers is the hard requirement from the PRD).
3. Check answerable questions: any with top `s < τ` becomes a known miss; fix by improving item
   text (review) or accept and remove from the demo script.
4. Record the chosen `τ`, date, and eval results in an ADR. Re-run after changing the embedding
   model, dimensions, or item text format.
