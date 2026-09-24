"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackHeader } from "@/src/components/ui/BackHeader";
import { useI18n } from "@/src/i18n/provider";
import { fixtures } from "@/src/mocks/fixtures";
import { ARCHIVE_FILTERS, applyArchiveFilters, type ArchiveFilterId } from "./archive-filters";
import { PolaroidGrid } from "./polaroid-grid";
import styles from "./archive-screen.module.css";

export function ArchiveScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [active, setActive] = useState<Set<ArchiveFilterId>>(() => new Set());
  const items = useMemo(() => applyArchiveFilters(fixtures.items, active), [active]);

  const toggle = (id: ArchiveFilterId) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <main className={styles.page}>
      <BackHeader
        title={t("archive.title").toLowerCase()}
        subtitle={t("archive.subtitle")}
        backLabel={t("common.back").toLowerCase()}
        onBack={() => router.push("/home")}
      />
      <Link href="/archive/search" className={styles.searchLink}>
        <svg className={styles.searchIcon} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M15.5 15.5 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span>{t("archive.searchPlaceholder").toLowerCase()}</span>
      </Link>
      {fixtures.items.length > 0 ? (
        <div className={styles.filters} role="group" aria-label={t("archive.filtersLabel")}>
          {ARCHIVE_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={styles.filter}
              aria-pressed={active.has(f.id)}
              onClick={() => toggle(f.id)}
            >
              {f.label[locale].toLowerCase()}
            </button>
          ))}
        </div>
      ) : null}
      {fixtures.items.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>{t("archive.emptyTitle").toLowerCase()}</h2>
          <p className={styles.emptyBody}>{t("archive.emptyBody")}</p>
        </div>
      ) : items.length === 0 ? (
        <div className={styles.empty} role="status">
          <h2 className={styles.emptyTitle}>{t("archive.searchEmptyTitle").toLowerCase()}</h2>
        </div>
      ) : (
        <PolaroidGrid items={items} locale={locale} />
      )}
    </main>
  );
}
