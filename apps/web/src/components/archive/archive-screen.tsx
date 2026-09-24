"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackHeader } from "@/src/components/ui/BackHeader";
import { FlowerMark } from "@/src/components/ui/FlowerMark";
import { useI18n } from "@/src/i18n/provider";
import { fixtures } from "@/src/mocks/fixtures";
import { PolaroidGrid } from "./polaroid-grid";
import styles from "./archive-screen.module.css";

export function ArchiveScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const items = fixtures.items;

  return (
    <main className={styles.page}>
      <BackHeader
        title={t("archive.title").toLowerCase()}
        backLabel={t("common.back").toLowerCase()}
        onBack={() => router.push("/home")}
      />
      <Link href="/archive/search" className={styles.searchLink}>
        {t("archive.searchPlaceholder").toLowerCase()}
      </Link>
      {items.length === 0 ? (
        <div className={styles.empty}>
          <FlowerMark size={52} />
          <h2 className={styles.emptyTitle}>{t("archive.emptyTitle").toLowerCase()}</h2>
          <p className={styles.emptyBody}>{t("archive.emptyBody")}</p>
        </div>
      ) : (
        <PolaroidGrid items={items} locale={locale} />
      )}
    </main>
  );
}
