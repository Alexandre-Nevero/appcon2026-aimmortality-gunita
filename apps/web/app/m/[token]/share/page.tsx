import { db } from "@/src/db";
import { findPublicMemorial } from "@/src/memories/queries";
import { t } from "@/src/i18n/t";
import { ShareClient } from "./share-client";
import styles from "@/src/components/public-memorial/public-memorial.module.css";

// S-031 (F-019/BR-060/BR-061): visitor shares a memory, no account needed.
export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const memorial = await findPublicMemorial(db, token);

  if (!memorial) {
    return (
      <div className={styles.unavailable}>
        <h1>{t("memorialPublic.unavailableTitle", "en")}</h1>
        <p>{t("memorialPublic.unavailableBody", "en")}</p>
      </div>
    );
  }

  return <ShareClient token={token} locale={memorial.locale} />;
}
