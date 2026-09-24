"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BackHeader } from "@/src/components/ui/BackHeader";
import { useI18n } from "@/src/i18n/provider";
import { fixtures } from "@/src/mocks/fixtures";
import { readDemoSpace } from "@/src/mocks/demo-path";
import { StickyNoteGrid } from "@/src/components/postcards/sticky-note-grid";
import { PolaroidGrid, type ArchiveGridItem } from "./polaroid-grid";
import styles from "./archive-search.module.css";

// "photo" searches the archive's polaroids; "text" searches the written memories on /postcards.
export type SearchKind = "photo" | "text";

type SearchResult = ArchiveGridItem & { body: string };

function filterFixtureItems(query: string, kind: SearchKind): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return fixtures.items.filter((item) => {
    if (item.kind !== kind) return false;
    const hay = `${item.title} ${item.body} ${item.caption}`.toLowerCase();
    return hay.includes(q);
  });
}

export function ArchiveSearch({ kind = "photo" }: { kind?: SearchKind }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const space = useMemo(() => readDemoSpace(), []);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
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
          const data = (await res.json()) as {
            items?: (Omit<ArchiveGridItem, "photoUrl"> & { photoUrl?: string; body?: string })[];
          };
          if (Array.isArray(data.items)) {
            setResults(
              // API rows carry no photo/written kind yet, so both screens show every match.
              data.items.map((row) => ({
                id: row.id,
                title: row.title,
                caption: row.caption ?? row.title,
                photoUrl: row.photoUrl ?? "",
                origin: row.origin,
                reviewState: row.reviewState,
                body: row.body ?? "",
              })),
            );
            setLoading(false);
            return;
          }
        }
      } catch {
        /* offline demo */
      }
      setResults(filterFixtureItems(trimmed, kind));
      setUsedFixtures(true);
      setLoading(false);
    },
    [space.id, kind],
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
        onBack={() => router.push(kind === "text" ? "/postcards" : "/archive")}
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
          {kind === "text" ? (
            <StickyNoteGrid items={results} locale={locale} />
          ) : (
            <PolaroidGrid items={results} locale={locale} />
          )}
        </>
      ) : null}
    </main>
  );
}
