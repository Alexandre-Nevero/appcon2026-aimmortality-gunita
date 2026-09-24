import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

type MonitoredSpaceRow = {
  lifecycleMode: "during" | "memorial";
  memorialLinkDisabled: boolean;
  memorialToken: string | null;
  recapStatus: string | null;
};

async function importRouteWithMocks(options?: {
  monitoredSpaceRows?: MonitoredSpaceRow[];
  dbExecuteImpl?: () => Promise<unknown>;
  listImpl?: () => Promise<unknown>;
  generateObjectImpl?: () => Promise<{ object: { ok: true } }>;
  embedTextImpl?: () => Promise<number[]>;
}) {
  vi.resetModules();

  const dbExecute = vi.fn(options?.dbExecuteImpl ?? (async () => [{ ok: 1 }]));
  const selectLimit = vi.fn(async () => options?.monitoredSpaceRows ?? []);
  const selectWhere = vi.fn(() => ({ limit: selectLimit }));
  const selectLeftJoin = vi.fn(() => ({ where: selectWhere }));
  const selectFrom = vi.fn(() => ({ leftJoin: selectLeftJoin }));
  const dbSelect = vi.fn(() => ({ from: selectFrom }));
  const blobList = vi.fn(options?.listImpl ?? (async () => ({ blobs: [], hasMore: false })));
  const generateObject = vi.fn(
    options?.generateObjectImpl ?? (async () => ({ object: { ok: true as const } })),
  );
  const embedText = vi.fn(options?.embedTextImpl ?? (async () => [0.25, 0.5, 0.75]));

  vi.doMock("@/src/db", () => ({
    db: {
      execute: dbExecute,
      select: dbSelect,
    },
  }));
  vi.doMock("@vercel/blob", () => ({ list: blobList }));
  vi.doMock("ai", () => ({ generateObject }));
  vi.doMock("@/src/ai/embed", () => ({ embedText }));
  vi.doMock("@/src/ai/models", () => ({
    models: {
      text: "groq-health-model",
      embed: "google-health-model",
    },
  }));

  const route = await import("../app/api/health/route");

  return {
    ...route,
    mocks: {
      dbExecute,
      dbSelect,
      selectFrom,
      selectLeftJoin,
      selectWhere,
      selectLimit,
      blobList,
      generateObject,
      embedText,
    },
  };
}

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }

  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function setHealthyHealthEnv() {
  process.env.DATABASE_URL = "postgres://health-ready";
  process.env.BLOB_READ_WRITE_TOKEN = "blob-token-secret";
  process.env.GROQ_API_KEY = "groq-api-secret";
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = "google-api-secret";
  process.env.HEALTH_CHECK_SECRET = "health-secret-value";
  process.env.HEALTH_CHECK_SPACE_ID = "space-health-id";
}

afterEach(() => {
  restoreEnv();
  vi.restoreAllMocks();
  vi.resetModules();
  vi.doUnmock("@/src/db");
  vi.doUnmock("@vercel/blob");
  vi.doUnmock("ai");
  vi.doUnmock("@/src/ai/embed");
  vi.doUnmock("@/src/ai/models");
});

describe("GET /api/health", () => {
  it("returns a non-sensitive public shallow response without deep provider calls", async () => {
    setHealthyHealthEnv();

    const { GET, mocks } = await importRouteWithMocks({
      monitoredSpaceRows: [
        {
          lifecycleMode: "memorial",
          memorialLinkDisabled: false,
          memorialToken: "memorial-token-should-not-leak",
          recapStatus: "published",
        },
      ],
    });

    const response = await GET(new Request("http://localhost/api/health"));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      deep: false,
      privileged: false,
      checks: {
        db: { ok: true, configured: true, checked: true },
        blob: { ok: true, configured: true, checked: false },
        providers: {
          groq: { ok: true, configured: true, checked: false },
          google: { ok: true, configured: true, checked: false },
        },
      },
    });
    expect(body).not.toHaveProperty("demoSpace");
    expect(body.checks).not.toHaveProperty("monitoredSpace");

    expect(mocks.dbExecute).toHaveBeenCalledTimes(1);
    expect(mocks.dbSelect).not.toHaveBeenCalled();
    expect(mocks.blobList).not.toHaveBeenCalled();
    expect(mocks.generateObject).not.toHaveBeenCalled();
    expect(mocks.embedText).not.toHaveBeenCalled();

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain(process.env.BLOB_READ_WRITE_TOKEN!);
    expect(serialized).not.toContain(process.env.GROQ_API_KEY!);
    expect(serialized).not.toContain(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    expect(serialized).not.toContain(process.env.HEALTH_CHECK_SECRET!);
    expect(serialized).not.toContain("memorial-token-should-not-leak");
  });

  it("returns 503 when shallow readiness is unhealthy", async () => {
    setHealthyHealthEnv();
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    const { GET, mocks } = await importRouteWithMocks();
    const response = await GET(new Request("http://localhost/api/health"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      deep: false,
      checks: {
        providers: {
          google: {
            ok: false,
            configured: false,
            checked: false,
            error: "GOOGLE_GENERATIVE_AI_API_KEY is not set",
          },
        },
      },
    });

    expect(mocks.dbExecute).toHaveBeenCalledTimes(1);
    expect(mocks.blobList).not.toHaveBeenCalled();
    expect(mocks.generateObject).not.toHaveBeenCalled();
    expect(mocks.embedText).not.toHaveBeenCalled();
  });

  it.each([
    [undefined, 401, "HEALTH_CHECK_AUTH_REQUIRED"],
    ["Bearer wrong-secret", 403, "HEALTH_CHECK_FORBIDDEN"],
  ])(
    "rejects anonymous or invalid deep checks with %s and performs zero external calls",
    async (authorization, status, code) => {
      setHealthyHealthEnv();

      const { GET, mocks } = await importRouteWithMocks();
      const headers = authorization ? { authorization } : undefined;
      const response = await GET(new Request("http://localhost/api/health?deep=1", { headers }));

      expect(response.status).toBe(status);
      await expect(response.json()).resolves.toMatchObject({
        error: { code },
      });

      expect(mocks.dbExecute).not.toHaveBeenCalled();
      expect(mocks.dbSelect).not.toHaveBeenCalled();
      expect(mocks.blobList).not.toHaveBeenCalled();
      expect(mocks.generateObject).not.toHaveBeenCalled();
      expect(mocks.embedText).not.toHaveBeenCalled();
    },
  );

  it("permits authorized deep checks and loads monitored-space state by HEALTH_CHECK_SPACE_ID", async () => {
    setHealthyHealthEnv();

    const { GET, mocks } = await importRouteWithMocks({
      monitoredSpaceRows: [
        {
          lifecycleMode: "memorial",
          memorialLinkDisabled: false,
          memorialToken: "memorial-token-should-not-leak",
          recapStatus: "published",
        },
      ],
    });

    const response = await GET(
      new Request("http://localhost/api/health?deep=1", {
        headers: { authorization: "Bearer health-secret-value" },
      }),
    );

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      deep: true,
      privileged: true,
      checks: {
        db: { ok: true, configured: true, checked: true },
        blob: { ok: true, configured: true, checked: true },
        providers: {
          groq: { ok: true, configured: true, checked: true },
          google: { ok: true, configured: true, checked: true },
        },
        monitoredSpace: {
          check: { ok: true, configured: true, checked: true },
          state: {
            lifecycleMode: "memorial",
            memorialLinkEnabled: true,
            memorialTokenPresent: true,
            recapStatus: "published",
          },
        },
      },
    });

    expect(mocks.dbExecute).toHaveBeenCalledTimes(1);
    expect(mocks.dbSelect).toHaveBeenCalledTimes(1);
    expect(mocks.selectWhere).toHaveBeenCalledTimes(1);
    expect(mocks.selectLimit).toHaveBeenCalledTimes(1);
    expect(mocks.blobList).toHaveBeenCalledTimes(1);
    expect(mocks.generateObject).toHaveBeenCalledTimes(1);
    expect(mocks.embedText).toHaveBeenCalledTimes(1);

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain(process.env.BLOB_READ_WRITE_TOKEN!);
    expect(serialized).not.toContain(process.env.GROQ_API_KEY!);
    expect(serialized).not.toContain(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    expect(serialized).not.toContain(process.env.HEALTH_CHECK_SECRET!);
    expect(serialized).not.toContain("memorial-token-should-not-leak");
  });

  it("marks the route unhealthy when a protected Groq deep check fails", async () => {
    setHealthyHealthEnv();

    const { GET } = await importRouteWithMocks({
      generateObjectImpl: async () => {
        throw new Error("Groq quota exceeded");
      },
    });

    const response = await GET(
      new Request("http://localhost/api/health?deep=1", {
        headers: { authorization: "Bearer health-secret-value" },
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      deep: true,
      checks: {
        providers: {
          groq: {
            ok: false,
            configured: true,
            checked: true,
            error: "Groq deep check failed.",
          },
        },
      },
    });
  });

  it("marks the route unhealthy when a protected Google deep check fails", async () => {
    setHealthyHealthEnv();

    const { GET } = await importRouteWithMocks({
      embedTextImpl: async () => {
        throw new Error("Google quota exceeded");
      },
    });

    const response = await GET(
      new Request("http://localhost/api/health?deep=1", {
        headers: { authorization: "Bearer health-secret-value" },
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      deep: true,
      checks: {
        providers: {
          google: {
            ok: false,
            configured: true,
            checked: true,
            error: "Google deep check failed.",
          },
        },
      },
    });
  });

  it("marks the route unhealthy when the protected Blob deep check fails", async () => {
    setHealthyHealthEnv();

    const { GET } = await importRouteWithMocks({
      listImpl: async () => {
        throw new Error("Blob token revoked");
      },
    });

    const response = await GET(
      new Request("http://localhost/api/health?deep=1", {
        headers: { authorization: "Bearer health-secret-value" },
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      deep: true,
      checks: {
        blob: {
          ok: false,
          configured: true,
          checked: true,
          error: "Blob deep check failed.",
        },
      },
    });
  });
});
