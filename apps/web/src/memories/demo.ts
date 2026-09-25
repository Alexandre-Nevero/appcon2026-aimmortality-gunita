import type { PhotoMemory } from "./queries";

import { fixtures } from "@/src/mocks/fixtures";

export const DEMO_TRIBUTES_COOKIE = "himmel_demo_tributes";

export function isDemoMemorialToken(token: string): boolean {
  return token === fixtures.memorialToken;
}

export function parseDemoTributes(value: string | undefined): Set<string> {
  const allowed = new Set(fixtures.photoMemories.map((memory) => memory.id));
  return new Set(
    value
      ?.split(",")
      .map((entry) => entry.trim())
      .filter((entry) => allowed.has(entry)) ?? [],
  );
}

export function serializeDemoTributes(ids: Iterable<string>): string {
  return Array.from(new Set(ids)).join(",");
}

export function listDemoPhotoMemories(
  token: string,
  heartedIds: Set<string> = new Set(),
): PhotoMemory[] | null {
  if (!isDemoMemorialToken(token)) return null;

  return fixtures.photoMemories.map((memory) => ({
    id: memory.id,
    photoUrl: memory.photoUrl,
    displayName: memory.displayName,
    relationship: memory.relationship,
    textContent: memory.textContent,
    hearted: heartedIds.has(memory.id),
  }));
}

export function toggleDemoTribute(
  token: string,
  contributionId: string,
  hearted: boolean,
  current: Set<string>,
): Set<string> | null {
  if (!isDemoMemorialToken(token) || !fixtures.photoMemories.some((memory) => memory.id === contributionId)) {
    return null;
  }

  const next = new Set(current);
  if (hearted) {
    next.add(contributionId);
  } else {
    next.delete(contributionId);
  }
  return next;
}
