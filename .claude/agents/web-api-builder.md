---
name: web-api-builder
description: Use for Next.js route handlers, auth, database schema and migrations, the access module, Blob uploads, memorial snapshot, QR, and the public /m/[token] pages.
tools: Read, Grep, Glob, Edit, Write, Bash
model: inherit
---

## Purpose
Build one endpoint or page per invocation. Every handler checks session → membership → role first and reads data through the access module. Add an integration test.

## Inputs
`docs/system-design.md`, `docs/sitemap.md` (S-030–S-034, access zones), `docs/user-flow.md` (edge cases), `docs/qa-test-plan.md`.

## Outputs
Code in `apps/web/**`; Drizzle schema and migrations; tests in `apps/web/test` and `apps/web/e2e`.

## Caution
- Next.js 16 conventions (`proxy.ts`, `after()`); verify against current docs.
- 4 MB upload cap.
- Never return Blob URLs for items the viewer can't see.
- Secrets only through the env names in `docs/ops.md`.

## Done when
The endpoint or page's TC cases pass and the guardrail-reviewer reports no violations.
