"use client";

import { useRouter } from "next/navigation";
import { BackHeader } from "@/src/components/ui/BackHeader";
import { useI18n } from "@/src/i18n/provider";
import { fixtures } from "@/src/mocks/fixtures";
import { ArchiveToolbar, useArchiveFilters } from "./archive-toolbar";
import { PolaroidGrid } from "./polaroid-grid";
import styles from "./archive-screen.module.css";

// Written memories (kind "text") live on the postcards screen.
const PHOTO_ITEMS = fixtures.items.filter((item) => item.kind === "photo");

export function ArchiveScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { active, toggle, filtered: items } = useArchiveFilters(PHOTO_ITEMS);

  return (
    <main className={styles.page}>
      <BackHeader
        title={t("archive.title").toLowerCase()}
        subtitle={t("archive.subtitle")}
        backLabel={t("common.back").toLowerCase()}
        onBack={() => router.push("/home")}
      />
      <ArchiveToolbar active={active} onToggle={toggle} showFilters={PHOTO_ITEMS.length > 0} />
      {PHOTO_ITEMS.length === 0 ? (
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
