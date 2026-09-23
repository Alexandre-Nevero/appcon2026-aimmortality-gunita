import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/src/db";
import { authAccount, authSession, authUser, authVerification } from "@/src/db/schema";

const baseURL =
  process.env.BETTER_AUTH_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

function requireBetterAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "BETTER_AUTH_SECRET is required (see docs/ops.md § Configuration & secrets).",
    );
  }

  return secret;
}

function createAuth() {
  return betterAuth({
    baseURL,
    basePath: "/api/auth",
    secret: requireBetterAuthSecret(),
    trustedOrigins: [baseURL],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: authUser,
        session: authSession,
        account: authAccount,
        verification: authVerification,
      },
    }),
    emailAndPassword: {
      enabled: true,
    },
    plugins: [nextCookies()],
  });
}

type AuthInstance = ReturnType<typeof createAuth>;
let authInstance: AuthInstance | undefined;

export function getAuth(): AuthInstance {
  if (authInstance) {
    return authInstance;
  }

  const createdAuth = createAuth();
  authInstance = createdAuth;

  return createdAuth;
}
