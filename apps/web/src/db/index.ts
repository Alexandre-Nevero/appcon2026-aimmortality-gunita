import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

// Lazy on purpose: Next.js imports route modules at build time to collect page data, without ever
// calling the DB. Throwing here eagerly (e.g. on a fresh checkout with no .env.local yet) would
// break `next build` in every environment that hasn't configured Neon. The check still happens —
// just deferred to the first real query, matching every other case where an env var is genuinely
// required at runtime.
let instance: Db | undefined;

function getDb(): Db {
  if (!instance) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not set (see docs/ops.md § Configuration & secrets)");
    }
    instance = drizzle(neon(databaseUrl), { schema });
  }
  return instance;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb() as object, prop, receiver);
  },
});

export { schema };
