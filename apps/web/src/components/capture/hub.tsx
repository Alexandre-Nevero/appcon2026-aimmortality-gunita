"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { BackHeader } from "@/src/components/ui/BackHeader";
import { Sticker } from "@/src/components/ui/Sticker";
import { useI18n } from "@/src/i18n/provider";
import { readDemoSpace } from "@/src/mocks/demo-path";
import styles from "./hub.module.css";

const HUB_ITEMS = [
  {
    id: "cassette",
    src: "/objects/tv.png",
    labelKey: "capture.startInterview",
    href: "/capture/interview",
    highlight: true,
    rotate: -3,
  },
  {
    id: "postcard",
    src: "/objects/postcard.png",
    labelKey: "capture.addMyMemory",
    href: "/capture/memory",
    highlight: false,
    rotate: 4,
  },
  {
    id: "polaroid",
    src: "/objects/polaroids.png",
    labelKey: "capture.addArtifact",
    href: "/capture/artifact",
    highlight: false,
    rotate: -2,
  },
] as const;

export function CaptureHub() {
  const { t } = useI18n();
  const router = useRouter();
  const space = useMemo(() => readDemoSpace(), []);

  return (
    <main className={styles.page}>
      <BackHeader
        title={t("capture.hubTitle").toLowerCase()}
        backLabel={t("common.back").toLowerCase()}
        onBack={() => router.push("/home")}
      />
      <p className={styles.subtitle}>{t("capture.hubSubtitle")}</p>
      {!space.consentSaved ? (
        <p className={styles.blocked} role="status">
          {t("capture.consentBlocked")}
        </p>
      ) : null}
      <div className={styles.stack}>
        {HUB_ITEMS.map((item) => {
          const blocked = !space.consentSaved && item.id === "cassette";
          const body = (
            <>
              <Image
                className={styles.objectImg}
                src={item.src}
                alt=""
                width={104}
                height={104}
              />
              <div className={styles.stickerWrap}>
                <Sticker
                  label={t(item.labelKey).toLowerCase()}
                  highlight={item.highlight}
                  rotate={item.rotate}
                />
              </div>
            </>
          );
          if (blocked) {
            return (
              <div key={item.id} className={styles.link} aria-disabled>
                {body}
              </div>
            );
          }
          return (
            <Link key={item.id} href={item.href} className={styles.link}>
              {body}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
