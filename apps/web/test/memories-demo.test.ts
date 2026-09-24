import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { POST } from "../app/api/m/[token]/tributes/route";
import { DEMO_TRIBUTES_COOKIE, listDemoPhotoMemories, parseDemoTributes } from "../src/memories/demo";
import { fixtures } from "../src/mocks/fixtures";

describe("demo photo memories fixture", () => {
  it("serves approved visitor photos for the demo memorial token", () => {
    const memories = listDemoPhotoMemories(fixtures.memorialToken);
    expect(memories).not.toBeNull();
    expect(memories).toHaveLength(fixtures.photoMemories.length);
    expect(memories?.every((memory) => memory.hearted === false)).toBe(true);
  });

  it("persists demo tribute state in a cookie without a database", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/m/demo_memorial_token/tributes", {
        method: "POST",
        body: JSON.stringify({ contributionId: fixtures.photoMemories[0].id, hearted: true }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ token: fixtures.memorialToken }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ hearted: true });

    const cookie = response.cookies.get(DEMO_TRIBUTES_COOKIE);
    expect(cookie?.value).toBe(fixtures.photoMemories[0].id);

    const heartedIds = parseDemoTributes(cookie?.value);
    const memories = listDemoPhotoMemories(fixtures.memorialToken, heartedIds);
    expect(memories?.find((memory) => memory.id === fixtures.photoMemories[0].id)?.hearted).toBe(true);
  });
});
