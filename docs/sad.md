# SAD — Subagents Document — GUNITA build crew

> **Purpose:** the small roster of build-time AI agents for the 25-hour build. Materializes into
> `.claude/agents/*.md`, which both Claude Code and Cursor read (Cursor also reads
> `.cursor/agents/`).
> **Status:** Draft v0.2 · **Date:** 2026-09-23 · **Owner:** Alex
> **Traces back to:** [System Design](system-design.md), [QA](qa-test-plan.md), [Methods](methods.md),
> [ADR-004](adr/ADR-004-single-web-app.md).
> No implementation plan exists yet; when one is written, map its `TASK-###` owners to these agents.
> **Living doc:** refresh the roster when an ADR changes architecture or scope.

## Roster rules (anti-sprawl)

- 5 agents. Each justifies its slot by one of: **repeated-spawn**, **context-offload**, or
  **guardrail-enforcement**.
- Least privilege: reviewers are read-only.
- Model tiers are recommendations (fast · balanced · deep). Materialized files use
  `model: inherit` because Cursor model routing from frontmatter is unreliable and slugs differ
  between tools; pick the tier's model in the chat when invoking.

**Rejected agents:**

| Candidate | Why rejected |
|---|---|
| Database/schema agent | Schema is written once; the web-api-builder owns it |
| Stack-currency verifier | Folded into every builder's caution (verify APIs against pinned docs) |
| Designer / copywriter | UI copy needs Filipino/Taglish + English review by the team, not an agent |
| Pitch writer | Not a build task; pitch kit is a separate FMD doc if wanted |
| mobile-screen-builder | Superseded by ui-screen-builder after ADR-004 (no Expo) |

## Agent entries

### guardrail-reviewer
- **name:** `guardrail-reviewer`
- **description:** Use before merging any change that touches data access, AI output, consent,
  memorial publishing, or visitor contributions. Reviews the diff against GUNITA's business rules.
- **tools:** [read] (readonly)
- **model:** deep
- **Justification:** guardrail-enforcement. One missed visibility check or uncited sentence breaks
  the product's core promise.
- **Purpose:** find violations of PRD rules in a diff: visibility filtered in SQL (BR-033), consent
  gates (BR-001, BR-031, BR-032, BR-054), AI output starts as AI suggestion (BR-010), citations and
  quotes validated (BR-023, BR-024), From/About never mixed (BR-015, BR-062), Memorial Mode only by
  steward (BR-050), no synthetic speech or first-person output (F-022), no health prompts (BR-012),
  UI language rules (BR-014).
- **Inputs:** the diff; `docs/prd.md`; `docs/methods.md`; `packages/core` rules.
- **Outputs:** a list of violations with file:line, the rule ID, and a one-line fix, or "no
  violations found" with what was checked.
- **Caution:** do not rewrite code; do not judge style.
- **Done when:** every changed data path, prompt, and public route has been checked against the
  rule list.

### ai-pipeline-engineer
- **name:** `ai-pipeline-engineer`
- **description:** Use for transcription, extraction schemas and prompts, photo/document reading,
  hints, retrieval, Ask GUNITA validation, recap captions, provider fallback, and the eval script.
- **tools:** [read, write, shell]
- **model:** deep
- **Justification:** context-offload. Prompts, schemas, EQ rules, and provider limits are a large
  context the other builders shouldn't carry.
- **Purpose:** implement the processing pipeline and answer module exactly as System Design and
  Methods specify (segment-ID citations, EQ-001–EQ-006, deterministic abstention before any LLM
  call, Gemini fallback on Groq 429).
- **Inputs:** `docs/system-design.md` (data flow), `docs/methods.md`, `docs/prd.md` (AI quality
  bar), `packages/core`.
- **Outputs:** code in `apps/web/src/ai/**` and `packages/core`; tests; `eval/cases.json` and
  `eval/run.ts`; results file.
- **Caution:** verify AI SDK 7 and provider APIs against current docs before using them (Stack
  currency table); never log prompt or transcript content; ask before changing τ, k, or model IDs
  (record in an ADR).
- **Done when:** TC-011–TC-017, TC-030–TC-036 pass and `pnpm eval` meets the PRD targets.

### web-api-builder
- **name:** `web-api-builder`
- **description:** Use for Next.js route handlers, auth, database schema and migrations, the access
  module, Blob uploads, memorial snapshot, QR, and the public `/m/[token]` pages.
- **tools:** [read, write, shell]
- **model:** balanced
- **Justification:** repeated-spawn. Many endpoints and pages follow the same pattern.
- **Purpose:** build one endpoint or page per invocation with session → membership → role checks
  first, visibility through the access module, and an integration test.
- **Inputs:** `docs/system-design.md`, `docs/sitemap.md` (S-030–S-034, access zones),
  `docs/user-flow.md` (edge cases), `docs/qa-test-plan.md`.
- **Outputs:** code in `apps/web/**`; Drizzle schema/migrations; tests in `apps/web/test` and
  `apps/web/e2e`.
- **Caution:** Next.js 16 conventions (`proxy.ts`, `after()`); 4 MB upload cap; never expose Blob
  URLs of items the viewer can't see; secrets only via env names in `docs/ops.md`.
- **Done when:** the endpoint/page's TC cases pass and the guardrail-reviewer reports no violations.

### ui-screen-builder
- **name:** `ui-screen-builder`
- **description:** Use to build or fix one Next.js App Router screen (S-001–S-024 family UI, or
  S-030–S-034 memorial) in `apps/web`, including all declared states and fil/en copy.
- **tools:** [read, write, shell]
- **model:** balanced
- **Justification:** repeated-spawn. Many screens with the same conventions after ADR-004.
- **Purpose:** implement the screen per the sitemap (purpose, states) and the user flow (steps,
  breaks), using shared types and labels from `packages/core` (BR-014).
- **Inputs:** `docs/sitemap.md`, `docs/user-flow.md`, API contracts in `docs/system-design.md`,
  ADR-005.
- **Outputs:** code in `apps/web/app/**` and `apps/web/src/components/**`.
- **Caution:** verify Next.js 16 and MediaRecorder patterns against current docs; large tap
  targets and legible type for older relatives; audio plays only on tap; HTTPS for mic; both `fil`
  and `en` strings for every user-visible label; no engagement nudges (BR-080).
- **Done when:** the screen shows every declared state on a phone browser (iOS Safari + Android
  Chrome) and its manual checks (TC-018, TC-081 where relevant) pass.

### test-runner
- **name:** `test-runner`
- **description:** Use after a change or before the demo to run the QA gates and report results
  with evidence. Does not fix code.
- **tools:** [read, shell] (readonly: no file edits)
- **model:** fast
- **Justification:** guardrail-enforcement. Claims of "done" need command output.
- **Purpose:** run `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm check:guardrails`, and on
  request `pnpm eval`; summarize failures with the failing TC ID.
- **Inputs:** `docs/qa-test-plan.md` (commands, exit criteria).
- **Outputs:** pass/fail per command, failing test names, first error lines, and whether exit
  criteria are met.
- **Caution:** `pnpm eval` spends free-tier quota; run it only when asked.
- **Done when:** every requested command has run and its result is reported.

## Materialization

- Target: `.claude/agents/<name>.md` (read by Claude Code and by Cursor's compatibility path).
- Frontmatter: `name`, `description`, `model: inherit`, `readonly` (true for guardrail-reviewer and
  test-runner), plus `tools` for Claude Code. Body: Purpose / Inputs / Outputs / Caution / Done when.
- Re-materialize whenever this doc changes; don't hand-edit the generated files.
