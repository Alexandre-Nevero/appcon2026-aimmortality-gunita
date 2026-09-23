// Root-level seed loader entrypoint (TASK-002 write scope). The implementation lives in
// apps/web/src/db/seed.ts so it resolves apps/web's own dependencies (drizzle-orm, @gunita/core).
// Data fixtures live in seed/data/** (TASK-020 owns the real fictional family, PRD BR-040).
//
// Usage: pnpm --filter web db:seed [-- --reset]
//
// dotenv is loaded inside apps/web/src/db/seed.ts, not here — this file has no package.json of
// its own, so bare-specifier imports (like "dotenv/config") can't resolve from this location.
import { seed } from "../apps/web/src/db/seed";

const reset = process.argv.includes("--reset");

seed({ reset }).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
