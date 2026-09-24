"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { MemorialCard } from "@/src/memorial/schema";
import {
  fixtureDraftCards,
  markMemorialPublished,
  readMemorialDraft,
  saveMemorialDraft,
} from "@/src/components/memorial/state";
import { BackHeader } from "@/src/components/ui/BackHeader";
import { Button } from "@/src/components/ui/Button";
import { useI18n } from "@/src/i18n/provider";
import { demoSpaceId } from "@/src/mocks/demo-path";
import { fixtures } from "@/src/mocks/fixtures";
import styles from "./memorial.module.css";

function resolveCards(): MemorialCard[] {
  const stored = readMemorialDraft();
  if (stored?.length) return stored;
  const ids = fixtures.items.map((i) => i.id);
  return fixtureDraftCards(ids);
}

export function MemorialRecapScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const [cards] = useMemo(() => [resolveCards()], []);
  const photoByItem = useMemo(
    () => new Map(fixtures.items.map((i) => [i.id, i.photoUrl])),
    [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPublish = async () => {
    setBusy(true);
    setError(null);
    const spaceId = demoSpaceId();
    try {
      const res = await fetch(`/api/spaces/${spaceId}/memorial/publish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "publish", cards }),
      });
      if (!res.ok) throw new Error("publish_failed");
    } catch {
      saveMemorialDraft(cards);
      markMemorialPublished();
    }
    markMemorialPublished();
    setBusy(false);
    router.push("/memorial/qr");
  };

  if (cards.length === 0) {
    return (
      <main className={styles.page}>
        <BackHeader
          title={t("memorialSteward.recapTitle").toLowerCase()}
          backLabel={t("common.back").toLowerCase()}
          onBack={() => router.push("/memorial/select")}
        />
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>{t("memorialSteward.recapEmpty")}</h2>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <BackHeader
        title={t("memorialSteward.recapTitle").toLowerCase()}
        backLabel={t("common.back").toLowerCase()}
        onBack={() => router.push("/memorial/select")}
      />
      <p className={styles.subtitle}>{t("memorialSteward.recapHint")}</p>
      <div className={styles.recapStack}>
        {cards.map((card) => {
          const photoSrc =
            card.blobUrl ?? (card.itemId ? photoByItem.get(card.itemId) : undefined);
          return (
            <article
              key={`${card.type}-${card.order}-${card.itemId ?? "x"}`}
              className={styles.recapCard}
            >
              <h2 className={styles.recapCardTitle}>{card.title}</h2>
              {card.body ? <p className={styles.recapCardBody}>{card.body}</p> : null}
              {card.caption ? <p className={styles.recapCaption}>{card.caption}</p> : null}
              {photoSrc ? <img className={styles.recapPhoto} src={photoSrc} alt="" /> : null}
            </article>
          );
        })}
      </div>
      {error ? <p className={styles.error}>{t("memorialSteward.publishFailed")}</p> : null}
      <Button variant="dark" disabled={busy} onClick={onPublish}>
        {t("memorialSteward.publishCta")}
      </Button>
    </main>
  );
}
