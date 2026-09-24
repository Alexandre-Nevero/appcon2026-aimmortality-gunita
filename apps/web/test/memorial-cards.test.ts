import { describe, expect, it } from "vitest";

import { buildDraftSnapshot, type MemorialDraftItem } from "../src/memorial/cards";

function photoItem(): MemorialDraftItem {
  return {
    id: "0f46a4c0-54d1-42b0-9c55-b225728f2f71",
    title: "Sa hardin",
    body: "Nakaupo siya sa hardin noong piyesta.",
    type: "story",
    origin: "from_them",
    reviewState: "verified",
    source: {
      id: "8d416204-7040-456c-a6a8-f17330a34c92",
      type: "photo",
      blobUrl: "https://blob.example/cover.jpg",
      durationSeconds: null,
    },
    segments: [],
    recipeSteps: [],
  };
}

describe("buildDraftSnapshot", () => {
  it("stores real-media references and marks AI-written captions on drafted cards (TC-043)", async () => {
    const cards = await buildDraftSnapshot({
      featuredName: "Lola Nena",
      locale: "fil",
      voiceClipsAllowed: true,
      items: [photoItem()],
      buildCaption: async ({ cardType }) => `Caption for ${cardType}`,
    });

    expect(cards[0]).toMatchObject({
      type: "cover",
      itemId: "0f46a4c0-54d1-42b0-9c55-b225728f2f71",
      sourceId: "8d416204-7040-456c-a6a8-f17330a34c92",
      blobUrl: "https://blob.example/cover.jpg",
      caption: "Caption for cover",
      aiWritten: true,
    });
    expect(cards.at(-1)).toMatchObject({
      type: "closing",
      title: "Magbahagi ng alaala",
      aiWritten: false,
    });
  });

  it("drops voice playback when consent declined, so draft/publish never contain a voice card (TC-044)", async () => {
    const audioItem: MemorialDraftItem = {
      id: "eb4faf4f-3708-4eb7-a704-98fdccae8905",
      title: "Ang bilin niya",
      body: "Magdasal daw muna bago magsimula.",
      type: "story",
      origin: "from_them",
      reviewState: "verified",
      source: {
        id: "1a5e61e6-eeb9-4159-94f8-b49d56679c75",
        type: "audio",
        blobUrl: "https://blob.example/voice.webm",
        durationSeconds: 10,
      },
      segments: [
        {
          id: "seg-1",
          text: "Magdasal muna bago magsimula.",
          startSeconds: 1,
          endSeconds: 3,
        },
      ],
      recipeSteps: [],
    };

    const cards = await buildDraftSnapshot({
      featuredName: "Lola Nena",
      locale: "en",
      voiceClipsAllowed: false,
      items: [audioItem],
      buildCaption: async () => "Reviewed text only",
    });

    const drafted = cards.find((card) => card.itemId === audioItem.id)!;
    expect(drafted.type).toBe("life_moment");
    expect(drafted.audioUrl).toBeNull();
    expect(drafted.clip).toBeNull();
  });

  it("keeps a recipe's real clip metadata when voice consent allows it", async () => {
    const recipeItem: MemorialDraftItem = {
      id: "dbfa73d3-4dbd-46c5-9ea4-07fe49dca2c8",
      title: "Adobo",
      body: "Pakuluin hanggang lumabas ang mantika.",
      type: "recipe",
      origin: "from_them",
      reviewState: "verified",
      source: {
        id: "31f0d87d-f334-4f50-bef4-f0778392c0bf",
        type: "audio",
        blobUrl: "https://blob.example/adobo.webm",
        durationSeconds: 60,
      },
      segments: [
        { id: "seg-a", text: "Pakuluin", startSeconds: 8, endSeconds: 9 },
        { id: "seg-b", text: "hanggang lumabas ang mantika", startSeconds: 9, endSeconds: 12 },
      ],
      recipeSteps: [{ kind: "judgement", text: "Hintayin ang mantika.", segmentIds: ["seg-a", "seg-b"] }],
    };

    const cards = await buildDraftSnapshot({
      featuredName: "Lola Nena",
      locale: "en",
      voiceClipsAllowed: true,
      items: [recipeItem],
      buildCaption: async () => "AI recipe caption",
    });

    const recipeCard = cards.find((card) => card.itemId === recipeItem.id)!;
    expect(recipeCard.type).toBe("recipe");
    expect(recipeCard.audioUrl).toBe("https://blob.example/adobo.webm");
    expect(recipeCard.clip).toEqual({ startSeconds: 7.7, endSeconds: 12.3 });
    expect(recipeCard.transcriptExcerpt).toBe("Hintayin ang mantika.");
  });
});
