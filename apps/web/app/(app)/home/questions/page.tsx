"use client";

import { useRouter } from "next/navigation";
import { BackHeader } from "@/src/components/ui/BackHeader";
import { useI18n } from "@/src/i18n/provider";
import { fixtures } from "@/src/mocks/fixtures";
import styles from "@/src/components/shell/list-stub.module.css";

export default function HomeQuestionsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const questions = fixtures.interviewQuestions;

  return (
    <main className={styles.page}>
      <BackHeader
        title={t("questions.title").toLowerCase()}
        backLabel={t("common.back").toLowerCase()}
        onBack={() => router.push("/home")}
      />
      {questions.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>{t("questions.emptyTitle").toLowerCase()}</h2>
          <p className={styles.emptyBody}>{t("questions.emptyBody")}</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {questions.map((q) => (
            <li key={q} className={styles.item}>
              {q}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
