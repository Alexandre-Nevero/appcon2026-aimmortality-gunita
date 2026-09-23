"use client";

import type { Locale } from "@gunita/core";
import { useState } from "react";

import { t } from "./copy";
import styles from "./memories.module.css";

interface Props {
  token: string;
  contributionId: string;
  initialHearted: boolean;
  locale: Locale;
}

// ADR-008: the heart is this phone's only. A failure puts it back. No count.
export function TributeButton({ token, contributionId, initialHearted, locale }: Props) {
  const [hearted, setHearted] = useState(initialHearted);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function toggle() {
    const previous = hearted;
    const next = !hearted;
    setHearted(next);
    setPending(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/m/${token}/tributes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contributionId, hearted: next }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const body = (await response.json()) as { hearted?: unknown };
      if (typeof body.hearted !== "boolean") throw new Error("invalid_body");
      setHearted(body.hearted);
    } catch {
      setHearted(previous);
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.tribute}>
      <button
        type="button"
        className={styles.heart}
        aria-pressed={hearted}
        aria-label={t("heart", locale)}
        disabled={pending}
        onClick={toggle}
      >
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
          <path
            d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.4 5 7 5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.6 0 5.8 3.6 4.5 6.8C19.5 16.4 12 21 12 21z"
            fill={hearted ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {failed ? (
        <span className={styles.status} aria-live="polite">
          {t("sendFailed", locale)}
        </span>
      ) : null}
    </div>
  );
}
