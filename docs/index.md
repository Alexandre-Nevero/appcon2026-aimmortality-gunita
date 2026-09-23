# Documentation Index — GUNITA

**Maintained by:** Alex
**Last updated:** 2026-09-23
**FMD version:** 4.6.2

## 0. Source-of-truth map (one fact, one home)

Each concern has one canonical owner. Other docs link to it instead of restating it. When two docs
disagree, the canonical owner wins until the other is reconciled.

| Concern | Canonical owner | Note |
|---|---|---|
| Decision *why* / pivots (**audit root**) | [ADRs](adr/) | append-only; newest Accepted wins |
| Business objectives, business model, business risks | [BRD](brd.md) | model hypothesis per ADR-003 |
| What we build (features `F-###`, journeys `UJ-###`, rules `BR-###`), judging context | [PRD](prd.md) | approved v0.3 |
| Screens · IA · routes · access (`S-###`), **ux-maps** static half | [Sitemap](sitemap.md) | |
| Journeys across screens (`UF-###`, edge cases `EV-###`), **ux-maps** dynamic half | [User Flow](user-flow.md) | requires sitemap |
| How it's built: architecture, components, integrations, security posture, stack currency | [System Design](system-design.md) | no separate security doc for this build |
| Every computed number and threshold (`EQ-###`, `DS-###`) | [Methods](methods.md) | glass-box ledger |
| Tests · cases · commands (`TC-###`) | [QA Test Plan](qa-test-plan.md) | |
| Deploy, config/secrets names, incidents, backup | [Ops](ops.md) | lean, demo-focused |
| Build crew (agent roster) | [SAD](sad.md) | materialized to `.claude/agents/*.md` |
| Living execution (`TASK-###`), owners, cut line | [Implementation Plan](implementation-plan.md) | Abu = Keeper; no cross-task Depends-on |

**Not generated yet:** `idea.md` (seed brief), pitch kit (Gian TASK-023), data model (Shi TASK-002).

## 1. Document suite

| Document | File | Status | Last updated |
|---|---|---|---|
| PRD | [prd.md](prd.md) | Approved v0.3 | 2026-09-23 |
| BRD | [brd.md](brd.md) | Draft v0.2 | 2026-09-23 |
| Sitemap | [sitemap.md](sitemap.md) | Draft | 2026-09-23 |
| User Flow | [user-flow.md](user-flow.md) | Draft | 2026-09-23 |
| System Design | [system-design.md](system-design.md) | Draft v0.2 | 2026-09-23 |
| Methods | [methods.md](methods.md) | Draft v0.2 | 2026-09-23 |
| QA Test Plan | [qa-test-plan.md](qa-test-plan.md) | Draft v0.2 | 2026-09-23 |
| Ops | [ops.md](ops.md) | Draft v0.2 | 2026-09-23 |
| SAD | [sad.md](sad.md) | Draft v0.2 | 2026-09-23 |
| Implementation Plan | [implementation-plan.md](implementation-plan.md) | Living | 2026-09-23 |
| ADR-001 Mobile app + web memorial | [adr/ADR-001-mobile-app-plus-web-memorial.md](adr/ADR-001-mobile-app-plus-web-memorial.md) | **Superseded** by ADR-004 | 2026-09-23 |
| ADR-002 Free-tier stack | [adr/ADR-002-free-tier-stack.md](adr/ADR-002-free-tier-stack.md) | Accepted | 2026-09-23 |
| ADR-003 B2B2C Memorial package | [adr/ADR-003-b2b2c-memorial-package.md](adr/ADR-003-b2b2c-memorial-package.md) | Accepted | 2026-09-23 |
| ADR-004 Single Next.js web app | [adr/ADR-004-single-web-app.md](adr/ADR-004-single-web-app.md) | Accepted | 2026-09-23 |
| ADR-005 UI language fil / en | [adr/ADR-005-ui-language.md](adr/ADR-005-ui-language.md) | Accepted | 2026-09-23 |

## 2. Light health check (advisory)

- [x] Every PRD feature F-001–F-022 has QA cases or a manual plan.
- [x] Network-exposed surfaces declare auth/authz (System Design → Security & access).
- [x] Displayed and decision-making numbers cite `EQ-###` (Methods).
- [x] Platform is single web app (ADR-004); UI language locked (ADR-005).
- [x] Implementation plan written (owners, `TASK-###`, cut line, no cross-person Depends-on).
- [ ] Data model doc written (Shi TASK-002).
- [ ] Pitch kit written (Gian TASK-023).
