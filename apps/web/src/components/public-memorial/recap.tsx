import type { Locale } from "@gunita/core";
import Link from "next/link";

import { MemoriesEntryLink } from "@/src/components/memories/memories-entry-link";
import { getDictionary } from "@/src/i18n/dictionary";
import { t } from "@/src/i18n/t";

import type { PublicMemorialView } from "./data";
import styles from "./public-memorial.module.css";
import { VoicePlay } from "./voice-play";

function sectionLabel(type: string, dict: ReturnType<typeof getDictionary>): string | null {
  switch (type) {
    case "life_moment":
      return t(dict, "memorialPublic.lifeMoments");
    case "quote":
      return t(dict, "memorialPublic.inTheirOwnWords");
    case "recipe":
      return t(dict, "memorialPublic.recipe");
    case "lesson":
      return t(dict, "memorialPublic.lesson");
    case "closing":
      return t(dict, "memorialPublic.closing");
    default:
      return null;
  }
}

export function PublicMemorialRecap({
  token,
  memorial,
}: {
  token: string;
  memorial: PublicMemorialView;
}) {
  const locale = memorial.locale as Locale;
  const dict = getDictionary(locale);
  const cover = memorial.cards.find((card) => card.type === "cover");
  const bodyCards = memorial.cards.filter((card) => card.type !== "cover");

  return (
    <main className={styles.page}>
      <header className={styles.cover}>
        <h1 className={styles.coverTitle}>
          {cover?.title ?? memorial.featuredName ?? t(dict, "app.name")}
        </h1>
        <p className={styles.coverHint}>{t(dict, "memorialPublic.coverHint")}</p>
        {cover?.blobUrl ? (
          <img className={styles.coverPhoto} src={cover.blobUrl} alt="" />
        ) : null}
      </header>

      {bodyCards.map((card) => {
        const label = sectionLabel(card.type, dict);
        return (
          <section key={`${card.type}-${card.order}-${card.itemId ?? "x"}`} className={styles.section}>
            {label ? <h2 className={styles.sectionTitle}>{label}</h2> : null}
            <article className={styles.card}>
              {card.title ? <h3 className={styles.cardTitle}>{card.title}</h3> : null}
              {card.body ? <p className={styles.cardBody}>{card.body}</p> : null}
              {card.caption ? <p className={styles.cardCaption}>{card.caption}</p> : null}
              {card.blobUrl ? <img className={styles.cardPhoto} src={card.blobUrl} alt="" /> : null}
              {card.audioUrl ? (
                <VoicePlay
                  audioUrl={card.audioUrl}
                  locale={locale}
                  transcript={card.transcriptExcerpt}
                />
              ) : null}
            </article>
          </section>
        );
      })}

      <section className={styles.section} aria-labelledby="others-heading">
        <h2 id="others-heading" className={styles.sectionTitle}>
          {t(dict, "memorialPublic.memoriesFromOthers")}
        </h2>
        {memorial.contributions.length === 0 ? (
          <p className={styles.hint}>{t(dict, "memorialPublic.memoriesFromOthersEmpty")}</p>
        ) : (
          memorial.contributions.map((entry) => (
            <article key={entry.id} className={styles.contribution}>
              <p className={styles.contributionMeta}>
                {entry.displayName} · {entry.relationship}
              </p>
              {entry.textContent ? <p className={styles.cardBody}>{entry.textContent}</p> : null}
              {entry.photoBlobPathname ? (
                <img
                  className={styles.cardPhoto}
                  src={entry.photoBlobPathname}
                  alt={t(dict, "memorialPublic.photoMemoriesPreview")}
                />
              ) : null}
              {entry.audioBlobPathname ? (
                <VoicePlay audioUrl={entry.audioBlobPathname} locale={locale} />
              ) : null}
            </article>
          ))
        )}
      </section>

      <div className={styles.actions}>
        <Link href={`/m/${token}/share`} className={styles.primaryLink}>
          {t(dict, "memorialPublic.shareMemory")}
        </Link>
        <MemoriesEntryLink token={token} locale={locale} />
      </div>
    </main>
  );
}
