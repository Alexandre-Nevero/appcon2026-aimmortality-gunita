"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  PLACEHOLDER_QR_SVG,
  fixtureMemorialUrl,
  readMemorialPublished,
} from "@/src/components/memorial/state";
import { BackHeader } from "@/src/components/ui/BackHeader";
import { Button } from "@/src/components/ui/Button";
import { useI18n } from "@/src/i18n/provider";
import { demoSpaceId } from "@/src/mocks/demo-path";
import styles from "./memorial.module.css";

type QrState = {
  url: string;
  qrSvg: string;
  enabled: boolean;
};

export function MemorialQrScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const [state, setState] = useState<QrState>(() => ({
    url: fixtureMemorialUrl(),
    qrSvg: PLACEHOLDER_QR_SVG,
    enabled: true,
  }));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const spaceId = demoSpaceId();
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/spaces/${spaceId}/memorial/qr`);
        if (!res.ok) throw new Error("qr_failed");
        const data = (await res.json()) as QrState & { token?: string };
        if (!cancelled) {
          setState({
            url: data.url,
            qrSvg: data.qrSvg,
            enabled: data.enabled,
          });
        }
      } catch {
        if (!cancelled && readMemorialPublished()) {
          setState({
            url: fixtureMemorialUrl(),
            qrSvg: PLACEHOLDER_QR_SVG,
            enabled: true,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(state.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className={styles.page}>
      <BackHeader
        title={t("memorialSteward.qrTitle").toLowerCase()}
        backLabel={t("common.back").toLowerCase()}
        onBack={() => router.push("/memorial/recap")}
      />
      <p className={styles.subtitle}>{t("memorialSteward.qrHint")}</p>
      <div className={styles.qrWrap}>
        <div
          className={styles.qrImg}
          dangerouslySetInnerHTML={{ __html: state.qrSvg }}
        />
        <p className={styles.urlBox}>{state.url}</p>
        {!state.enabled ? (
          <p className={styles.status}>{t("memorialSteward.linkDisabled")}</p>
        ) : null}
      </div>
      <div className={styles.actions}>
        <Button variant="dark" onClick={onCopy}>
          {copied ? t("common.copied") : t("memorialSteward.linkCopy")}
        </Button>
        <Button variant="ghost" onClick={() => router.push("/memorial/moderation")}>
          {t("memorialSteward.moderationTitle").toLowerCase()}
        </Button>
      </div>
    </main>
  );
}
