import { generateObject } from "ai";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { embedText } from "@/src/ai/embed";
import { models } from "@/src/ai/models";
import { jsonResponse } from "@/src/auth/http";
import { db } from "@/src/db";
import { person, recap, space } from "@/src/db/schema";

export const dynamic = "force-dynamic";

type CheckResult = {
  ok: boolean;
  configured: boolean;
  checked: boolean;
  latencyMs: number | null;
  error: string | null;
};

type DemoSpaceStatus = {
  name: string;
  featuredName: string | null;
  lifecycleMode: "during" | "memorial";
  memorialLinkDisabled: boolean;
  memorialTokenPresent: boolean;
  recapStatus: string | null;
} | null;

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

async function timedCheck(run: () => Promise<void>): Promise<Pick<CheckResult, "ok" | "latencyMs" | "error">> {
  const startedAt = Date.now();
  try {
    await run();
    return { ok: true, latencyMs: Date.now() - startedAt, error: null };
  } catch (error) {
    return { ok: false, latencyMs: Date.now() - startedAt, error: errorMessage(error) };
  }
}

async function getDemoSpaceStatus(): Promise<DemoSpaceStatus> {
  const [spaceRow] = await db
    .select({
      id: space.id,
      name: space.name,
      lifecycleMode: space.lifecycleMode,
      memorialLinkDisabled: space.memorialLinkDisabled,
      memorialToken: space.memorialToken,
      recapStatus: recap.status,
    })
    .from(space)
    .leftJoin(recap, eq(recap.spaceId, space.id))
    .orderBy(asc(space.createdAt))
    .limit(1);

  if (!spaceRow) return null;

  const featured = await db.query.person.findFirst({
    where: and(eq(person.spaceId, spaceRow.id), eq(person.isFeatured, true)),
    columns: { displayName: true },
  });

  return {
    name: spaceRow.name,
    featuredName: featured?.displayName ?? null,
    lifecycleMode: spaceRow.lifecycleMode,
    memorialLinkDisabled: spaceRow.memorialLinkDisabled,
    memorialTokenPresent: Boolean(spaceRow.memorialToken),
    recapStatus: spaceRow.recapStatus ?? null,
  };
}

async function checkDatabase(): Promise<{
  result: CheckResult;
  demoSpace: DemoSpaceStatus;
}> {
  let demoSpace: DemoSpaceStatus = null;
  const { ok, latencyMs, error } = await timedCheck(async () => {
    demoSpace = await getDemoSpaceStatus();
  });

  return {
    result: {
      ok,
      configured: hasEnv("DATABASE_URL"),
      checked: true,
      latencyMs,
      error,
    },
    demoSpace,
  };
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

async function checkGroq(deep: boolean): Promise<CheckResult> {
  const configured = hasEnv("GROQ_API_KEY");
  if (!configured) return staticCheck(false, "GROQ_API_KEY");
  if (!deep) return staticCheck(true, "GROQ_API_KEY");

  const { ok, latencyMs, error } = await timedCheck(async () => {
    const { object } = await generateObject({
      model: models.text,
      schema: z.object({ ok: z.literal(true) }),
      prompt: 'Reply with {"ok": true}.',
    });

    if (!object.ok) {
      throw new Error("Groq health response did not confirm ok=true");
    }
  });

  return { ok, configured: true, checked: true, latencyMs, error };
}

async function checkGoogle(deep: boolean): Promise<CheckResult> {
  const configured = hasEnv("GOOGLE_GENERATIVE_AI_API_KEY");
  if (!configured) return staticCheck(false, "GOOGLE_GENERATIVE_AI_API_KEY");
  if (!deep) return staticCheck(true, "GOOGLE_GENERATIVE_AI_API_KEY");

  const { ok, latencyMs, error } = await timedCheck(async () => {
    const embedding = await embedText(models.embed, "health", "RETRIEVAL_QUERY");
    if (embedding.length === 0) {
      throw new Error("Google embedding health check returned an empty vector");
    }
  });

  return { ok, configured: true, checked: true, latencyMs, error };
}

export async function GET(request: Request): Promise<Response> {
  const deep = isDeepCheck(request);
  const blobConfigured = hasEnv("BLOB_READ_WRITE_TOKEN");
  const { result: dbCheck, demoSpace } = await checkDatabase();
  const groqCheck = await checkGroq(deep);
  const googleCheck = await checkGoogle(deep);
  const blobCheck = staticCheck(blobConfigured, "BLOB_READ_WRITE_TOKEN");

  const ok = dbCheck.ok && blobCheck.ok && groqCheck.ok && googleCheck.ok;

  return jsonResponse(
    {
      ok,
      deep,
      checkedAt: new Date().toISOString(),
      checks: {
        db: dbCheck,
        blob: blobCheck,
        providers: {
          groq: groqCheck,
          google: googleCheck,
        },
      },
      demoSpace,
    },
    { status: ok ? 200 : 503 },
  );
}
