import type { Metadata } from "next";

import { MemoriesEntryLink } from "@/src/components/memories/memories-entry-link";
import { db } from "@/src/db";
import { t } from "@/src/i18n/t";
import { getPublicMemorialSnapshot } from "@/src/memorial/service";
import styles from "@/src/components/public-memorial/public-memorial.module.css";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const CARD_LABEL: Record<string, string> = {
  life_moment: "memorialPublic.lifeMoments",
  quote: "memorialPublic.inTheirOwnWords",
  recipe: "memorialPublic.recipe",
  lesson: "memorialPublic.lesson",
};

// S-030 (TASK-019, F-017): the public recap. Server-rendered from the published snapshot only --
// DB reads, no AI calls (System Design: "GET /m/:token -> server-rendered from snapshot ... DB only").
export default async function PublicMemorialPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const memorial = await getPublicMemorialSnapshot(db, token);

  if (!memorial) {
    return (
      <div className={styles.unavailable}>
        <h1>{t("memorialPublic.unavailableTitle", "en")}</h1>
        <p>{t("memorialPublic.unavailableBody", "en")}</p>
      </div>
    );
  }

  const { locale, featuredName, cards, contributions } = memorial;
  const cover = cards.find((card) => card.type === "cover");
  const rest = cards.filter((card) => card.type !== "cover" && card.type !== "closing");

  return (
    <div className={styles.page}>
      <div className={styles.cover}>
        {cover?.blobUrl ? (
          <img src={cover.blobUrl} alt="" className={styles.coverPhoto} />
        ) : (
          <div className={styles.coverPhoto} aria-label={t("memorialPublic.coverNoPhotoAlt", locale)} />
        )}
        <h1 className={styles.coverName}>{featuredName ?? ""}</h1>
        <p className={styles.coverHint}>{t("memorialPublic.coverHint", locale)}</p>
      </div>

      <div className={styles.cardList}>
        {rest.map((card, index) => (
          <div key={`${card.type}-${card.itemId ?? index}`} className={styles.card}>
            <p className={styles.cardEyebrow}>{t(CARD_LABEL[card.type] ?? "memorialPublic.lifeMoments", locale)}</p>
            <h2 className={styles.cardTitle}>{card.title}</h2>
            {card.caption && (
              <p className={styles.caption}>
                {card.caption}
                {card.aiWritten && <span className={styles.aiMarker}>{t("badges.aiWritten", locale)}</span>}
              </p>
            )}
            {card.blobUrl && card.type !== "cover" && <img src={card.blobUrl} alt="" className={styles.cardImage} />}
            {card.audioUrl && <audio controls preload="none" src={card.audioUrl} className={styles.audioPlayer} />}
            {card.transcriptExcerpt && <p className={styles.transcript}>&ldquo;{card.transcriptExcerpt}&rdquo;</p>}
          </div>
        ))}

        {contributions.length > 0 && (
          <div className={styles.card}>
            <p className={styles.cardEyebrow}>{t("memorialPublic.memoriesFromOthers", locale)}</p>
            {contributions.slice(0, 3).map((entry) => (
              <p key={entry.id} className={styles.transcript}>
                {entry.textContent} — {entry.displayName}
              </p>
            ))}
            <MemoriesEntryLink token={token} locale={locale} />
          </div>
        )}
      </div>

      <div className={styles.entrySection}>
        <p>{t("memorialPublic.closing", locale)}</p>
        <a href={`/m/${token}/share`} className={styles.shareCta}>
          {t("memorialPublic.shareMemory", locale)}
        </a>
      </div>
    </div>
  );
}
