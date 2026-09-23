# ADR-008 — Tribute heart shows no count

- **Date:** 2026-09-24
- **Status:** Accepted
- **Owners / agents:** Alex (team lead)
- **Related:** ADR-007; F-023; BR-080; BR-081; pull request #11 review

### Context
ADR-007 allowed one heart per phone on an approved visitor photo, and showed a count once that
count was at least one. Photos were not sorted by the count. On review, that number was still a
score on a grief photo: a picture with 12 looks more loved than a picture with 1. Hiding zero
does not fix that. A lamay can last a week or more, and the anonymous cookie that remembers the
heart was set to one year.

### Why now
The review on the photo-memories pull request asked for this before merge. The count is already
implemented, so the change is a removal, not a new feature.

### Options considered
1. **Keep the count, hide zero.** Already shipped in ADR-007. Still a visible score.
2. **Keep the saved heart, show and return no total.** The phone still sees its own heart filled
   or empty. Nobody else sees a number.
3. **Store the heart only in the browser.** No number is possible, and the httpOnly cookie goes
   away.

### Decision
1. The tribute total is not shown on any surface and is not included in
   `POST /api/m/:token/tributes` or the memories page data. The success body is `{ hearted }` only.
2. `gunita_visitor` expires 14 days after it is first set (`14 × 24 × 60 × 60` seconds). Later
   taps do not extend it.
3. The `tribute` row remains, one per phone per photo, so the same phone still sees a filled heart
   inside those 14 days.

### Why this option
Option 2 keeps the quiet "I remember this" tap from ADR-007 and removes the score Shi flagged.
Option 3 would drop the cookie the rest of the feature relies on.

### Overrides
- **Prior ADRs:** Supersedes ADR-007 decision point 2 (the visible count) only. The rest of ADR-007
  stands, including no comments, no external share, no ranking, and the deferred rate limit.
- **Doc / plan truth:** BR-081, EQ-013, S-033, UF-013, and TC-058/TC-059 no longer describe a shown
  count.
- **Out of scope:** Rate-limiting tribute writes. ADR-007 already defers that. It matters less
  once the number is not shown.

### Consequences
- **Easier:** A photo cannot look more loved than another because of a number.
- **Harder / owed:** Callers must stop reading `count`. The cookie is shorter, so a phone that
  returns after 14 days looks like a new visitor.
- **Known limits:** Clearing cookies or waiting out the 14 days can leave another row. Those rows
  are not shown as a number.
