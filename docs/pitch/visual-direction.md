# Visual direction — GUNITA

**Owner:** Gian (product design) · **Task:** TASK-004 · **Date:** 2026-09-23 (Asia/Manila)
**Traces to:** ADR-005, BR-014, BR-080, F-010, F-015, F-017–F-019 · tokens in `content/design-tokens.css` · copy in `content/i18n/{fil,en}.json`

> Pitch-facing visual north star for Josh (screens) and the team (demo / judges). Not a full design system — enough to stay warm, consistent, and on-brand under hackathon time.

---

## 1. Mood

**One sentence:** A quiet family table after dinner — paper, wood, candlelight — not a productivity app.

| Feel | Not |
|---|---|
| Warm paper, soft earth, terracotta accent | Cold slate / indigo SaaS |
| Respectful, unhurried | Hype, streaks, “keep your streak!” |
| Elder-readable, large type | Dense dashboards |
| Provenance always visible | Mystery AI prose without badges |
| Memorial is solemn but inviting | Horror, grief-porn, or corporate funeral brochure |

Voice of the UI: third-person about the featured person; never first-person *as* them (F-022 / BR-037). Filipino mode uses po/opo where it fits (BR-014).

---

## 2. Palette (see tokens)

Source of truth: `content/design-tokens.css`.

- **Background:** `--color-bg` warm paper `#f7f1e8`; cards `--color-bg-elevated`.
- **Text:** `--color-fg` deep brown `#2c241c`; muted for secondary.
- **Accent:** terracotta `--color-accent` `#a65d3f` for primary CTAs only.
- **Inverse:** memorial cover / quiet moments use `--color-bg-inverse` — sparingly.
- **Badges:** dedicated soft greens (From them / Verified), soft violet (About them), soft blue (AI / AI-written), soft amber (Uncertain), soft rose (Disputed). **Hindi pa alam** is muted paper — calm abstention, not an error.

Do not invent neon success greens or purple gradients. If a new semantic color is needed, add a token first.

---

## 3. Typography

- **UI sans:** system stack (`--font-sans`) — SF Pro / Segoe / Noto Sans (+ Tagalog if available).
- **Memorial titles only:** soft serif (`--font-serif`) for cover name / closing line on S-030.
- **Elder-friendly floor:** body ≥ 16px (`--font-size-md`); interview questions use `--font-size-3xl`.
- **Line height:** `--line-height-relaxed` (1.65) for body copy.
- **One question at a time** on S-007 — large type, generous padding, no chrome clutter.

Filipino and English share the same type scale; length differences are absorbed by wrapping, not by shrinking type.

---

## 4. Layout & chrome

- **Primary target:** 375px phone browser (ADR-004). Breakpoints 375 / 768.
- **Family UI:** four bottom tabs — Home, Capture, Archive, Ask (sitemap §1). Top bar: featured person name + During / Memorial mode badge.
- **Public memorial:** no tab bar. Vertical recap, fixed **Share a memory** button.
- **Touch:** min target `--space-touch-min` (44px). Tap-to-play only for audio — never autoplay.
- **Spacing:** page gutters `--space-page-x`; cards `--radius-lg` with soft `--shadow-md`.

---

## 5. Badge visual spec (F-015)

Same badge chrome on **every** surface: archive cards, search, Ask evidence, recap captions, moderation queue.

| Key (stable) | Label fil / en | Visual |
|---|---|---|
| `from_them` | Mula sa kanya / From them | Soft green chip |
| `about_them` | Tungkol sa kanya / About them | Soft violet chip |
| `ai_suggestion` | Mungkahi ng AI / AI suggestion | Soft blue chip |
| `verified` | Nakumpirma / Verified | Soft green |
| `corrected` | Naitama / Corrected | Soft green outline |
| `uncertain` | Hindi sigurado / Uncertain | Soft amber |
| `disputed` | Pinagtatalunan / Disputed | Soft rose |
| `aiWritten` | Isinulat ng AI / AI-written | Soft blue; always beside AI prose |
| `hindiPaAlam` | **Hindi pa alam** (both modes) | Muted paper chip — abstention, not failure |
| visibility | Pribado / Pamilya / Memoryal | Neutral chips; Memorial uses accent-soft |

**Rules**

1. Keys stay stable for Josh (`packages/core` + i18n) — §0.1 frozen contract.
2. Never restyle badges per screen; one component.
3. AI-written captions and Ask sentences always show the AI-written marker (BR-023).
4. Quotes only for verbatim reviewed text (BR-024).

---

## 6. Memorial storyboard beats (lamay QR visitor journey)

Aligns with F-018 / F-019 and sitemap S-030 → S-031 → S-032.

| Beat | Screen | What the visitor sees / feels |
|---|---|---|
| 1. Scan | Camera → `/m/[token]` | Instant open, no login. Soft cover with name; quiet serif title. |
| 2. Remember | S-030 recap | Scroll: cover → life moments → **In their own words** (tap-to-play) → recipe / lesson → closing → **Memories from others** (About them only). |
| 3. Share | Fixed CTA → S-031 | Name, relationship, text / photo / voice. Clear notice: family reviews; shown as About them, never as their words. |
| 4. Thank you | S-032 | Warm confirmation. **Ends the interaction** — no “share more”, no follow, no account upsell (BR-080). |
| Unavailable | S-034 | Neutral, calm — link disabled / unpublished / unknown. No guilt language. |

Steward path (S-020–S-024): explicit typed-name activation; select → recap editor → publish → QR; moderation never edits visitor words.

---

## 7. Motion budget

Tokens: `--duration-*`, disabled under `prefers-reduced-motion`.

- Allowed: short fade/slide for sheets and toasts (≤ 200ms).
- Forbidden: parallax, looping celebration, streak animations, autoplaying carousels, grief “confetti”.
- Audio: **tap-to-play only**.

---

## 8. Do / Don’t

### Do

- Speak **about** the featured person in third person.
- Show provenance badges everywhere (F-015).
- Abstain with **Hindi pa alam** when unsupported (BR-036).
- Keep empty states gentle and actionable (capture / review), never shaming.
- Ship every user-visible string in both `fil` and `en` (BR-014).
- Prefer po/opo in Filipino interview prompts.

### Don’t

- **Never speak as the deceased** or offer “chat with them” / persona mode (F-022, BR-037).
- **No health / Kalusugan prompts** — cut from MVP.
- **No engagement nudges:** no streaks, gamification, or push/email meant to pull grieving users back (BR-080). Visitor thanks screen ends the flow.
- Don’t put AI paraphrase in quotation marks.
- Don’t let visitor memories appear under “In their own words” / From them (BR-062).
- Don’t use cold SaaS indigo, dark-mode-by-default family UI, or stock “AI purple glow”.

---

## 9. Handoff

| Artifact | Path | Consumer |
|---|---|---|
| Copy pack | `content/i18n/fil.json`, `content/i18n/en.json` | Josh i18n provider (TASK-007+) |
| Tokens | `content/design-tokens.css` | Josh styles (TASK-007 / TASK-027) |
| This doc | `docs/pitch/visual-direction.md` | Team + pitch (TASK-023 builds on it) |

**Open for Gian / team (non-blocking):** whether memorial cover uses a single family photo treatment vs. soft gradient paper when no photo is selected; desktop projector framing for S-022 (sitemap Q2).
