import { redirect } from "next/navigation";
import Link from "next/link";

import { getCurrentContext } from "@/src/app-shell/current";
import { t } from "@/src/i18n/t";
import styles from "./app-shell.module.css";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const context = await getCurrentContext();
  if (!context) {
    redirect("/sign-in");
  }

  const { locale } = context;

  return (
    <div className={styles.page}>
      <div className={styles.content}>{children}</div>
      <nav className={styles.tabbar} aria-label={t("tabs.home", locale)}>
        <Link href="/home" className={styles.tab}>
          <span className={styles.tabIcon} aria-hidden="true">
            ⌂
          </span>
          {t("tabs.home", locale)}
        </Link>
        <Link href="/capture" className={styles.tab}>
          <span className={styles.tabIcon} aria-hidden="true">
            ◎
          </span>
          {t("tabs.capture", locale)}
        </Link>
        <Link href="/archive" className={styles.tab}>
          <span className={styles.tabIcon} aria-hidden="true">
            ▦
          </span>
          {t("tabs.archive", locale)}
        </Link>
        <Link href="/ask" className={styles.tab}>
          <span className={styles.tabIcon} aria-hidden="true">
            ✧
          </span>
          {t("tabs.ask", locale)}
        </Link>
      </nav>
    </div>
  );
}
