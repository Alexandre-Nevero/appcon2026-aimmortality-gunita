import type { Locale } from "@gunita/core";

import { db } from "@/src/db";
import { getPublicMemorialSnapshot } from "@/src/memorial/service";
import type { MemorialCard } from "@/src/memorial/schema";
import { fixtureDraftCards } from "@/src/components/memorial/state";
import { fixtures } from "@/src/mocks/fixtures";

export type PublicContributionView = {
  id: string;
  displayName: string;
  relationship: string;
  textContent: string | null;
  photoBlobPathname: string | null;
  audioBlobPathname: string | null;
  origin: "about_them";
  status: string;
  submittedAt: Date;
};

export type PublicMemorialView = {
  spaceId: string;
  locale: Locale;
  featuredName: string | null;
  cards: MemorialCard[];
  contributions: PublicContributionView[];
};

export function fixturePublicMemorial(token: string): PublicMemorialView | null {
  if (token !== fixtures.memorialToken) return null;
  const cards = fixtureDraftCards(fixtures.items.map((item) => item.id)).map((card) => {
    if (!card.itemId || card.blobUrl) return card;
    const item = fixtures.items.find((entry) => entry.id === card.itemId);
    if (!item?.photoUrl) return card;
    return { ...card, blobUrl: item.photoUrl };
  });
  return {
    spaceId: fixtures.space.id,
    locale: fixtures.space.locale,
    featuredName: fixtures.space.featuredName,
    cards,
    contributions: fixtures.photoMemories.map((memory) => ({
      id: memory.id,
      displayName: memory.displayName,
      relationship: memory.relationship,
      textContent: memory.textContent,
      photoBlobPathname: memory.photoUrl,
      audioBlobPathname: null,
      origin: "about_them" as const,
      status: "approved",
      submittedAt: new Date(memory.submittedAt),
    })),
  };
}

export async function loadPublicMemorial(token: string): Promise<PublicMemorialView | null> {
  try {
    const live = await getPublicMemorialSnapshot(db, token);
    if (live) return live;
  } catch {
    // DATABASE_URL missing or unpublished — fall through to demo fixture.
  }
  return fixturePublicMemorial(token);
}
