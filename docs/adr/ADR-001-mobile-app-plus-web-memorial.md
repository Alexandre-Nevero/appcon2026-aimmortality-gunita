# ADR-001 — Family mobile app + web memorial (two apps, one repo)

- **Date:** 2026-09-23
- **Status:** Superseded by ADR-004
- **Owners / agents:** Alex (team lead), with the docs agent
- **Related:** F-003, F-017, F-018, F-019; `docs/prd.md` Non-goals and F-003 acceptance; `docs/system-design.md`

> **Superseded 2026-09-23 by [ADR-004](ADR-004-single-web-app.md).** AppCon does not require a
> native app; the team reverted to a single mobile-first Next.js web app.

### Context
The approved PRD assumed a mobile-first web app and listed native apps as a non-goal. After PRD
approval the team decided GUNITA is a mobile app. The finalized flow still requires lamay visitors
to go "Scan → Remember → Share a memory" without signup, and judges at a virtual event must open
the memorial from a QR on their own phones. Requiring an app install would break both.

### Why now
The system design, sitemap, and QA plan cannot be written until the platform is fixed.

### Options considered
1. **Expo mobile app + Next.js on Vercel (API + public memorial page)**. Pros: full Node runtime,
   native Vercel Blob uploads, fast server-rendered QR page, clean mobile/web split for 5 people.
   Cons: two apps to build.
2. **One Expo Router codebase for iOS, Android, and web, with API routes on EAS Hosting**. Pros: one
   codebase. Cons: Cloudflare Workers runtime with partial Node support; upload and timeout
   behavior less proven.
3. **Single Next.js PWA for everyone**. Pros: simplest. Cons: drops the mobile-app decision.

### Decision
1. Family members and the steward use an **Expo (React Native) mobile app**, run on teammates'
   phones through Expo Go for the hackathon. App-store publishing is out of scope.
2. **Next.js on Vercel** hosts the API for the app and the **public memorial web pages** (recap,
   share a memory, confirmation).
3. Memorial visitors never install anything; they use the web page from the QR.
4. Both apps live in one public repo as workspaces.

### Why this option
The demo depends on Functionality (15 points): the most proven runtime for uploads, AI calls, and
the QR page wins. The split also lets the team build mobile and web/API in parallel.

### Overrides
- **Prior ADRs:** none
- **Doc / plan truth:** Amends `docs/prd.md`: removes "Native mobile apps (mobile web only)" from
  Non-goals; F-003 acceptance now says in-app recording on iOS and Android; Dependencies list
  in-app recording plus browser recording for visitor voice notes.
- **Out of scope:** Does not change any feature, business rule, or hard cut.

### Consequences
- **Easier:** reliable in-app recording (expo-audio); public page loads without an app.
- **Harder / owed:** two UIs; shared types must live in a shared package; the demo needs the Expo
  dev server reachable (tunnel) or a preview build as backup (see `docs/ops.md`).
- **Follow-up:** reconcile PRD (done in the same change); system design and sitemap follow this ADR.
