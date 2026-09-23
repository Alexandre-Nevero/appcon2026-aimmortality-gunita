# ADR-007 — Memorial photo memories with soft tributes

- **Date:** 2026-09-23
- **Status:** Accepted
- **Owners / agents:** Alex (team lead)
- **Related:** F-019, F-020, F-023 (new); BR-062, BR-080, BR-081 (new); PRD Non-goals; S-030, S-033 (new)

### Context
At a lamay, visitors bring photos. F-019/F-020 already let a visitor submit a photo and the steward
approve it into "Memories from others" on the recap (S-030). Those photos sit inside a long recap
page. The team wants approved visitor photos to become a scrollable set of memories, like "Memories"
in Google Photos, and wants visitors to be able to quietly say "I remember this too." The PRD
Non-goals currently exclude "feeds, likes, followers, comments on visitor posts", and BR-080 bans
gamification and engagement notifications.

### Why now
The feature is demo-critical for AppCon (2026-09-24). Builders need a written line between a quiet
tribute and a social feed before code lands.

### Options considered
1. **No change.** Photos stay only in S-030 "Memories from others". Safe, weakest demo moment.
2. **Photo memories + soft tribute heart, in-memorial only.** Separate full-screen vertical scroll of
   approved visitor photos; one heart per device with a gentle count; no comments, no share, no
   ranking, no notifications.
3. **Option 2 plus external sharing** (share sheet link or exported image card). Stronger reach,
   but it moves visitor photos (which may show living relatives) off the memorial without their
   consent and invites comment threads elsewhere.

### Decision
1. Add **F-023 Photo memories** at `/m/[token]/memories` (S-033): approved visitor contributions
   that include a photo, shown one per screen in a vertical scroll, oldest first.
2. Add **BR-081 Soft tributes**: a visitor may leave one heart per photo per device and remove it.
   The count shows only when at least one person has left a heart. Tributes never reorder, rank,
   filter, or trigger notifications. No comments. No share control. No analytics event for tributes.
3. Only photos a visitor submitted and the steward approved appear. Family archive photos do not.
4. S-030 links to S-033. S-032 (Thank you) does not, because the confirmation ends the interaction
   (BR-080).
5. Tributes store only `HMAC-SHA-256(IP_HASH_SECRET, anonymous cookie id)`. No IP, name, or raw
   cookie value.

### Why this option
Option 2 gives the lamay a shared, quiet way to remember without typing, which is the moment the
team wants judges to see. It keeps conversation in person, keeps visitor photos on the family's
moderated memorial, and keeps BR-080's intent: nothing pulls grieving people back.

### Overrides
- **Prior ADRs:** none superseded. Relies on ADR-002 (public Blob capability URLs) and ADR-004.
- **Doc / plan truth:** PRD Non-goals line on public social features is amended (the heart on
  approved visitor photos inside the memorial is the only exception). PRD gains F-023, BR-081,
  UJ-009. Sitemap gains S-033. System Design public surface gains `POST /api/m/:token/tributes`.
- **Out of scope:** comments, external sharing, showing archive photos in S-033, steward-curated
  ordering, tribute counts on steward dashboards.

### Consequences
- **Easier:** a clear demo beat; one reusable memorial-visibility rule (`isMemorialPublic`) for all
  `/m/*` surfaces.
- **Harder / owed:** one new table and migration; one more public write endpoint.
- **Known limits (hackathon):** "no external share" is a product rule, not a technical block
  (screenshots, shareable memorial link, public Blob URLs). Clearing or blocking cookies lets one
  person leave more than one heart; counts are soft and never used for ordering. Revisit before
  real families use it: rate-limit tributes per hashed IP, private Blob store.
- **Follow-up:** decide after AppCon whether any external sharing is acceptable, with consent from
  the contributor and the steward.
