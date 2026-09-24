"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { MemorialCard } from "@/src/memorial/schema";
import {
  fixtureDraftCards,
  markMemorialActive,
  readMemorialActive,
  saveMemorialDraft,
} from "@/src/components/memorial/state";
import { BackHeader } from "@/src/components/ui/BackHeader";
import { Button } from "@/src/components/ui/Button";
import { Polaroid } from "@/src/components/ui/Polaroid";
import { useI18n } from "@/src/i18n/provider";
import { demoSpaceId } from "@/src/mocks/demo-path";
import { fixtures } from "@/src/mocks/fixtures";
import styles from "./memorial.module.css";

export function MemorialSelectScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const items = useMemo(() => fixtures.items, []);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onContinue = async () => {
    if (selected.size === 0) return;
    if (!readMemorialActive()) markMemorialActive();
    setBusy(true);
    const itemIds = [...selected];
    const spaceId = demoSpaceId();
    let cards: MemorialCard[] = fixtureDraftCards(itemIds);

    try {
      const res = await fetch(`/api/spaces/${spaceId}/memorial/publish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "draft", itemIds }),
      });
      if (res.ok) {
        const data = (await res.json()) as { cards: MemorialCard[] };
        if (data.cards?.length) cards = data.cards;
      }
    } catch {
      /* fixture draft */
    }

    saveMemorialDraft(cards);
    setBusy(false);
    router.push("/memorial/recap");
  };

  if (items.length === 0) {
    return (
      <main className={styles.page}>
        <BackHeader
          title={t("memorialSteward.selectTitle").toLowerCase()}
          backLabel={t("common.back").toLowerCase()}
          onBack={() => router.push("/memorial")}
        />
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>{t("memorialSteward.selectEmpty")}</h2>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <BackHeader
        title={t("memorialSteward.selectTitle").toLowerCase()}
        backLabel={t("common.back").toLowerCase()}
        onBack={() => router.push("/memorial")}
      />
      <p className={styles.subtitle}>{t("memorialSteward.selectHint")}</p>
      <div className={styles.selectGrid}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={styles.selectBtn}
            onClick={() => toggle(item.id)}
            aria-pressed={selected.has(item.id)}
          >
            <Polaroid
              src={item.photoUrl}
              caption={item.caption}
              selected={selected.has(item.id)}
            />
          </button>
        ))}
      </div>
      <div className={styles.footerBar}>
        <p className={styles.count}>{t("memorialSteward.selectCount", { count: selected.size })}</p>
        <Button variant="dark" disabled={selected.size === 0 || busy} onClick={onContinue}>
          {t("memorialSteward.continueToRecap")}
        </Button>
      </div>
    </main>
  );
}
