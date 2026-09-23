# ADR-004 — Single mobile-first Next.js web app

- **Date:** 2026-09-23
- **Status:** Accepted
- **Owners / agents:** Alex (team lead), with the docs agent
- **Related:** F-003, F-017–F-019; `docs/prd.md`, `docs/system-design.md`, `docs/sitemap.md`, `docs/ops.md`, `docs/sad.md`

### Context
ADR-001 chose Expo (family) + Next.js (memorial API and public pages) after an informal "mobile app"
preference. AppCon 2026 Official Mechanics require an AI-driven product as a public Git repo with a
working prototype. They do **not** require a native mobile app, app-store distribution, or separate
mobile/web codebases. Coverage is "web or mobile platforms" in past AppCon editions; GUNITA's
lamay flow already needs a no-install web page for QR visitors and judges.

### Why now
The team clarified that a web app alone is enough. Keeping two apps burns ~25 build hours without
scoring any extra rubric points.

### Options considered
1. **Keep Expo + Next.js (ADR-001).** Pros: native recording UX. Cons: two UIs, Expo Go tunnel
   risk during judging, duplicate auth/client work.
2. **Single Next.js mobile-first web app** for steward, family, and memorial visitors. Pros: one
   deploy, one auth stack, QR path is the same stack, matches AppCon norms. Cons: browser mic
   quirks on iOS Safari (polyfill / tap-to-record).
3. **Expo-only for everything including memorial.** Cons: Workers/EAS Hosting limits; visitors may
   still need a web surface for frictionless QR.

### Decision
1. **One Next.js 16 App Router app on Vercel** serves family/steward UI, API, and public memorial.
2. **Mobile-first responsive web** (primary design width 375px). Optional installability as a PWA
   is nice-to-have, not required for MVP.
3. **Browser audio recording** for steward interviews and visitor voice notes (iOS Safari + Android
   Chrome tested). Audio plays only on tap.
4. Native apps, Expo, app stores, and Expo Go demos are **out of scope**.

### Why this option
Functionality (15 points) rewards one stack that works. AppCon does not require native. The
memorial QR already forces a public web surface; putting the family UI on the same surface removes
an entire product surface without cutting features.

### Overrides
- **Prior ADRs:** **Supersedes ADR-001**
- **Doc / plan truth:** Restores PRD non-goal "no native apps"; F-003 = browser recording;
  System Design / Sitemap / Ops / SAD / QA follow this ADR. Softens ADR-002 auth line (no Expo
  plugin).
- **Out of scope:** Does not change F-001–F-022 product scope, business rules, or hard cuts.

### Consequences
- **Easier:** one repo app, one deploy URL, shared session cookies for family UI, QR demo on the
  same domain.
- **Harder / owed:** harden MediaRecorder on iOS (HTTPS, user gesture, format fallbacks); test
  recording on real phones before the demo.
- **Follow-up:** owning docs reconciled in the same change as this ADR.
