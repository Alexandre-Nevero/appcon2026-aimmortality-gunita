"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { BackHeader } from "@/src/components/ui/BackHeader";
import { useI18n } from "@/src/i18n/provider";
import { readDemoSpace } from "@/src/mocks/demo-path";
import styles from "./hub.module.css";

const HUB_ITEMS = [
  {
    id: "cassette",
    src: "/objects/startinterviewtab.png",
    labelKey: "capture.startInterview",
    href: "/capture/interview",
  },
  {
    id: "postcard",
    src: "/objects/typeamemorytab.png",
    labelKey: "capture.addMyMemory",
    href: "/capture/memory",
  },
  {
    id: "polaroid",
    src: "/objects/addaphototab.png",
    labelKey: "capture.addArtifact",
    href: "/capture/artifact",
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
                alt={t(item.labelKey)}
                width={140}
                height={140}
              />
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
