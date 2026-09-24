import { describe, expect, it } from "vitest";
import en from "../../../content/i18n/en.json";
import { t } from "../src/i18n/t";

describe("t", () => {
  it("resolves dotted paths", () => {
    expect(t(en, "common.back")).toBe("Back");
  });

  it("interpolates {name}", () => {
    expect(t(en, "home.greetingNamed", { name: "Ana" })).toBe("Hello, Ana");
  });

  it("keeps Hindi pa alam on abstain", () => {
    expect(t(en, "ask.abstained")).toBe("Hindi pa alam");
  });
});
