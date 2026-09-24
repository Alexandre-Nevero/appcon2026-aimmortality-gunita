"use client";

import { useState } from "react";
import type { Locale } from "@gunita/core";

import { t } from "@/src/i18n/t";
import styles from "./review.module.css";

interface ReviewItem {
  id: string;
  title: string;
  body: string;
}

export function ReviewClient({ locale, items: initialItems }: { locale: Locale; items: ReviewItem[] }) {
  const [items, setItems] = useState(initialItems);

  async function act(id: string, action: "confirm" | "reject" | "uncertain") {
    await fetch(`/api/items/${id}/review`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, withFeaturedPerson: false }),
    });
    setItems((current) => current.filter((row) => row.id !== id));
  }

  if (items.length === 0) {
    return <p className={styles.empty}>{t("home.emptyTitle", locale)}</p>;
  }

  return (
    <>
      {items.map((row) => (
        <div key={row.id} className={styles.card}>
          <p className={styles.title2}>{row.title}</p>
          <p className={styles.body}>{row.body}</p>
          <div className={styles.actions}>
            <button type="button" className={`${styles.actionBtn} ${styles.confirm}`} onClick={() => act(row.id, "confirm")}>
              {t("common.confirm", locale)}
            </button>
            <button type="button" className={styles.actionBtn} onClick={() => act(row.id, "uncertain")}>
              {t("badges.reviewState.uncertain", locale)}
            </button>
            <button type="button" className={`${styles.actionBtn} ${styles.dispute}`} onClick={() => act(row.id, "reject")}>
              {t("common.reject", locale)}
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
