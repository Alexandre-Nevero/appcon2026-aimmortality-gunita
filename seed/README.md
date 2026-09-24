# Seed data

**Loader** (`load.ts`, TASK-002, Shi): reads one family fixture from `data/family.json`, validates
it with `@gunita/core` enums, and inserts it in FK-safe order (space → people → memberships →
sources → segments → consent → items → recipe steps → item↔person links). Idempotent by
`space.name`; `--reset` deletes the existing space (cascades to everything else) before reseeding.

```
pnpm --filter web db:seed              # skip if already seeded
pnpm --filter web db:seed -- --reset   # wipe and reseed
```

**Data** (`data/family.json`, TASK-020, Shi): the real fictional family (PRD BR-040 — no real
deceased person, public figure, or public family; fully invented). **Pamilya Santos**, featured
person **Cornelia "Nena" Santos (Lola Nena)** — reuses the example alias already in
`docs/data-model.md`, so it ties to existing docs rather than inventing an unrelated name.

Six reviewed items, spanning every review-state and visibility the golden path and `eval/cases.json`
need to exercise:

| Item | Type | Review state | Visibility | Why it exists |
|---|---|---|---|---|
| Ang Palengke Bago ng Media Noche | story | verified | family | ordinary answerable content |
| Adobo ni Lola Nena | recipe | verified | memorial | measured + judgement steps (BR-013, EQ-004) |
| Pagdalaw sa Puntod Tuwing Undas | tradition | verified | memorial | ordinary answerable content, Memorial-visible |
| Ang Unang Bahay ng Pamilya | fact | **uncertain** | family | disputed_or_uncertain eval cases need a real uncertain item |
| Sino ang Nagturo ng Adobo kay Lola Nena | fact | **disputed** | family | same, needs a real disputed item + `disputeNote` (BR-020) |
| Isang Pribadong Alaala | story | verified | **private** | visibility_leak eval cases need a real item a family-role viewer must never see (BR-033) |

Plus: consent evidence (private text source), `publishMemorial: true`, 3 approved visitor photo
contributions (S-033) and 1 pending text contribution (moderation queue non-empty state).

**Known limitations** (not fixed here — see TASK-020 PR #15 for detail):
- Photo contributions use placeholder image URLs (`picsum.photos`); the seed loader has no upload
  step, it stores `photoBlobPathname` exactly as given rather than reading `media/` and uploading to
  Blob. Swap in real photos before the demo if any exist.
- The published recap (`recap.snapshot`) is **empty** right after seeding — `seed.ts`'s
  `publishMemorial` branch doesn't pre-populate curated cards. TASK-024 rehearsal needs to go
  through the real steward UI (Memorial Mode → select → recap editor → publish) using this data as
  raw material before the memorial page shows real cards.

Fixture shape is defined by the Zod schemas in `apps/web/src/db/seed-fixture.ts` — extend those
first if a future change needs a field this loader doesn't support yet (e.g. multiple sources per
item).

**Eval dataset** (`../eval/cases.json`, TASK-005/TASK-021): 27 questions against this same family —
10 answerable, 6 unanswerable, 3 partial, 2 disputed/uncertain, 4 adversarial, 2 visibility-leak,
matching the PRD's exact table and `run-eval.ts`'s `DATASET_COUNTS` contract. Every
`permittedItemTitles`/`forbiddenItemTitles` reference above is one of the six item titles in this
file — if an item's title changes here, update `eval/cases.json` too, or `pnpm eval` will fail
`malformed_cases_file` validation on the next run.
