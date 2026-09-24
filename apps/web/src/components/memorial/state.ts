import type { MemorialCard } from "@/src/memorial/schema";
import { fixtures } from "@/src/mocks/fixtures";

const ACTIVE_KEY = "himmel.demo.memorialActive";
const DRAFT_KEY = "himmel.demo.memorialDraft";
const PUBLISHED_KEY = "himmel.demo.memorialPublished";

export function readMemorialActive(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(ACTIVE_KEY) === "1";
}

export function markMemorialActive() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ACTIVE_KEY, "1");
}

export function clearMemorialActive() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(ACTIVE_KEY);
}

export function saveMemorialDraft(cards: MemorialCard[]) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(cards));
}

export function readMemorialDraft(): MemorialCard[] | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MemorialCard[];
  } catch {
    return null;
  }
}

export function markMemorialPublished() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PUBLISHED_KEY, "1");
}

export function readMemorialPublished(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(PUBLISHED_KEY) === "1";
}

export function fixtureDraftCards(itemIds: string[]): MemorialCard[] {
  const picked = fixtures.items.filter((i) => itemIds.includes(i.id));
  const cover: MemorialCard = {
    type: "cover",
    order: 0,
    title: fixtures.space.featuredName,
    body: null,
    caption: null,
    aiWritten: false,
  };
  const moments: MemorialCard[] = picked.map((item, index) => ({
    type: "life_moment",
    order: index + 1,
    itemId: item.id,
    title: item.title,
    body: item.body,
    caption: item.caption,
    blobUrl: item.photoUrl.startsWith("http") ? item.photoUrl : null,
    aiWritten: false,
  }));
  return [cover, ...moments];
}

export function fixtureMemorialUrl(): string {
  if (typeof window === "undefined") {
    return `https://gunita.app/m/${fixtures.memorialToken}`;
  }
  return `${window.location.origin}/m/${fixtures.memorialToken}`;
}

export const PLACEHOLDER_QR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="QR placeholder"><rect width="120" height="120" fill="#f5f0e8"/><rect x="12" y="12" width="32" height="32" fill="#1a1a1a"/><rect x="76" y="12" width="32" height="32" fill="#1a1a1a"/><rect x="12" y="76" width="32" height="32" fill="#1a1a1a"/><rect x="52" y="52" width="16" height="16" fill="#1a1a1a"/></svg>`;
