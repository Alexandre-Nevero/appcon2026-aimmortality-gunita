import { and, eq } from "drizzle-orm";
import Link from "next/link";

import { getCurrentContext } from "@/src/app-shell/current";
import { db } from "@/src/db";
import { item, question } from "@/src/db/schema";
import { t, tCount } from "@/src/i18n/t";
import styles from "./home.module.css";

export default async function HomePage() {
  const context = await getCurrentContext();
  if (!context) return null;

  const { locale, spaceId, role, lifecycleMode, memorialToken, featuredName } = context;

  const [reviewItems, nextQuestion] = await Promise.all([
    role === "steward"
      ? db.query.item.findMany({
          where: and(eq(item.spaceId, spaceId), eq(item.reviewState, "ai_suggestion")),
        })
      : Promise.resolve([]),
    db.query.question.findFirst({
      where: and(eq(question.spaceId, spaceId), eq(question.status, "queued")),
    }),
  ]);

  const modeLabel = lifecycleMode === "memorial" ? t("app.modeMemorial", locale) : t("app.modeDuring", locale);

  return (
    <>
      <div className={styles.top}>
        <p className={styles.brand}>Himmel</p>
        <Link href="/settings" className={styles.iconLink} aria-label={t("home.settings", locale)}>
          ⚙
        </Link>
      </div>

      <section className={styles.hero}>
        <span className={styles.mode}>{modeLabel}</span>
        <h1 className={styles.heroTitle}>
          {featuredName ? t("home.greetingNamed", locale, { name: featuredName }) : t("home.greeting", locale)}
        </h1>
        <p>{t("app.tagline", locale)}</p>
      </section>

      {role === "steward" && reviewItems.length > 0 && (
        <div className={styles.card}>
          <div className={styles.row}>
            <div>
              <p className={styles.eyebrow}>{t("home.reviewCta", locale)}</p>
              <p>{tCount("home.reviewCount", reviewItems.length, locale)}</p>
            </div>
            <Link href="/review" className={styles.cta}>
              {t("home.reviewCta", locale)} →
            </Link>
          </div>
        </div>
      )}

      {nextQuestion && (
        <div className={styles.card}>
          <p className={styles.eyebrow}>{t("home.nextQuestions", locale)}</p>
          <p>{nextQuestion.text}</p>
          <p className={styles.reason}>{nextQuestion.reason}</p>
          <div className={styles.row} style={{ marginTop: "0.75rem" }}>
            <Link href="/questions" className={styles.cta}>
              {t("home.questionsCta", locale)} →
            </Link>
          </div>
        </div>
      )}

      {role === "steward" && (
        <div className={styles.card}>
          <div className={styles.row}>
            <div>
              <p className={styles.eyebrow}>{t("home.familyInvites", locale)}</p>
              <p>{t("home.memorialEntry", locale)}</p>
            </div>
            <Link href={memorialToken ? "/memorial/qr" : "/memorial"} className={styles.cta}>
              {t("home.memorialEntry", locale)} →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
