"use client";

import { useState } from "react";
import Link from "next/link";
import type { Locale } from "@gunita/core";

import { t } from "@/src/i18n/t";
import styles from "./memorial.module.css";

interface QrState {
  url: string;
  qrSvg: string;
  enabled: boolean;
}

export function MemorialClient({
  spaceId,
  locale,
  featuredName,
  lifecycleMode: initialMode,
}: {
  spaceId: string;
  locale: Locale;
  featuredName: string | null;
  lifecycleMode: "during" | "memorial";
}) {
  const [mode, setMode] = useState(initialMode);
  const [typedName, setTypedName] = useState("");
  const [qr, setQr] = useState<QrState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function loadQr() {
    const response = await fetch(`/api/spaces/${spaceId}/memorial/qr`);
    if (response.ok) setQr(await response.json());
  }

  async function activate() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/spaces/${spaceId}/memorial/activate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "activate", typedName }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error === "invalid_confirmation_name" ? "The name doesn't match. Type it exactly." : t("common.errorGeneric", locale));
        return;
      }
      setMode("memorial");
      await loadQr();
    } finally {
      setPending(false);
    }
  }

  async function reverse() {
    setPending(true);
    try {
      await fetch(`/api/spaces/${spaceId}/memorial/activate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "reverse" }),
      });
      setMode("during");
      setQr(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h1 className={styles.title}>{t("home.memorialEntry", locale)}</h1>

      <div className={styles.card}>
        <span className={`${styles.statusBadge} ${mode === "memorial" ? styles.memorial : styles.during}`}>
          {mode === "memorial" ? t("app.modeMemorial", locale) : t("app.modeDuring", locale)}
        </span>

        {mode === "during" ? (
          <>
            <p>Type the featured person&rsquo;s full name to confirm activation.</p>
            <p style={{ fontWeight: 600 }}>{featuredName}</p>
            <input className={styles.input} value={typedName} onChange={(e) => setTypedName(e.target.value)} />
            {error && <p className={styles.error}>{error}</p>}
            <button type="button" className={styles.primary} onClick={activate} disabled={pending}>
              {t("common.confirm", locale)}
            </button>
          </>
        ) : (
          <>
            <p>The recap is live. Visitors can scan the QR below with no login.</p>
            {!qr && (
              <button type="button" className={styles.primary} onClick={loadQr}>
                Show QR
              </button>
            )}
            {qr && (
              <div className={styles.qr}>
                <div dangerouslySetInnerHTML={{ __html: qr.qrSvg }} />
                <p className={styles.url}>{qr.url}</p>
              </div>
            )}
            <button type="button" className={styles.secondary} onClick={reverse} disabled={pending}>
              Reverse activation
            </button>
          </>
        )}
      </div>

      <Link href="/memorial/moderation" className={styles.secondary} style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
        Moderation queue
      </Link>
    </>
  );
}
