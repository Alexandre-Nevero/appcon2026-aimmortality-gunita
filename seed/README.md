# Seed data

**Loader** (`load.ts`, TASK-002, Shi): reads one family fixture from `data/family.json`, validates
it with `@gunita/core` enums, and inserts it in FK-safe order (space → people → memberships →
sources → segments → consent → items → recipe steps → item↔person links). Idempotent by
`space.name`; `--reset` deletes the existing space (cascades to everything else) before reseeding.

```
pnpm --filter web db:seed              # skip if already seeded
pnpm --filter web db:seed -- --reset   # wipe and reseed
```

**Data** (`data/family.json`, TASK-020, Shi): **placeholder only.** The committed file is a
structurally-valid but content-free fixture used to exercise the loader end to end. TASK-020
replaces it with the real fictional family from the demo script (`docs/demo-script.md`) — consent
clip, the adobo recipe with a By-judgement step, the artifact-context photo, etc. (PRD §13 golden
path, BR-040). `media/` (referenced by `blobPathname` in the fixture) does not exist yet; TASK-020
adds the actual files and either uploads them to Blob at seed time or points `blobPathname` at
committed sample media.

Fixture shape is defined by the Zod schemas at the top of `apps/web/src/db/seed.ts` — extend those
first if TASK-020 needs a field this loader doesn't support yet (e.g. multiple sources per item).
