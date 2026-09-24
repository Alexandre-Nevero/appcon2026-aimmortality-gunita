import { describe, expect, it } from "vitest";
import en from "../../../content/i18n/en.json";
import { t } from "../src/i18n/t";

describe("ask copy", () => {
  it("uses Hindi pa alam for abstain", () => {
    expect(t(en, "ask.abstained")).toBe("Hindi pa alam");
  });
});
