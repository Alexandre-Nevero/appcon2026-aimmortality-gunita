# ADR-006 — Product name: Himmel (was GUNITA)

- **Date:** 2026-09-24
- **Status:** Accepted
- **Owners / agents:** Alex (team lead), with Gian (product design)
- **Related:** `docs/brd.md`, `docs/prd.md`, `docs/bmc.md`, `docs/pitch/visual-direction.md`,
  `docs/pitch/README.md`; i18n `content/i18n/{fil,en}.json`; `content/design-tokens.css`

### Context
The product shipped its early docs and copy under the working name **GUNITA** (Filipino *gunita*,
"remembrance"). During the visual-direction pass (TASK-004) the team settled on **Himmel** as the
product name for the pitch and all product docs. Naming must be consistent for judges, the BRD/PRD,
and the pitch kit, but the `docs/adr/` folder is an append-only record — older Accepted ADRs cannot
be rewritten in place.

### Why now
AppCon 2026 is due Sep 24, 2026. The pitch, BRD, PRD, and BMC all need one locked product name
before submission. Leaving mixed GUNITA/Himmel references would confuse judges and break the
"one fact, one home" rule in `docs/index.md`.

### Options considered
1. **Rewrite the product name inside ADR-001/002/004/005 in place.** Pros: every file reads
   Himmel immediately. Cons: violates the append-only decision audit — agents follow the most
   recent Accepted ADR, and editing archived records destroys the "why" trail.
2. **Keep GUNITA everywhere.** Pros: zero churn. Cons: the visual direction and pitch kit already
   use Himmel; the name would be inconsistent at submission.
3. **New ADR that renames the product forward, leaving older ADRs untouched.** Pros: preserves the
   archive, newest Accepted ADR wins, matches the AGENTS.md supersede rule. Cons: older ADRs still
   read GUNITA, which is correct — they record decisions as they were made.

### Decision
1. The product name is **Himmel** for all forward-facing docs: BRD, PRD, BMC, pitch kit, i18n, and
   design tokens.
2. This ADR is the sole authority for the name change. **ADR-001/002/004/005 are not edited** —
   their GUNITA references are historical record and stay as written.
3. **GUNITA** survives only as etymology / earlier working name, noted in the glossary and
   `docs/pitch/README.md`.
4. Repo folder, older commits, and app i18n strings may still say `gunita` until a follow-up copy
   pass; that lag is cosmetic, not a decision.

### Why this option
The ADR folder is the record archive. Newest Accepted ADR wins until the owning doc is reconciled,
so a single new ADR gives every agent one place to look without rewriting history. Option 1 would
corrupt the audit trail; option 2 splits the pitch between two names.

### Overrides
- **Prior ADRs:** Does not supersede ADR-001/002/004/005 — those remain Accepted for their own
  decisions (platform, stack, delivery, language). This ADR only owns the product name.
- **Doc / plan truth:** `docs/brd.md` and `docs/prd.md` move to Himmel; `docs/bmc.md` and
  `docs/pitch/*` are written as Himmel. Reconciling leftover GUNITA prose is a copy pass, not a
  new decision.
- **Out of scope:** Repo folder rename, domain names, and i18n string values (TASK-004 follow-ups).

### Consequences
- **Easier:** one locked name for the pitch and submission; agents follow ADR-006 for naming.
- **Harder / owed:** older ADRs and some code identifiers still read GUNITA until a copy pass;
  reviewers must not "fix" those archived lines.
- **Follow-up:** i18n `fil.json` / `en.json` and any user-visible GUNITA strings get a rename pass.
