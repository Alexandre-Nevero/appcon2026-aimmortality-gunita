import { describe, expect, it } from "vitest";
import { fixtures } from "../src/mocks/fixtures";

describe("home stickers", () => {
  it("includes ask himmel route", () => {
    expect(fixtures.homeStickers.some((s) => s.href === "/ask")).toBe(true);
  });
  it("marks memorial steward-only", () => {
    expect(fixtures.homeStickers.find((s) => s.id === "memorial")?.stewardOnly).toBe(true);
  });
});
