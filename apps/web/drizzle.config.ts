import "dotenv/config";

import { defineConfig } from "drizzle-kit";

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
