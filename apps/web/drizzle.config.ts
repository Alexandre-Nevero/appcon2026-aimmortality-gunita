import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// docs/ops.md § Configuration & secrets: local secrets live in `.env.local`. Plain "dotenv/config"
// only loads a literal `.env`, so it silently misses `.env.local` — load that first, then fall back
// to `.env` for anything not already set.
config({ path: ".env.local" });
config();

// Only `migrate`/`push`/`studio` need a real connection; `generate` diffs the schema file alone.
// docs/ops.md § Configuration & secrets names DATABASE_URL_UNPOOLED for migrations.
const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.DATABASE_URL ??
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
});
