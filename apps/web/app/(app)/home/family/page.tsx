"use client";

import { useRouter } from "next/navigation";
import { BackHeader } from "@/src/components/ui/BackHeader";
import { useI18n } from "@/src/i18n/provider";
import styles from "@/src/components/shell/list-stub.module.css";

export default function HomeFamilyPage() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <main className={styles.page}>
      <BackHeader
        title={t("family.title").toLowerCase()}
        backLabel={t("common.back").toLowerCase()}
        onBack={() => router.push("/home")}
      />
      <div className={styles.empty}>
        <h2 className={styles.emptyTitle}>{t("family.members").toLowerCase()}</h2>
        <p className={styles.emptyBody}>{t("family.emptyMembers")}</p>
      </div>
    </main>
  );
}
