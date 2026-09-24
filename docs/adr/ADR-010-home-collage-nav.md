# ADR-010 — Home collage navigation (no bottom tabs)

- **Date:** 2026-09-24
- **Status:** Accepted
- **Owners / agents:** Josh (UI), Alex (lead)
- **Related:** `docs/DESIGN.md`, Figma Himmel `0j5RdB8fpbIZ4iNdSlapFV`, `docs/sitemap.md`
- **Supersedes (nav pattern only):** sitemap §1 "bottom tab bar with four tabs" prose

### Context
DESIGN.md and the Himmel Figma mockups make Home a scrapbook of found objects (camera,
polaroids, map, flower, postcard, candle). Each object is a button. There is no bottom
tab bar. The sitemap still describes four tabs (Home / Capture / Archive / Ask).

### Why now
Frontend implementation starts now. Shipping tabs would contradict the locked visual
system and force a second rewrite before AppCon.

### Options considered
1. Keep four bottom tabs (sitemap). Pros: matches older IA. Cons: fights Figma/DESIGN.md.
2. Home collage only (Figma + DESIGN.md). Pros: one visual language; depth rule still holds
   (≤2 taps). Cons: sitemap prose must be reconciled.
3. Hybrid (tabs + collage). Pros: none. Cons: two nav systems.

### Decision
1. Family UI navigation is the **Home collage**. No bottom tab bar. No FAB.
2. Routes stay as in sitemap (`/capture`, `/archive`, `/ask`, …); only the chrome changes.
3. Steward-only objects (candle / memorial) hide for `family` role.
4. `docs/sitemap.md` nav pattern section is updated to match this ADR.

### Why this option
Visual authority for AppCon is Figma + DESIGN.md. Depth rule ("capture, review, Ask ≤2 taps
from Home") still holds via collage stickers.

### Overrides
- Sitemap tab-bar pattern: superseded.
- Screen IDs, routes, and access zones: unchanged.

### Consequences
- **Easier:** UI matches pitch mockups.
- **Harder:** i18n still has a `tabs.`* block — leave keys (stable), unused in chrome.
- **Follow-up:** AGENTS.md one-line note if it still mentions tabs.
