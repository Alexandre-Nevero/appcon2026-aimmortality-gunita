import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { nextCookies } from "better-auth/next-js";

import { authStore } from "@/src/auth/store";

const baseURL =
  process.env.BETTER_AUTH_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const secret =
  process.env.BETTER_AUTH_SECRET ?? "gunita-local-build-secret-gunita-local-build-secret";

export const auth = betterAuth({
  baseURL,
  basePath: "/api/auth",
  secret,
  trustedOrigins: [baseURL],
  database: memoryAdapter(authStore),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies()],
});
