import { createHash, timingSafeEqual } from "node:crypto";

import { list } from "@vercel/blob";
import { generateObject } from "ai";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { embedText } from "@/src/ai/embed";
import { models } from "@/src/ai/models";
import { ApiError } from "@/src/auth/errors";
import { errorResponse, jsonResponse } from "@/src/auth/http";
import { db } from "@/src/db";
import { recap, space } from "@/src/db/schema";

export const dynamic = "force-dynamic";

type CheckResult = {
  ok: boolean;
  configured: boolean;
  checked: boolean;
  latencyMs: number | null;
  error: string | null;
};

type MonitoredSpaceState = {
  lifecycleMode: "during" | "memorial";
  memorialLinkEnabled: boolean;
  memorialTokenPresent: boolean;
  recapStatus: string | null;
};

type MonitoredSpaceCheck = {
  check: CheckResult;
  state: MonitoredSpaceState | null;
};

function isDeepCheck(request: Request): boolean {
  const value = new URL(request.url).searchParams.get("deep");
  return value === "1" || value === "true";
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

function hasEnv(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

function staticCheck(configured: boolean, label: string): CheckResult {
  return {
    ok: configured,
    configured,
    checked: false,
    latencyMs: null,
    error: configured ? null : `${label} is not set`,
  };
}

async function timedCheck<T>(
  run: () => Promise<T>,
  failureMessage?: string,
): Promise<{ ok: boolean; latencyMs: number; error: string | null; value: T | null }> {
  const startedAt = Date.now();
  try {
    return {
      ok: true,
      latencyMs: Date.now() - startedAt,
      error: null,
      value: await run(),
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: failureMessage ?? errorMessage(error),
      value: null,
    };
  }
}

function parseBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;

  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match?.[1]?.trim() || null;
}

function compareSecrets(provided: string, expected: string): boolean {
  const providedDigest = createHash("sha256").update(provided).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(providedDigest, expectedDigest);
}

function requirePrivilegedHealthAccess(request: Request): void {
  const expectedSecret = process.env.HEALTH_CHECK_SECRET?.trim();
  if (!expectedSecret) {
    throw new ApiError(
      503,
      "HEALTH_CHECK_MISCONFIGURED",
      "HEALTH_CHECK_SECRET is not set (see docs/ops.md § Configuration & secrets).",
    );
  }

  const providedSecret = parseBearerToken(request);
  if (!providedSecret) {
    throw new ApiError(
      401,
      "HEALTH_CHECK_AUTH_REQUIRED",
      "A valid Authorization: Bearer <token> header is required for deep health checks.",
    );
  }

  if (!compareSecrets(providedSecret, expectedSecret)) {
    throw new ApiError(403, "HEALTH_CHECK_FORBIDDEN", "The provided health check secret is invalid.");
  }
}

async function checkDatabase(): Promise<CheckResult> {
  const configured = hasEnv("DATABASE_URL");
  if (!configured) return staticCheck(false, "DATABASE_URL");

  const { ok, latencyMs, error } = await timedCheck(
    async () => {
      await db.execute(sql`select 1`);
    },
    "Database reachability check failed.",
  );

  return { ok, configured, checked: true, latencyMs, error };
}

async function checkBlob(deep: boolean): Promise<CheckResult> {
  const configured = hasEnv("BLOB_READ_WRITE_TOKEN");
  if (!configured) return staticCheck(false, "BLOB_READ_WRITE_TOKEN");
  if (!deep) return staticCheck(true, "BLOB_READ_WRITE_TOKEN");

  const { ok, latencyMs, error } = await timedCheck(
    async () => {
      await list({ limit: 1 });
    },
    "Blob deep check failed.",
  );

  return { ok, configured, checked: true, latencyMs, error };
}

async function checkGroq(deep: boolean): Promise<CheckResult> {
  const configured = hasEnv("GROQ_API_KEY");
  if (!configured) return staticCheck(false, "GROQ_API_KEY");
  if (!deep) return staticCheck(true, "GROQ_API_KEY");

  const { ok, latencyMs, error } = await timedCheck(
    async () => {
      const { object } = await generateObject({
        model: models.text,
        schema: z.object({ ok: z.literal(true) }),
        prompt: 'Reply with {"ok": true}.',
      });

      if (!object.ok) {
        throw new Error("Groq health response did not confirm ok=true");
      }
    },
    "Groq deep check failed.",
  );

  return { ok, configured, checked: true, latencyMs, error };
}

async function checkGoogle(deep: boolean): Promise<CheckResult> {
  const configured = hasEnv("GOOGLE_GENERATIVE_AI_API_KEY");
  if (!configured) return staticCheck(false, "GOOGLE_GENERATIVE_AI_API_KEY");
  if (!deep) return staticCheck(true, "GOOGLE_GENERATIVE_AI_API_KEY");

  const { ok, latencyMs, error } = await timedCheck(
    async () => {
      const embedding = await embedText(models.embed, "health", "RETRIEVAL_QUERY");
      if (embedding.length === 0) {
        throw new Error("Google embedding health check returned an empty vector");
      }
    },
    "Google deep check failed.",
  );

  return { ok, configured, checked: true, latencyMs, error };
}

async function checkMonitoredSpace(): Promise<MonitoredSpaceCheck | null> {
  const monitoredSpaceId = process.env.HEALTH_CHECK_SPACE_ID?.trim();
  if (!monitoredSpaceId) return null;

  const { ok, latencyMs, error, value } = await timedCheck(async () => {
    const [spaceRow] = await db
      .select({
        lifecycleMode: space.lifecycleMode,
        memorialLinkDisabled: space.memorialLinkDisabled,
        memorialToken: space.memorialToken,
        recapStatus: recap.status,
      })
      .from(space)
      .leftJoin(recap, eq(recap.spaceId, space.id))
      .where(eq(space.id, monitoredSpaceId))
      .limit(1);

    if (!spaceRow) {
      throw new Error("HEALTH_CHECK_SPACE_ID did not match any space.");
    }

    return {
      lifecycleMode: spaceRow.lifecycleMode,
      memorialLinkEnabled: !spaceRow.memorialLinkDisabled,
      memorialTokenPresent: Boolean(spaceRow.memorialToken),
      recapStatus: spaceRow.recapStatus ?? null,
    } satisfies MonitoredSpaceState;
  });

  return {
    check: {
      ok,
      configured: true,
      checked: true,
      latencyMs,
      error,
    },
    state: value,
  };
}

export async function GET(request: Request): Promise<Response> {
  try {
    const deep = isDeepCheck(request);
    if (deep) {
      requirePrivilegedHealthAccess(request);
    }

    const [dbCheck, blobCheck, groqCheck, googleCheck, monitoredSpace] = await Promise.all([
      checkDatabase(),
      checkBlob(deep),
      checkGroq(deep),
      checkGoogle(deep),
      deep ? checkMonitoredSpace() : Promise.resolve(null),
    ]);

    const ok = dbCheck.ok && blobCheck.ok && groqCheck.ok && googleCheck.ok;

    return jsonResponse(
      {
        ok,
        deep,
        privileged: deep,
        checkedAt: new Date().toISOString(),
        checks: {
          db: dbCheck,
          blob: blobCheck,
          providers: {
            groq: groqCheck,
            google: googleCheck,
          },
          ...(monitoredSpace ? { monitoredSpace } : {}),
        },
      },
      { status: ok ? 200 : 503 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
