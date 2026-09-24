"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ActivateConfirm } from "@/src/components/memorial/activate-confirm";
import { markMemorialActive, readMemorialActive } from "@/src/components/memorial/state";
import { BackHeader } from "@/src/components/ui/BackHeader";
import { Button } from "@/src/components/ui/Button";
import { useI18n } from "@/src/i18n/provider";
import { demoSpaceId, readDemoSpace } from "@/src/mocks/demo-path";
import styles from "./memorial.module.css";

export function MemorialActivateScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const space = useMemo(() => readDemoSpace(), []);
  const [active, setActive] = useState(() => readMemorialActive());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [busy, setBusy] = useState(false);
  const [mismatch, setMismatch] = useState<string | null>(null);

  const onConfirmActivate = async () => {
    const normalized = typedName.trim().replace(/\s+/g, " ");
    const expected = space.featuredName.trim().replace(/\s+/g, " ");
    if (normalized.toLowerCase() !== expected.toLowerCase()) {
      setMismatch(t("memorialSteward.activateMismatch"));
      return;
    }
    setMismatch(null);
    setBusy(true);
    const spaceId = demoSpaceId();
    try {
      const res = await fetch(`/api/spaces/${spaceId}/memorial/activate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "activate", typedName: normalized }),
      });
      if (!res.ok) throw new Error("activate_failed");
    } catch {
      markMemorialActive();
    }
    markMemorialActive();
    setActive(true);
    setBusy(false);
    setConfirmOpen(false);
    router.push("/memorial/select");
  };

  return (
    <main className={styles.page}>
      <BackHeader
        title={t("memorialSteward.title").toLowerCase()}
        backLabel={t("common.back").toLowerCase()}
        onBack={() => router.push("/home")}
      />
      <p className={styles.subtitle}>{t("memorialSteward.explain")}</p>
      <div className={styles.hero}>
        <Image
          className={styles.heroImg}
          src="/objects/tv.png"
          alt=""
          width={240}
          height={180}
          priority
        />
      </div>
      {active ? (
        <p className={styles.status} role="status">
          {t("memorialSteward.activated")}
        </p>
      ) : null}
      <div className={styles.actions}>
        {!active ? (
          <Button variant="dark" onClick={() => setConfirmOpen(true)}>
            {t("memorialSteward.activate")}
          </Button>
        ) : (
          <>
            <Button variant="dark" onClick={() => router.push("/memorial/select")}>
              {t("memorialSteward.selectTitle")}
            </Button>
            <Button variant="primary" onClick={() => router.push("/memorial/qr")}>
              {t("memorialSteward.qrTitle")}
            </Button>
          </>
        )}
      </div>
      <nav className={styles.navLinks} aria-label="memorial">
        <Link href="/memorial/moderation">{t("memorialSteward.moderationTitle").toLowerCase()}</Link>
      </nav>
      <ActivateConfirm
        open={confirmOpen}
        title={t("memorialSteward.activateConfirm")}
        hint={t("memorialSteward.activateConfirmHint", { name: space.featuredName })}
        mismatch={mismatch}
        value={typedName}
        onChange={setTypedName}
        onCancel={() => {
          setConfirmOpen(false);
          setMismatch(null);
        }}
        onConfirm={onConfirmActivate}
        confirmLabel={t("memorialSteward.activate")}
        cancelLabel={t("common.cancel")}
        busy={busy}
      />
    </main>
  );
}
