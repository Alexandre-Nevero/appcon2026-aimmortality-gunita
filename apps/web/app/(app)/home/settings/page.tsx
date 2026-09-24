"use client";

import { useRouter } from "next/navigation";
import { BackHeader } from "@/src/components/ui/BackHeader";
import { useI18n } from "@/src/i18n/provider";
import type { Locale } from "@/src/i18n/dictionary";
import styles from "@/src/components/shell/list-stub.module.css";

export default function HomeSettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();

  function pick(next: Locale) {
    setLocale(next);
  }

  return (
    <main className={styles.page}>
      <BackHeader
        title={t("settings.title").toLowerCase()}
        backLabel={t("common.back").toLowerCase()}
        onBack={() => router.push("/home")}
      />
      <div className={styles.field}>
        <span className={styles.label}>{t("settings.language")}</span>
        <div className={styles.toggleRow}>
          <button
            type="button"
            className={[styles.toggle, locale === "fil" ? styles.toggleActive : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={() => pick("fil")}
          >
            {t("settings.languageFil").toLowerCase()}
          </button>
          <button
            type="button"
            className={[styles.toggle, locale === "en" ? styles.toggleActive : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={() => pick("en")}
          >
            {t("settings.languageEn").toLowerCase()}
          </button>
        </div>
      </div>
    </main>
  );
}
