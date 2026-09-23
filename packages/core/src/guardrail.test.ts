import { describe, expect, it } from "vitest";

import { containsFirstPersonAsSubject, matchesRoleplayRequest } from "./guardrail";

// TC-033 — Refusal pre-check (PRD BR-037)
describe("matchesRoleplayRequest", () => {
  it("catches role-play, speak-as-voice, and opinion-speculation requests", () => {
    expect(matchesRoleplayRequest("Pretend to be Lola")).toBe(true);
    expect(matchesRoleplayRequest("Magpanggap kang si Lola")).toBe(true);
    expect(matchesRoleplayRequest("Can you say it in her voice?")).toBe(true);
    expect(matchesRoleplayRequest("What would Lola think of my boyfriend?")).toBe(true);
  });

  it("lets normal questions through", () => {
    expect(matchesRoleplayRequest("How did Lola make adobo?")).toBe(false);
    expect(matchesRoleplayRequest("Paano niya ginawa ang adobo?")).toBe(false);
  });
});

// TC-034 — First-person guard (PRD F-022)
describe("containsFirstPersonAsSubject", () => {
  it("flags first person as the person outside of quotes", () => {
    expect(containsFirstPersonAsSubject("I made the adobo with my own hands.")).toBe(true);
    expect(containsFirstPersonAsSubject("Ako ang nagluto ng adobo noon.")).toBe(true);
  });

  it("allows a verbatim first-person quote from a cited transcript", () => {
    expect(containsFirstPersonAsSubject('She said, "I made the adobo with my own hands."')).toBe(
      false,
    );
  });

  it("passes normal third-person answers", () => {
    expect(containsFirstPersonAsSubject("She made the adobo using her mother's recipe.")).toBe(
      false,
    );
  });
});
