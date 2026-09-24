"use client";

import { useRouter } from "next/navigation";
import { BackHeader } from "@/src/components/ui/BackHeader";
import { useI18n } from "@/src/i18n/provider";
import styles from "./memorial.module.css";

export function MemorialModerationScreen() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <main className={styles.page}>
      <BackHeader
        title={t("memorialSteward.moderationTitle").toLowerCase()}
        backLabel={t("common.back").toLowerCase()}
        onBack={() => router.push("/memorial/qr")}
      />
      <p className={styles.subtitle}>{t("memorialSteward.moderationHint")}</p>
      <div className={styles.empty}>
        <h2 className={styles.emptyTitle}>{t("memorialSteward.moderationEmpty")}</h2>
      </div>
    </main>
  );
}
