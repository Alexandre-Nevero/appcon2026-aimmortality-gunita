# Tribute heart without a count

> **Status:** Approved in conversation, 2026-09-24
> **Branch:** `task/TASK-030-photo-memories` (pull request #11)
> **Supersedes in part:** [ADR-007](../../adr/ADR-007-memorial-photo-memories.md) decision point 2 (the visible count). ADR-007 is not edited. The implementation adds ADR-008.

## Decision

A visitor on `/m/[token]/memories` still leaves one heart per phone per approved visitor photo, and can remove it. The total is never shown and never returned by the API. The `gunita_visitor` cookie lasts 14 days from the moment it is first set. It is not refreshed on later taps.

This accepts the review on pull request #11: a visible count is a score at a wake, even when zero is hidden and the photos are not sorted by it.

## What the visitor sees

- The control is the heart only. Filled means this phone has a saved heart for that photo. Empty means it does not.
- Tapping still saves or removes that one heart.
- If the tap fails, the heart returns to its previous state and the existing failure string is shown (`Couldn't send. Try again.` / `Hindi naipadala. Subukan ulit.`).
- No count is rendered, including zero. No "people remembered this" / "ang nakaalala" string remains.
- The family has no tribute total on any screen. No steward total is added.

## Server

The `tribute` table is unchanged: one row per `(contributionId, visitorKeyHash)`, cascade delete with the contribution, HMAC only.

`listPhotoMemories` still returns whether this phone hearted each photo. It drops `tributeCount` and the `COUNT(*)` query.

`setTribute` still inserts or deletes that phone's row. It returns `true` or `false` for the resulting heart state, or `null` when the contribution is not an approved photo in that memorial. It does not return a count.

`POST /api/m/[token]/tributes`

| Case | Status | Body |
|---|---|---|
| Success | 200 | `{ "hearted": true }` or `{ "hearted": false }` |
| Bad JSON or body | 400 | `{ "error": "invalid_body" }` |
| Memorial not public, or photo not an approved visitor photo in that memorial | 404 | `{ "error": "not_found" }` |

The success body has no `count` key.

The cookie is still set only when the request has no valid `gunita_visitor` value. Flags stay httpOnly, SameSite lax, path `/`, secure in production. `maxAge` is `14 * 24 * 60 * 60` seconds (1,209,600). Later requests that already have a valid cookie do not set it again, so the 14 days do not slide.

## What does not change

- Approved visitor photos only, oldest first, no comments, no share control, no ranking.
- S-032 still has no link to S-033.
- Rate-limiting tribute writes stays the hackathon limit already written in ADR-007. It is not built in this change. Hiding the count is why that limit can stay deferred.
- Clearing or blocking cookies can still create another row. Those rows are not shown as a number.

## Docs

Do not edit ADR-007. Add `docs/adr/ADR-008-tribute-heart-no-count.md`, Status Accepted, citing ADR-007. It records two overrides:

1. The tribute total is not shown on any surface and is not included in the public API.
2. `gunita_visitor` expires 14 days after it is set.

Update the living docs so they match ADR-008:

- **PRD F-023 acceptance.** Replace "a count of zero shows no number" with "no tribute total is shown."
- **PRD BR-081.** Remove the sentence that the count shows when it is at least one. State that the total is never shown.
- **PRD risk row** "Tribute counts read as a popularity contest." Mitigation becomes: no count is shown.
- **Methods EQ-013.** The output is no longer a shown count. The row states that the tribute total is not displayed. Delete the `COUNT(*)` display formula. Keep the ID so it is not reused.
- **Methods traceability.** F-023 points at the heart toggle (TC-058), not at a shown count.
- **Data model `tribute`.** The unique index enforces one heart per phone. It is not described as serving a visible count.
- **Sitemap S-033.** Drop "gentle count."
- **User flow UF-013 step 3.** Success is a filled heart, not "N people remembered this."
- **System design.** The memories read path does not include tribute counts. The POST line does not imply a returned count.
- **QA TC-058.** Hearting twice leaves one row. The response is `{ hearted: true }` with no `count`. Un-hearting returns `{ hearted: false }`. Cookie `maxAge` is 1,209,600. The other 404 and 400 cases stay.
- **QA TC-059.** The phone check expects no number on the photo.

## Tests

- Delete `tributeCountLabel` and the tests that expect "1 person remembered this", "12 people remembered this", and "12 ang nakaalala".
- The heart component no longer takes or displays a count. Typecheck fails if a caller still passes `tributeCount`.
- `VISITOR_COOKIE_MAX_AGE_SECONDS` is asserted equal to 1,209,600.
- The route's success JSON is `{ hearted }` and has no `count` key. TC-058's curl check still waits on Neon; until then the route source and typecheck are the gate.
