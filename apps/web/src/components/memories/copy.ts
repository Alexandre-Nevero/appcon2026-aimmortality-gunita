import { ORIGIN_LABELS, type Locale, type LocalizedLabel } from "@gunita/core";

// BR-014: every S-033 string in fil and en. Move into content/i18n once TASK-004 lands.
export const MEMORIES_COPY = {
  title: { fil: "Mga alaala sa larawan", en: "Photo memories" },
  entry: { fil: "Tingnan ang mga larawan", en: "See photo memories" },
  back: { fil: "Bumalik", en: "Back" },
  empty: { fil: "Wala pang larawang naibahagi.", en: "No photos shared yet." },
  shareCta: { fil: "Magbahagi ng alaala", en: "Share a memory" },
  heart: { fil: "Alalahanin", en: "Remember" },
  sendFailed: { fil: "Hindi naipadala. Subukan ulit.", en: "Couldn't send. Try again." },
  aboutThem: ORIGIN_LABELS.about_them,
} satisfies Record<string, LocalizedLabel>;

export function t(key: keyof typeof MEMORIES_COPY, locale: Locale): string {
  return MEMORIES_COPY[key][locale];
}

export function sharedBy(name: string, relationship: string, locale: Locale): string {
  return locale === "fil" ? `Ibinahagi ni ${name} · ${relationship}` : `Shared by ${name} · ${relationship}`;
}

export function photoAlt(name: string, locale: Locale): string {
  return locale === "fil" ? `Larawang ibinahagi ni ${name}` : `Photo shared by ${name}`;
}

export function position(index: number, total: number): string {
  return `${index + 1} / ${total}`;
}
