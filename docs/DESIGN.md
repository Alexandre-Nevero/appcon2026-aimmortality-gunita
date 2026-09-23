---
version: alpha
name: Himmel
description: >-
  Consent-based family memory archive for Filipino families. A warm, handmade
  scrapbook on a phone: paper, polaroids, postcards, cassette tapes and a
  hand-drawn blue flower. Mobile-first Next.js web app, 375px design target.
colors:
  primary: "#2D2C28"
  on-primary: "#F8F4EF"
  paper: "#F8F4EF"
  paper-bright: "#FAF9F5"
  surface: "#FFFFFF"
  field: "#F1F1F1"
  line: "#E5E5E4"
  ink-muted: "#605F5B"
  mist: "#CFE0F0"
  mist-deep: "#BBD4EE"
  flower: "#2B56C2"
  flower-heart: "#EB8A37"
  record: "#DD4037"
  record-soft: "#E9726E"
typography:
  display-script:
    fontFamily: Homemade Apple
    fontSize: 2rem
    fontWeight: 400
    lineHeight: 1.3
  title-script:
    fontFamily: Homemade Apple
    fontSize: 1.25rem
    fontWeight: 400
    lineHeight: 1.4
  sticker-script:
    fontFamily: Homemade Apple
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.4
  prompt-serif:
    fontFamily: Newsreader
    fontSize: 1.25rem
    fontWeight: 400
    lineHeight: 1.45
  body-serif:
    fontFamily: Newsreader
    fontSize: 0.9375rem
    fontWeight: 400
    lineHeight: 1.55
  caption-serif:
    fontFamily: Newsreader
    fontSize: 0.8125rem
    fontWeight: 400
    lineHeight: 1.5
  header-sans:
    fontFamily: Inter
    fontSize: 1.0625rem
    fontWeight: 400
    lineHeight: 1.3
  label-sans:
    fontFamily: Inter
    fontSize: 0.9375rem
    fontWeight: 400
    lineHeight: 1.3
  caption-sans:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.3
  label-caps:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0.06em
rounded:
  none: 0px
  xs: 2px
  sm: 4px
  md: 8px
  lg: 20px
  full: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  gutter: 24px
  sheet-gutter: 40px
components:
  page:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.primary}"
    typography: "{typography.body-serif}"
  splash:
    backgroundColor: "{colors.paper-bright}"
    textColor: "{colors.primary}"
    typography: "{typography.display-script}"
  sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.lg}"
    padding: 40px
  screen-header:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.primary}"
    typography: "{typography.header-sans}"
    height: 44px
  screen-subtitle:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption-serif}"
  button-primary:
    backgroundColor: "{colors.mist}"
    textColor: "{colors.primary}"
    typography: "{typography.label-sans}"
    rounded: "{rounded.md}"
    height: 44px
    padding: 0 32px
  button-primary-pressed:
    backgroundColor: "{colors.mist-deep}"
    textColor: "{colors.primary}"
  button-dark:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-sans}"
    rounded: "{rounded.full}"
    size: 28px
  text-link:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption-sans}"
  input-field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.primary}"
    typography: "{typography.label-sans}"
    rounded: "{rounded.xs}"
    height: 48px
    padding: 0 12px
  input-label:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.label-sans}"
  checkbox:
    backgroundColor: "{colors.field}"
    textColor: "{colors.primary}"
    rounded: "{rounded.xs}"
    size: 16px
  section-caps:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.label-caps}"
  sticker-label:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.sticker-script}"
    rounded: "{rounded.xs}"
    padding: 4px 10px
  sticker-label-highlight:
    backgroundColor: "{colors.mist-deep}"
    textColor: "{colors.primary}"
    typography: "{typography.sticker-script}"
    rounded: "{rounded.xs}"
    padding: 4px 10px
  polaroid-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.sticker-script}"
    rounded: "{rounded.xs}"
    padding: 8px 8px 12px 8px
  photo-placeholder:
    backgroundColor: "{colors.line}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption-sans}"
  chip-tag:
    backgroundColor: "{colors.line}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption-sans}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  search-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.label-sans}"
    rounded: "{rounded.md}"
    height: 40px
    padding: 0 12px
  chat-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption-sans}"
    rounded: "{rounded.md}"
    height: 40px
    padding: 0 8px 0 12px
  bubble-himmel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.body-serif}"
    rounded: "{rounded.md}"
    padding: 12px 16px
  bubble-user:
    backgroundColor: "{colors.mist-deep}"
    textColor: "{colors.primary}"
    typography: "{typography.body-serif}"
    rounded: "{rounded.full}"
    padding: 8px 16px
  question-card:
    backgroundColor: "{colors.paper-bright}"
    textColor: "{colors.primary}"
    typography: "{typography.prompt-serif}"
    rounded: "{rounded.none}"
    padding: 24px
  record-button:
    backgroundColor: "{colors.record-soft}"
    textColor: "{colors.primary}"
    typography: "{typography.title-script}"
    rounded: "{rounded.full}"
    size: 104px
  record-waveform:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.record}"
  progress-dot:
    backgroundColor: "{colors.line}"
    rounded: "{rounded.full}"
    size: 14px
  progress-dot-active:
    backgroundColor: "{colors.mist-deep}"
    rounded: "{rounded.full}"
    size: 14px
  brand-mark:
    backgroundColor: "{colors.paper-bright}"
    textColor: "{colors.flower}"
  brand-mark-heart:
    backgroundColor: "{colors.flower-heart}"
    rounded: "{rounded.full}"
    size: 8px
---

## Overview

Himmel feels like a family scrapbook that someone kept on the kitchen table: warm paper, a faint dot grid, polaroids with handwritten captions, a cassette tape, a postcard, a candle. It is handmade, quiet and tender, never clinical and never "techy". The product holds a loved one's stories, voice and recipes while they are alive, and becomes a memorial after they pass, so every screen must feel safe to open in a hospital room or at a lamay.

The signature mark is a hand-drawn blue flower with a small orange heart. It appears on the splash, next to every script page title, and as the doorway to "ask himmel". Treat it as the only decorative flourish that repeats; everything else is a found object.

The interface speaks in lowercase, gentle, first-person-plural voice ("for stories that stay with us", "how would you like to remember?"). Every user-visible string ships in both `fil` (Taglish-friendly) and `en`.

> Naming: the product is **Himmel**. The repository, docs and screen IDs still say GUNITA until the rename lands. "Ask GUNITA" (S-016) is presented as **ask himmel**. The abstention line **"Hindi pa alam"** is unchanged.

## Colors

The palette is ink on warm paper, one soft sky blue for actions, and the flower's cobalt and orange as the brand signature. Red appears only while recording.

- **Primary / Ink (#2D2C28):** Warm near-black for all text, script titles, icons and the send button. Never use pure black.
- **On-primary (#F8F4EF):** Icon and text color on ink surfaces (the round send arrow).
- **Paper (#F8F4EF):** Default app background, always overlaid with a faint dot grid (1px dots, 16px pitch, roughly 8% ink).
- **Paper-bright (#FAF9F5):** Splash background and torn-paper question cards; slightly lighter than Paper so a card reads as a separate sheet.
- **Surface (#FFFFFF):** Bottom sheets on auth and consent, polaroid frames, sticker labels, chat bubbles from Himmel.
- **Field (#F1F1F1):** Text input and checkbox fills. Inputs have no border.
- **Line (#E5E5E4):** Chips, photo placeholders, inactive progress dots, hairlines.
- **Ink-muted (#605F5B):** Helper text, subtitles, placeholder text, secondary links. This is the lightest gray allowed for readable text (5.8:1 on Paper). The very light grays in the Figma helper links fail contrast; use this instead.
- **Mist (#CFE0F0):** The single action color. Primary buttons ("login", "agree & continue", "Save to the story", "Publish").
- **Mist-deep (#BBD4EE):** Pressed and selected state of Mist, the user's own chat bubble, the active progress dot, and the one highlighted sticker on a screen ("start an interview"). Mist and Mist-deep are two roles, not two versions of the same button; never put both as resting button fills on one screen.
- **Flower (#2B56C2):** Brand mark only (the flower drawing). Not for buttons, links or text.
- **Flower-heart (#EB8A37):** The dot at the flower's center. Nowhere else.
- **Record (#DD4037):** Live audio waveform during an interview.
- **Record-soft (#E9726E):** The round record button. Its label uses Ink, because white on this coral is only 3:1 and fails WCAG AA.

## Typography

Three families, each with one job:

- **Homemade Apple** is the family's handwriting. Use it for page titles on sheets ("Login", "Create an account", "Consent", "share the memorial"), the Himmel wordmark, sticker labels on Home and Capture, polaroid captions, and the record button label. Never for body text, form labels, or anything longer than about five words; it becomes unreadable fast.
- **Newsreader** is the storyteller. Use it for explanatory copy under headers, consent text, memory text, interview questions on the torn-paper card, and chat bubbles. Italic Newsreader marks gentle asides and reassurance ("you can always add details later", "Himmel won't fill in missing details").
- **Inter** is the utility voice. Use it for screen headers next to the back arrow, form labels, button text, chips, search and chat inputs, and small caps section labels ("THE USER IS COMFORTABLE WITH").

Buttons and labels are lowercase in both languages. Script titles use sentence case. Body minimum is 15px; nothing a user must read goes below 12px. Load all three from Google Fonts with fallbacks: `"Homemade Apple", "Segoe Script", cursive`, `Newsreader, Georgia, serif`, `Inter, system-ui, sans-serif`.

## Layout

Mobile-first at 375px wide, single column, no bottom tab bar.

- **Home is the navigation.** Home is a scrapbook collage of objects, each with a paper sticker label, and each object is a button: camera = capture, stacked polaroids = archive, map/letter = today's question, blue flower = ask himmel, postcard = add my memory (from others), candle = memorial (steward only). Objects are loosely scattered and slightly rotated (between -6° and 6°), but every tap target is at least 64x64px and none overlap another's hit area. The "Himmel's" script wordmark sits top center.
- **Inner screens** use a back arrow plus Inter header top left, one line of Newsreader subtitle beneath it (muted, italic for the reassuring half), then content. Page gutter is 24px.
- **Auth and consent** screens are a white sheet rising from the bottom over a soft-focus nature photo (sky, water, moss). The sheet top corners are 20px, content inside has a 40px gutter, and the script title sits top left with the flower beside it. The primary button is centered, with a small muted text link underneath.
- **Capture hub** stacks three large objects vertically (cassette = start an interview, postcard = type a memory, polaroid = add a photo), each with a sticker label overlapping its edge. The highlighted sticker marks the recommended action.
- **Archive and memorial selection** use a two-column polaroid grid with 16px gaps.
- **Ask himmel** keeps suggested questions and the input pinned to the bottom, above the safe area.
- Spacing follows a 4px base: 4, 8, 12, 16, 24, 32, 48. Vertical rhythm between form fields is 24px.
- The public memorial (`/m/[token]`) centers in a column no wider than 480px on desktop.

## Elevation & Depth

Depth comes from paper, not from glass or glow. Objects feel physically placed on the table.

- **Found objects** (camera, cassette, postcard, candle, polaroids) are real cut-out photos with a soft drop shadow: `0 6px 14px rgba(45, 44, 40, 0.18)`.
- **Polaroid cards** use a lighter shadow: `0 2px 6px rgba(45, 44, 40, 0.12)`.
- **Sticker labels** and torn-paper cards use a hairline shadow: `0 1px 2px rgba(45, 44, 40, 0.15)` to look taped on.
- **Sheets** on auth have no shadow; they separate from the photo by color alone.
- **Inputs, buttons and chips are flat.** No shadow, no border, no gradient.
- The only blur in the product is the background photo behind auth sheets and the soft sky wash at the bottom of Home.

## Shapes

- Inputs and checkboxes: nearly square (2px). They should feel like blanks on a form, not pills.
- Primary buttons: 8px radius, fixed 44px height.
- Polaroids, stickers, question cards: square or 2px, with the question card cut as torn paper (irregular top and bottom edge, done with an SVG mask).
- Chips, the user's chat bubble, the round send button, the record button, progress dots: fully round.
- Auth and consent sheets: 20px on the top corners only.
- Icons are thin (1.5px stroke) line icons in Ink: back arrow, search, close, re-record, skip. No filled icon sets.

## Components

- **Primary button:** Mist fill, Ink lowercase Inter label, 8px radius, 44px tall. Pressed state goes to Mist-deep. Disabled state is Line fill with Ink-muted text. One primary button per screen.
- **Input field:** Inter label above in Ink, borderless Field box below. Error message goes under the field in Newsreader 13px, Ink with a small Record-colored dot, never red text.
- **Sticker label:** White (or Mist-deep when highlighted) paper strip with a Homemade Apple lowercase label, slightly rotated, overlapping the corner of the object it names.
- **Polaroid card:** White frame, square photo, Homemade Apple caption, and chips below for provenance ("from them", "verified", "from family"). Selectable polaroids show a small Ink check in the top right corner.
- **Chip tag:** Line fill, Ink-muted Inter 12px, fully round. Chips show provenance and review status; they are labels, not filters, unless placed in a row under the search bar.
- **Question card (interview):** Torn Paper-bright card with a strip of tape, question in Newsreader 20px centered, progress dots above ("question 1 of 5"), live Record waveform below, big Record-soft button labeled "press me", skip on the left, re-record on the right, "edit question" link at the bottom.
- **Ask himmel:** Himmel's answers are white bubbles in Newsreader; the user's are Mist-deep pills. Every answer shows cited source links. When Himmel cannot answer from reviewed sources it says "Hindi pa alam" in the same bubble style, never an error style. Suggested questions appear as Ink-muted rows with a return-arrow glyph.
- **Consent checklist:** Small caps Inter section label, then square Field checkboxes with Newsreader choice text. Nothing is pre-checked.
- **Memorial:** Entry is an old CRT television object with an "Activate Memorial Mode" button; activation requires typing the person's name. The share screen fans polaroids behind a link field and "copy" button. The thank-you screen is centered: flower, script "thank you", short Newsreader note.
- **Splash:** Paper-bright, centered flower, "Himmel" in Homemade Apple, tagline in Newsreader 12px Ink-muted.

## Do's and Don'ts

- Do keep Home as the only hub. Every core action (capture, review, ask) stays within two taps of Home, per the sitemap depth rule.
- Do use Homemade Apple only for short labels and titles. Don't set paragraphs, form labels or error messages in script.
- Do keep Mist as the only action color. Don't make buttons Flower blue or Record red.
- Do write every label in lowercase and ship `fil` and `en` versions of every string.
- Do use real, slightly imperfect object photos (cut out, with shadow). Don't use flat vector illustrations or emoji in their place.
- Do show provenance chips on every memory. Don't show an AI answer without source links.
- Don't speak as the featured person, ever. Himmel speaks about them ("Lola said..."), never as them.
- Don't add engagement nudges, streaks, badges, counts or push-style reminders. The memorial tribute heart has no counter.
- Don't autoplay audio. Voice is always tap-to-play.
- Don't use pure black, pure red for errors, or white text on Record-soft.
- Don't add a bottom tab bar or floating action button.

## Open issues in the current mockups

These are gaps between the Figma and the repo docs that an agent should resolve in favor of the docs unless told otherwise:

- Login asks for "username", but S-001 is email + password. Use "e-mail address".
- The consent screen repeats its first paragraph twice. Remove the duplicate.
- Tagline grammar: "for stories that stays with us" should be "for stories that stay with us".
- "choose what to inlcude" is misspelled on the memorial selection screen.
- The sitemap and AGENTS.md still describe a four-tab bottom bar and the name GUNITA. Both need an ADR (navigation model and rename) before code diverges from the docs.
