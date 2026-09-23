# Visual direction — GUNITA

**Owner:** Gian (product design) · **Task:** TASK-004 · **Date:** 2026-09-23 (Asia/Manila)
**Traces to:** ADR-005, BR-014, BR-080, F-010, F-015, F-017–F-019, F-022 · tokens `content/design-tokens.css` · copy `content/i18n/{fil,en}.json`

> Pitch-facing visual north star for Josh (screens) and the team (demo / judges). Warm, consistent, on-brand under hackathon time — not a full design system.

---

## 1. Mood

**One sentence:** A quiet family table after dinner — paper, wood, candlelight — not a productivity app.

| Feel | Not |
|---|---|
| Warm paper, soft earth, terracotta accent | Cold slate / indigo SaaS |
| Respectful, unhurried | Hype, streaks, “keep your streak!” |
| Elder-readable, large type | Dense dashboards |
| Provenance always visible | Mystery AI prose without badges |
| Memorial solemn but inviting | Horror, grief-porn, corporate funeral brochure |

Voice: third person **about** the featured person; never first-person *as* them (F-022 / BR-037). Filipino mode uses po/opo where it fits (BR-014).

---

## 2. Palette (token names)

Source of truth: `content/design-tokens.css`.

| Role | Token | Notes |
|---|---|---|
| Page | `--color-bg` | Warm paper `#f7f1e8` |
| Cards | `--color-bg-elevated` | Soft cream sheets |
| Text | `--color-fg` / `--color-fg-muted` | Deep brown / secondary |
| CTA | `--color-accent` | Terracotta only for primary actions |
| Focus | `--shadow-focus` / `--color-focus-ring` | Warm brown, always visible |
| Cover w/ photo | `--color-bg-inverse` + `[data-theme="memorial-cover"]` | Sparingly |
| Cover w/o photo | `--color-bg-cover-fallback-*` + `[data-theme="memorial-cover-fallback"]` | Soft paper gradient |

**Badges:** soft green (`--color-badge-from-them-*`, verified), soft violet (about them), soft blue (AI / AI-written), soft amber (uncertain), soft rose (disputed). **Hindi pa alam** uses muted paper tokens — abstention, not error.

Do not invent neon greens or purple gradients. New semantic color → add a token first.

---

## 3. Typography

- **UI:** `--font-sans` (SF Pro / Segoe / Noto Sans + Tagalog).
- **Memorial titles only:** `--font-serif` on S-030 cover name / closing line.
- **Elder floor:** body sentences use `--font-size-body` (18px). Dense chrome may use `--font-size-md` (16). Never shrink Filipino to fit.
- **Interview (S-007):** `--font-size-3xl`, one question, generous padding.
- **Line height:** `--line-height-relaxed` (1.65) for body.

---

## 4. Layout & chrome

- **Primary:** 375px phone browser (ADR-004). Breakpoints 375 / 768.
- **Safe-area:** pad fixed top/tab chrome with `--safe-area-*`.
- **Family UI:** four bottom tabs — Home, Capture, Archive, Ask. Top bar: featured person + During / Memorial badge.
- **Public memorial:** no tab bar; vertical recap; fixed **Share a memory**.
- **Touch:** `--space-touch-min` (44px). Audio is **tap-to-play only** — never autoplay.
- **Spacing:** `--space-page-x` gutters; cards `--radius-lg` + `--shadow-md`.

### Tab label policy (fil)

Primary tab labels stay **English product names** in both `fil` and `en` (Home / Capture / Archive / Ask). Sentences, buttons, empty states, and errors localize to Taglish Filipino or English. Documented in i18n `_meta.tabLabelPolicy` so Josh does not “translate” the tab chrome.

### S-022 projector framing

Family UI stays mobile-first. For demo projector on the recap editor / preview: center a single column at `--space-projector-max` (~480px) on a warm paper page background; do not build a separate desktop layout. Phone-width preview remains the source of truth for publish.

---

## 5. Badge visual spec (F-015)

Same badge chrome on **every** surface: archive, search, Ask evidence, recap captions, moderation.

| Key (stable) | Label fil / en | Tokens |
|---|---|---|
| `from_them` | Mula sa kanya / From them | `--color-badge-from-them-*` |
| `about_them` | Tungkol sa kanya / About them | `--color-badge-about-them-*` |
| `ai_suggestion` | Mungkahi ng AI / AI suggestion | `--color-badge-ai-*` |
| `verified` | Nakumpirma / Verified | `--color-badge-verified-*` |
| `corrected` | Naitama / Corrected | `--color-badge-corrected-*` (outline) |
| `uncertain` | Hindi sigurado / Uncertain | `--color-badge-uncertain-*` |
| `disputed` | Pinagtatalunan / Disputed | `--color-badge-disputed-*` |
| `aiWritten` | Isinulat ng AI / AI-written | `--color-badge-ai-written-*` |
| `hindiPaAlam` | **Hindi pa alam** (both) | `--color-badge-hindi-pa-alam-*` |
| visibility | Pribado / Pamilya / Memoryal | `--color-vis-*` |

**Rules:** keys stay stable (`packages/core` + i18n); one badge component; AI-written marker always beside AI prose (BR-023); quotes only for verbatim reviewed text (BR-024).

---

## 6. Memorial storyboard (lamay QR)

Aligns with F-018 / F-019 and S-030 → S-031 → S-032.

| Beat | Screen | Visitor sees / feels |
|---|---|---|
| 1. Scan | Camera → `/m/[token]` | Instant open, no login. Cover: selected photo **or** soft paper gradient (`memorial-cover-fallback`). Quiet serif name + `coverHint`. |
| 2. Remember | S-030 | Scroll: cover → life moments → **In their own words** (tap-to-play) → recipe / lesson → closing → **Memories from others** (About them only). Fixed Share CTA. |
| 3. Share | S-031 | Name, relationship, text / photo / voice. Clear notice: family reviews; shown as About them, never as their words. |
| 4. Thank you | S-032 | Warm confirmation. **Ends the interaction** — no “share more”, no follow, no account upsell (BR-080). |
| Unavailable | S-034 | Calm — disabled / unpublished / unknown. No guilt language. |

Steward path (S-020–S-024): typed-name activation → select → recap editor (projector: centered 480px) → publish → QR; moderation never edits visitor words.

---

## 7. Motion budget

Tokens: `--duration-*` (zeroed under `prefers-reduced-motion`).

- **Allowed:** short fade/slide for sheets and toasts (≤ 200ms).
- **Forbidden:** parallax, looping celebration, streaks, autoplaying carousels, grief “confetti”.
- **Audio:** tap-to-play only.

---

## 8. Do / Don’t

### Do

- Speak **about** the featured person in third person.
- Show provenance badges everywhere (F-015); abstain with **Hindi pa alam** (BR-036).
- Body type ≥ `--font-size-body` (18px); focus rings via `--shadow-focus`.
- Empty states gentle and actionable — never shaming.
- Ship every user-visible string in both `fil` and `en` (BR-014).
- Prefer po/opo in Filipino interview / consent prompts.
- No-photo cover → soft paper gradient tokens (not blank white).

### Don’t

- **Never speak as the deceased** or offer “chat with them” (F-022, BR-037).
- **No health / Kalusugan prompts** — cut from MVP.
- **No engagement nudges:** no streaks, gamification, or grief re-engagement pushes (BR-080). Thanks screen ends the visitor flow.
- Don’t put AI paraphrase in quotation marks.
- Don’t let visitor memories appear under “In their own words” / From them (BR-062).
- Don’t use cold SaaS indigo, dark-mode-by-default family UI, or “AI purple glow”.
- Don’t translate primary tab labels into Filipino — keep product names.

---

## 9. Design decisions (closed)

| Call | Decision |
|---|---|
| Memorial cover with no photo | Soft paper gradient via `--color-bg-cover-fallback-*` and `[data-theme="memorial-cover-fallback"]`. Copy: `memorialPublic.coverNoPhotoAlt`. |
| S-022 projector framing | No separate desktop app. Center phone-width column at `--space-projector-max` (~480px) on warm paper for demo projection. |
| fil tab labels | Keep Home / Capture / Archive / Ask as English product names in both locales; localize sentences and actions (Taglish + po/opo). |

---

## 10. Handoff

| Artifact | Path | Consumer |
|---|---|---|
| Copy pack | `content/i18n/fil.json`, `content/i18n/en.json` | Josh i18n (TASK-007+) |
| Tokens | `content/design-tokens.css` | Josh styles (TASK-007 / TASK-027) |
| This doc | `docs/pitch/visual-direction.md` | Team + pitch (TASK-023) |
