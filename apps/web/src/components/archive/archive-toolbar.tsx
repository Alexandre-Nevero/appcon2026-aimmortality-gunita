"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ORIGIN_LABELS, REVIEW_STATE_LABELS, type Origin, type ReviewState } from "@gunita/core";
import { useI18n } from "@/src/i18n/provider";
import styles from "./archive-toolbar.module.css";

type Filterable = { origin: Origin; reviewState?: ReviewState };

// Chips under the search bar are filters (DESIGN.md "Chip tag"); labels reuse the F-015 badge copy.
const FILTERS = [
  { id: "from_them", label: ORIGIN_LABELS.from_them, match: (i: Filterable) => i.origin === "from_them" },
  { id: "about_them", label: ORIGIN_LABELS.about_them, match: (i: Filterable) => i.origin === "about_them" },
  { id: "verified", label: REVIEW_STATE_LABELS.verified, match: (i: Filterable) => i.reviewState === "verified" },
] as const;

export type FilterId = (typeof FILTERS)[number]["id"];

export function useArchiveFilters<T extends Filterable>(items: T[]) {
  const [active, setActive] = useState<Set<FilterId>>(() => new Set());
  const filtered = useMemo(
    () => items.filter((item) => FILTERS.every((f) => !active.has(f.id) || f.match(item))),
    [items, active],
  );
  const toggle = (id: FilterId) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return { active, toggle, filtered };
}

export function ArchiveToolbar({
  active,
  onToggle,
  showFilters,
}: {
  active: Set<FilterId>;
  onToggle: (id: FilterId) => void;
  showFilters: boolean;
}) {
  const { t, locale } = useI18n();

  return (
    <>
      <Link href="/archive/search" className={styles.searchLink}>
        <svg className={styles.searchIcon} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M15.5 15.5 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span>{t("archive.searchPlaceholder").toLowerCase()}</span>
      </Link>
      {showFilters ? (
        <div className={styles.filters} role="group" aria-label={t("archive.filtersLabel")}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={styles.filter}
              aria-pressed={active.has(f.id)}
              onClick={() => onToggle(f.id)}
            >
              {f.label[locale].toLowerCase()}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
