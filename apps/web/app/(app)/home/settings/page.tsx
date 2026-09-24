"use client";

import { useRouter } from "next/navigation";
import { BackHeader } from "@/src/components/ui/BackHeader";
import { Button } from "@/src/components/ui/Button";
import { authClient } from "@/src/auth/client";
import { useI18n } from "@/src/i18n/provider";
import type { Locale } from "@/src/i18n/dictionary";
import { clearDemoAuth } from "@/src/mocks/demo-path";
import styles from "@/src/components/shell/list-stub.module.css";

export default function HomeSettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();

  function pick(next: Locale) {
    setLocale(next);
  }

  async function onSignOut() {
    try {
      await authClient.signOut();
    } catch {
      // fixtures-first fallback: no real session to end, just clear the local demo state below.
    }
    clearDemoAuth();
    router.replace("/sign-in");
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
      <div className={styles.field}>
        <Button variant="ghost" onClick={() => void onSignOut()}>
          {t("settings.signOut").toLowerCase()}
        </Button>
      </div>
    </main>
  );
}
