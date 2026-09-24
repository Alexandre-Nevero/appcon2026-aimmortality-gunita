import { ORIGIN_LABELS, REVIEW_STATE_LABELS, type Origin, type ReviewState } from "@gunita/core";

type Filterable = { origin: Origin; reviewState?: ReviewState };

// Chips under the search bar are filters (DESIGN.md "Chip tag"); labels reuse the F-015 badge copy.
// Chips in the same group are OR'd (an item has one origin, so AND would always be empty);
// different groups are AND'd.
export const ARCHIVE_FILTERS = [
  { id: "from_them", group: "origin", label: ORIGIN_LABELS.from_them, match: (i: Filterable) => i.origin === "from_them" },
  { id: "about_them", group: "origin", label: ORIGIN_LABELS.about_them, match: (i: Filterable) => i.origin === "about_them" },
  { id: "verified", group: "review", label: REVIEW_STATE_LABELS.verified, match: (i: Filterable) => i.reviewState === "verified" },
] as const;

export type ArchiveFilterId = (typeof ARCHIVE_FILTERS)[number]["id"];

export function applyArchiveFilters<T extends Filterable>(
  items: T[],
  active: ReadonlySet<ArchiveFilterId>,
): T[] {
  const groups = new Map<string, ((item: Filterable) => boolean)[]>();
  for (const f of ARCHIVE_FILTERS) {
    if (!active.has(f.id)) continue;
    groups.set(f.group, [...(groups.get(f.group) ?? []), f.match]);
  }
  return items.filter((item) =>
    [...groups.values()].every((matchers) => matchers.some((match) => match(item))),
  );
}
