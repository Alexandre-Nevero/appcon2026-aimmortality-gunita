"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { fixtures } from "@/src/mocks/fixtures";
import { readDemoSpace, shouldShowDemoOfflineBanner } from "@/src/mocks/demo-path";
import { useI18n } from "@/src/i18n/provider";
import styles from "./home-collage.module.css";

const positionClass: Record<string, string> = {
  capture: styles.capture,
  archive: styles.archive,
  questions: styles.questions,
  ask: styles.ask,
  memory: styles.memory,
  memorial: styles.memorial,
};

export function HomeCollage() {
  const { t } = useI18n();
  const space = useMemo(() => readDemoSpace(), []);
  const showBanner = shouldShowDemoOfflineBanner();

  const stickers = fixtures.homeStickers.filter(
    (s) => !s.stewardOnly || space.role === "steward",
  );

  return (
    <div className={styles.collage}>
      {showBanner ? (
        <p className={styles.banner} role="status">
          {t("app.offlineBanner")}
        </p>
      ) : null}
      <h1 className={styles.title}>
        <span className={styles.titleBrand}>Himmel&apos;s</span>
        {space.featuredName ? space.featuredName.toLowerCase() : null}
      </h1>
      <div className={styles.scatter}>
        {stickers.map((sticker) => (
          <Link
            key={sticker.id}
            href={sticker.href}
            className={[styles.item, positionClass[sticker.id]].filter(Boolean).join(" ")}
          >
            <Image
              className={styles.objectImg}
              src={sticker.object}
              alt={t(sticker.labelKey)}
              width={128}
              height={128}
              priority={sticker.id === "capture"}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
