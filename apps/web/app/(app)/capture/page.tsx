import { eq } from "drizzle-orm";
import Link from "next/link";

import { getCurrentContext } from "@/src/app-shell/current";
import { db } from "@/src/db";
import { consent } from "@/src/db/schema";
import { t } from "@/src/i18n/t";
import styles from "./capture.module.css";

export default async function CapturePage() {
  const context = await getCurrentContext();
  if (!context) return null;
  const { locale, spaceId } = context;

  const consentRow = await db.query.consent.findFirst({ where: eq(consent.spaceId, spaceId) });
  const blocked =
    !consentRow?.participationConsented || !consentRow.aiProcessingConsented || consentRow.withdrawnAt != null;

  return (
    <>
      <h1 className={styles.title}>{t("capture.hubTitle", locale)}</h1>
      <p className={styles.subtitle}>{t("capture.hubSubtitle", locale)}</p>

      {blocked ? (
        <p className={styles.blocked}>{t("capture.consentBlocked", locale)}</p>
      ) : (
        <>
          <Link href="/capture/interview" className={styles.action}>
            <span className={styles.icon} aria-hidden="true">
              ◉
            </span>
            <span>
              <p className={styles.actionTitle}>{t("capture.startInterview", locale)}</p>
              <p className={styles.actionHint}>{t("capture.interviewHint", locale)}</p>
            </span>
          </Link>
          <Link href="/capture/artifact" className={styles.action}>
            <span className={styles.icon} aria-hidden="true">
              ▧
            </span>
            <span>
              <p className={styles.actionTitle}>{t("capture.addArtifact", locale)}</p>
              <p className={styles.actionHint}>{t("capture.artifactHint", locale)}</p>
            </span>
          </Link>
          <Link href="/capture/memory" className={styles.action}>
            <span className={styles.icon} aria-hidden="true">
              ✎
            </span>
            <span>
              <p className={styles.actionTitle}>{t("capture.addMyMemory", locale)}</p>
              <p className={styles.actionHint}>{t("capture.memoryHint", locale)}</p>
            </span>
          </Link>
        </>
      )}

      <p className={styles.notice}>{t("onboarding.consentSubtitle", locale)}</p>
    </>
  );
}
