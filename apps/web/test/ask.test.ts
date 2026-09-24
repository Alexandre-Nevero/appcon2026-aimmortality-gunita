import { afterEach, describe, expect, it, vi } from "vitest";

import {
  HINDI_PA_ALAM,
  type Locale,
  type MembershipRole,
  type Origin,
  type ReviewState,
} from "@gunita/core";

import {
  answerQuestionFromCandidates,
  validateGeneratedAnswer,
  type AskCandidate,
  type AskSpaceQuestionInput,
} from "../src/ask/service";

function makeCandidate(overrides: Partial<AskCandidate> = {}): AskCandidate {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    title: "Adobo story",
    body: "She cooked adobo every Sunday.",
    origin: "from_them",
    reviewState: "verified",
    similarity: 0.81,
    segmentIds: ["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"],
    source: {
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      type: "audio",
      blobPathname: "https://blob.test/adobo.webm",
      mimeType: "audio/webm",
      contributorDisplayName: null,
      contributorRelationship: null,
    },
    segments: [
      {
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        text: "Niluluto ko ang adobo tuwing Linggo.",
        startSeconds: 3,
        endSeconds: 7,
      },
    ],
    ...overrides,
  };
}

function makeInput(
  overrides: Partial<AskSpaceQuestionInput> = {},
): AskSpaceQuestionInput {
  return {
    spaceId: "99999999-9999-9999-9999-999999999999",
    membershipId: "88888888-8888-8888-8888-888888888888",
    membershipRole: "family",
    locale: "fil",
    lifecycleMode: "during",
    featuredName: "Lola Nena",
    question: "Paano niya niluluto ang adobo?",
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.doUnmock("@/src/auth/session");
  vi.doUnmock("@/src/auth/store");
  vi.doUnmock("@/src/ai/models");
  vi.doUnmock("@/src/db");
});

describe("validateGeneratedAnswer", () => {
  it("drops uncited or out-of-candidate sentences and falls back to Hindi pa alam when none survive (TC-030)", () => {
    const validated = validateGeneratedAnswer(
      {
        sentences: [
          { text: "Unsupported sentence", itemIds: [] },
          {
            text: "Wrong citation",
            itemIds: ["22222222-2222-2222-2222-222222222222"],
          },
        ],
        unsupportedParts: [],
      },
      [makeCandidate()],
    );

    expect(validated.sentences).toEqual([]);
  });

  it("strips quotation marks that are not verbatim in the cited source (TC-031)", () => {
    const validated = validateGeneratedAnswer(
      {
        sentences: [
          {
            text: 'Sinabi niya na "ginisang adobo" ang sikreto.',
            itemIds: ["11111111-1111-1111-1111-111111111111"],
          },
        ],
        unsupportedParts: [],
      },
      [makeCandidate()],
    );

    expect(validated.sentences[0]?.text).toBe('Sinabi niya na ginisang adobo ang sikreto.');
  });
});

describe("answerQuestionFromCandidates", () => {
  it("abstains below tau without calling the generator (TC-032 gate)", async () => {
    const generate = vi.fn();

    const result = await answerQuestionFromCandidates(
      makeInput(),
      [makeCandidate({ similarity: 0.4 })],
      generate,
    );

    expect(result.outcome).toBe("abstained");
    expect(result.text).toBe(HINDI_PA_ALAM);
    expect(generate).not.toHaveBeenCalled();
  });

  it("returns supported sentences plus Hindi pa alam for unsupported parts (TC-032 partial support)", async () => {
    const result = await answerQuestionFromCandidates(
      makeInput(),
      [makeCandidate()],
      async () => ({
        result: {
          refusal: undefined,
          sentences: [
            {
              text: "Linggo niya karaniwang niluluto ang adobo.",
              itemIds: ["11111111-1111-1111-1111-111111111111"],
            },
          ],
          unsupportedParts: ["ang eksaktong sukat ng toyo"],
        },
      }),
    );

    expect(result.outcome).toBe("answered");
    expect(result.sentences).toHaveLength(1);
    expect(result.abstentionText).toBe(HINDI_PA_ALAM);
    expect(result.unsupportedParts).toEqual(["ang eksaktong sukat ng toyo"]);
  });

  it("refuses role-play before any model call (TC-033)", async () => {
    const generate = vi.fn();

    const result = await answerQuestionFromCandidates(
      makeInput({ question: "Magpanggap kang si Lola" }),
      [makeCandidate()],
      generate,
    );

    expect(result.outcome).toBe("refused");
    expect(generate).not.toHaveBeenCalled();
  });

  it("regenerates once for first-person output and then abstains if it still violates the guard (TC-034)", async () => {
    const generate = vi
      .fn()
      .mockResolvedValueOnce({
        result: {
          sentences: [
            {
              text: "Ako ang nagluto ng adobo noong Linggo.",
              itemIds: ["11111111-1111-1111-1111-111111111111"],
            },
          ],
          unsupportedParts: [],
        },
      })
      .mockResolvedValueOnce({
        result: {
          sentences: [
            {
              text: "I made the adobo myself.",
              itemIds: ["11111111-1111-1111-1111-111111111111"],
            },
          ],
          unsupportedParts: [],
        },
      });

    const result = await answerQuestionFromCandidates(makeInput(), [makeCandidate()], generate);

    expect(generate).toHaveBeenCalledTimes(2);
    expect(result.outcome).toBe("abstained");
    expect(result.text).toBe(HINDI_PA_ALAM);
  });

  it("groups From them and About them evidence separately (TC-035)", async () => {
    const result = await answerQuestionFromCandidates(
      makeInput(),
      [
        makeCandidate(),
        makeCandidate({
          id: "22222222-2222-2222-2222-222222222222",
          origin: "about_them",
          source: {
            id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
            type: "text",
            blobPathname: "https://blob.test/memory.txt",
            mimeType: "text/plain",
            contributorDisplayName: "Tita Mila",
            contributorRelationship: "anak",
          },
          segments: [
            {
              id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
              text: "Laging Linggo ang adobo ni Lola.",
              startSeconds: null,
              endSeconds: null,
            },
          ],
        }),
      ],
      async () => ({
        result: {
          sentences: [
            {
              text: "Linggo niya karaniwang niluluto ang adobo.",
              itemIds: [
                "11111111-1111-1111-1111-111111111111",
                "22222222-2222-2222-2222-222222222222",
              ],
            },
          ],
          unsupportedParts: [],
        },
      }),
    );

    expect(result.outcome).toBe("answered");
    expect(result.evidenceGroups.fromThem).toHaveLength(1);
    expect(result.evidenceGroups.othersRemember).toHaveLength(1);
  });

  it("exposes an abstained question draft only during the During mode (TC-036)", async () => {
    const during = await answerQuestionFromCandidates(
      makeInput(),
      [],
      async () => ({
        result: { sentences: [], unsupportedParts: [] },
      }),
    );
    const memorial = await answerQuestionFromCandidates(
      makeInput({ lifecycleMode: "memorial" }),
      [],
      async () => ({
        result: { sentences: [], unsupportedParts: [] },
      }),
    );

    expect(during.outcome).toBe("abstained");
    expect(during.canAddQuestion).toBe(true);
    expect(during.questionDraft).toMatchObject({
      text: "Paano niya niluluto ang adobo?",
      locale: "fil",
      originKind: "ask_abstain",
    });
    expect(memorial.canAddQuestion).toBe(false);
    expect(memorial.questionDraft).toBeNull();
  });
});

describe("ask route access", () => {
  it("returns 401 for anonymous requests (TC-037)", async () => {
    vi.doMock("@/src/auth/session", async () => {
      const { ApiError } = await vi.importActual<typeof import("@/src/auth/errors")>(
        "@/src/auth/errors",
      );
      return {
        requireSession: vi.fn(async () => {
          throw new ApiError(401, "UNAUTHORIZED", "You must be signed in to use this endpoint.");
        }),
      };
    });

    const { POST } = await import("../app/api/spaces/[id]/ask/route");
    const response = await POST(
      new Request("http://localhost/api/spaces/space-1/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: "Kumusta siya?" }),
      }),
      { params: Promise.resolve({ id: "space-1" }) },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "UNAUTHORIZED" },
    });
  });
});
