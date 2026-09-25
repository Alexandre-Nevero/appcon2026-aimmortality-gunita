import { describe, expect, it } from "vitest";

import { fixturePublicMemorial } from "../src/components/public-memorial/data";
import { fixtures } from "../src/mocks/fixtures";

describe("public memorial fixture", () => {
  it("serves demo token recap cards", () => {
    const memorial = fixturePublicMemorial(fixtures.memorialToken);
    expect(memorial).not.toBeNull();
    expect(memorial!.featuredName).toBe(fixtures.space.featuredName);
    expect(memorial!.cards.some((card) => card.type === "cover")).toBe(true);
    expect(memorial!.contributions).toHaveLength(fixtures.photoMemories.length);
  });

  it("ignores unknown tokens", () => {
    expect(fixturePublicMemorial("not_a_real_token")).toBeNull();
  });
});
