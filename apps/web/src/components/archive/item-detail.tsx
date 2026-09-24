"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { BackHeader } from "@/src/components/ui/BackHeader";
import { Polaroid } from "@/src/components/ui/Polaroid";
import { ProvenanceChip } from "@/src/components/badges/provenance-chip";
import { useI18n } from "@/src/i18n/provider";
import { fixtures } from "@/src/mocks/fixtures";
import styles from "./item-detail.module.css";

export function ArchiveItemDetail({ itemId }: { itemId: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const item = useMemo(() => fixtures.items.find((row) => row.id === itemId), [itemId]);

  return (
    <main className={styles.page}>
      <BackHeader
        title={t("archive.itemDetail").toLowerCase()}
        backLabel={t("common.back").toLowerCase()}
        onBack={() => router.push(item?.kind === "text" ? "/postcards" : "/archive")}
      />
      {!item ? (
        <p className={styles.notFound} role="status">
          {t("common.notFound")}
        </p>
      ) : (
        <>
          {item.kind === "photo" ? (
            <Polaroid src={item.photoUrl} caption={item.caption} />
          ) : (
            <h2 className={styles.noteTitle}>{item.caption}</h2>
          )}
          <div className={styles.chips}>
            <ProvenanceChip origin={item.origin} locale={locale} />
          </div>
          <p className={styles.body}>{item.body}</p>
        </>
      )}
    </main>
  );
}
