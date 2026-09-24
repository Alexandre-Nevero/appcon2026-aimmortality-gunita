"use client";

import { useRouter } from "next/navigation";
import { ArchiveToolbar, useArchiveFilters } from "@/src/components/archive/archive-toolbar";
import { BackHeader } from "@/src/components/ui/BackHeader";
import { Button } from "@/src/components/ui/Button";
import { useI18n } from "@/src/i18n/provider";
import { fixtures } from "@/src/mocks/fixtures";
import { StickyNoteGrid } from "./sticky-note-grid";
import styles from "./postcards-screen.module.css";

// Photos live on the archive's polaroid grid; postcards show the written memories.
const TEXT_ITEMS = fixtures.items.filter((item) => item.kind === "text");

export function PostcardsScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { active, toggle, filtered: items } = useArchiveFilters(TEXT_ITEMS);

  return (
    <main className={styles.page}>
      <BackHeader
        title={t("postcards.title").toLowerCase()}
        subtitle={t("postcards.subtitle")}
        backLabel={t("common.back").toLowerCase()}
        onBack={() => router.push("/home")}
      />
      <ArchiveToolbar searchHref="/postcards/search" active={active} onToggle={toggle} showFilters={TEXT_ITEMS.length > 0} />
      {TEXT_ITEMS.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>{t("postcards.emptyTitle").toLowerCase()}</h2>
          <p className={styles.emptyBody}>{t("postcards.emptyBody")}</p>
        </div>
      ) : items.length === 0 ? (
        <div className={styles.empty} role="status">
          <h2 className={styles.emptyTitle}>{t("archive.searchEmptyTitle").toLowerCase()}</h2>
        </div>
      ) : (
        <StickyNoteGrid items={items} locale={locale} />
      )}
      <div className={styles.footer}>
        <Button onClick={() => router.push("/capture/memory")}>
          {t("postcards.add").toLowerCase()}
        </Button>
      </div>
    </main>
  );
}
