"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Origin, ReviewState } from "@gunita/core";
import { useI18n } from "@/src/i18n/provider";
import { ARCHIVE_FILTERS, applyArchiveFilters, type ArchiveFilterId } from "./archive-filters";
import styles from "./archive-toolbar.module.css";

type Filterable = { origin: Origin; reviewState?: ReviewState };
export type FilterId = ArchiveFilterId;

export function useArchiveFilters<T extends Filterable>(items: T[]) {
  const [active, setActive] = useState<Set<FilterId>>(() => new Set());
  const filtered = useMemo(
    () => applyArchiveFilters(items, active),
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
  searchHref,
  active,
  onToggle,
  showFilters,
}: {
  searchHref: string;
  active: Set<FilterId>;
  onToggle: (id: FilterId) => void;
  showFilters: boolean;
}) {
  const { t, locale } = useI18n();

  return (
    <>
      <Link href={searchHref} className={styles.searchLink}>
        <svg className={styles.searchIcon} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M15.5 15.5 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span>{t("archive.searchPlaceholder").toLowerCase()}</span>
      </Link>
      {showFilters ? (
        <div className={styles.filters} role="group" aria-label={t("archive.filtersLabel")}>
          {ARCHIVE_FILTERS.map((f) => (
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
