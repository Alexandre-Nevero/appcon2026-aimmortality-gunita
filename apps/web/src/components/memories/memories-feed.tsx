import type { Locale } from "@gunita/core";
import Link from "next/link";

import type { PhotoMemory } from "@/src/memories/queries";

import { photoAlt, position, sharedBy, t } from "./copy";
import styles from "./memories.module.css";
import { TributeButton } from "./tribute-button";

interface Props {
  token: string;
  locale: Locale;
  featuredName: string | null;
  memories: PhotoMemory[];
}

// Sitemap S-033 (F-023): one approved visitor photo per screen. No comments, share, or ranking (ADR-007).
export function MemoriesFeed({ token, locale, featuredName, memories }: Props) {
  const back = (
    <Link href={`/m/${token}`} className={styles.back} aria-label={t("back", locale)}>
      ←
    </Link>
  );

  if (memories.length === 0) {
    return (
      <main className={styles.empty}>
        {back}
        <h1>{t("title", locale)}</h1>
        <p>{t("empty", locale)}</p>
        <Link href={`/m/${token}/share`} className={styles.cta}>
          {t("shareCta", locale)}
        </Link>
      </main>
    );
  }

  const title = featuredName ? `${t("title", locale)} · ${featuredName}` : t("title", locale);
  return (
    <main className={styles.feed} aria-label={title} tabIndex={0}>
      {back}
      {memories.map((memory, index) => (
        <section
          key={memory.id}
          className={styles.slide}
          aria-roledescription="slide"
          aria-label={position(index, memories.length)}
        >
          <img
            src={memory.photoUrl}
            alt={photoAlt(memory.displayName, locale)}
            className={styles.photo}
            loading={index === 0 ? "eager" : "lazy"}
            fetchPriority={index === 0 ? "high" : "auto"}
            decoding="async"
          />
          <p className={styles.position}>{position(index, memories.length)}</p>
          <div className={styles.overlay}>
            <span className={styles.badge}>{t("aboutThem", locale)}</span>
            <p className={styles.byline}>{sharedBy(memory.displayName, memory.relationship, locale)}</p>
            {memory.textContent && <p className={styles.text}>{memory.textContent}</p>}
            <TributeButton
              token={token}
              contributionId={memory.id}
              initialHearted={memory.hearted}
              locale={locale}
            />
          </div>
        </section>
      ))}
    </main>
  );
}
