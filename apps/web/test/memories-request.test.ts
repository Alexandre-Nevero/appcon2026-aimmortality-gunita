import { describe, expect, it } from "vitest";

import { tributeRequestSchema } from "../src/memories/tribute-request";

const id = "3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f";

describe("tributeRequestSchema", () => {
  it("accepts a contribution uuid and the desired heart state", () => {
    expect(tributeRequestSchema.safeParse({ contributionId: id, hearted: true }).success).toBe(true);
    expect(tributeRequestSchema.safeParse({ contributionId: id, hearted: false }).success).toBe(true);
  });

  it("rejects a non-uuid id so bad input never reaches Postgres", () => {
    expect(tributeRequestSchema.safeParse({ contributionId: "123", hearted: true }).success).toBe(false);
  });

  it("requires an explicit heart state", () => {
    expect(tributeRequestSchema.safeParse({ contributionId: id }).success).toBe(false);
  });
});
