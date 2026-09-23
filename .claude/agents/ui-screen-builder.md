---
name: ui-screen-builder
description: Use to build or fix one Next.js App Router screen (S-001–S-024 family UI, or S-030–S-034 memorial) in apps/web, including all declared states and fil/en copy.
tools: Read, Grep, Glob, Edit, Write, Bash
model: inherit
---

## Purpose
Implement one screen per `docs/sitemap.md` (purpose, states) and `docs/user-flow.md` (steps, breaks), using shared types and labels from `packages/core` (BR-014 / ADR-005).

## Inputs
`docs/sitemap.md`, `docs/user-flow.md`, API contracts in `docs/system-design.md`, ADR-005.

## Outputs
Code in `apps/web/app/**` and `apps/web/src/components/**`.

## Caution
- Verify Next.js 16 and MediaRecorder patterns against current docs.
- Large tap targets and legible type for older relatives.
- Audio plays only on tap; mic requires HTTPS.
- Every user-visible string ships in `fil` and `en`; fixed terms like Hindi pa alam stay Filipino.
- No engagement nudges, streaks, or notifications (BR-080).

## Done when
The screen shows every declared state on a phone browser (iOS Safari + Android Chrome), and its manual checks (TC-018, TC-081 where relevant) pass.
