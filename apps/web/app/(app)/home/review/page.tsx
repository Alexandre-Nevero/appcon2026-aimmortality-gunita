"use client";

import { useRouter } from "next/navigation";
import { BackHeader } from "@/src/components/ui/BackHeader";
import { useI18n } from "@/src/i18n/provider";
import styles from "@/src/components/shell/list-stub.module.css";

export default function HomeReviewPage() {
  const { t } = useI18n();
  const router = useRouter();
  const pending: string[] = [];

  return (
    <main className={styles.page}>
      <BackHeader
        title={t("review.queueTitle").toLowerCase()}
        backLabel={t("common.back").toLowerCase()}
        onBack={() => router.push("/home")}
      />
      <p className={styles.label}>{t("review.queueSubtitle")}</p>
      {pending.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>{t("review.emptyTitle").toLowerCase()}</h2>
          <p className={styles.emptyBody}>{t("review.emptyBody")}</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {pending.map((id) => (
            <li key={id} className={styles.item}>
              {id}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
