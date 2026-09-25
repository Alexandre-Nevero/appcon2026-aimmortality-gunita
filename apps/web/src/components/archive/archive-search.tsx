"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BackHeader } from "@/src/components/ui/BackHeader";
import { useI18n } from "@/src/i18n/provider";
import { fixtures } from "@/src/mocks/fixtures";
import { readDemoSpace } from "@/src/mocks/demo-path";
import { PolaroidGrid, type ArchiveGridItem } from "./polaroid-grid";
import styles from "./archive-search.module.css";

function filterFixtureItems(query: string): ArchiveGridItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return fixtures.items.filter((item) => {
    const hay = `${item.title} ${item.body} ${item.caption}`.toLowerCase();
    return hay.includes(q);
  });
}

export function ArchiveSearch() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const space = useMemo(() => readDemoSpace(), []);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArchiveGridItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [usedFixtures, setUsedFixtures] = useState(false);

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) {
        setResults(null);
        setUsedFixtures(false);
        return;
      }
      setLoading(true);
      setUsedFixtures(false);
      try {
        const res = await fetch(
          `/api/spaces/${encodeURIComponent(space.id)}/search?q=${encodeURIComponent(trimmed)}`,
        );
        if (res.ok) {
          const data = (await res.json()) as { items?: ArchiveGridItem[] };
          if (Array.isArray(data.items)) {
            setResults(
              data.items.map((row) => ({
                id: row.id,
                title: row.title,
                caption: row.caption ?? row.title,
                photoUrl: row.photoUrl ?? "/objects/background.png",
                origin: row.origin,
              })),
            );
            setLoading(false);
            return;
          }
        }
      } catch {
        /* offline demo */
      }
      setResults(filterFixtureItems(trimmed));
      setUsedFixtures(true);
      setLoading(false);
    },
    [space.id],
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void runSearch(query);
  }

  return (
    <main className={styles.page}>
      <BackHeader
        title={t("archive.searchResultsTitle").toLowerCase()}
        backLabel={t("common.back").toLowerCase()}
        onBack={() => router.push("/archive")}
      />
      <form className={styles.form} onSubmit={onSubmit}>
        <input
          className={styles.input}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("archive.searchPlaceholder").toLowerCase()}
          aria-label={t("common.search")}
        />
        <button type="submit" className={styles.submit} disabled={loading}>
          {loading ? t("common.working").toLowerCase() : t("archive.searchCta").toLowerCase()}
        </button>
      </form>
      {loading ? (
        <p className={styles.status} role="status">
          {t("common.loading")}
        </p>
      ) : null}
      {usedFixtures && results !== null ? (
        <p className={styles.status} role="status">
          {t("app.offlineBanner")}
        </p>
      ) : null}
      {results !== null && results.length === 0 && !loading ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>{t("archive.searchEmptyTitle").toLowerCase()}</h2>
          <p className={styles.emptyBody}>{t("archive.searchEmptyBody")}</p>
        </div>
      ) : null}
      {results !== null && results.length > 0 ? (
        <>
          <p className={styles.resultsTitle}>{t("archive.searchResultsTitle").toLowerCase()}</p>
          <PolaroidGrid items={results} locale={locale} />
        </>
      ) : null}
    </main>
  );
}
