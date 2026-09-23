"use client";

import type { Locale } from "@gunita/core";
import { useState } from "react";

import { t, tributeCountLabel } from "./copy";
import styles from "./memories.module.css";

interface Props {
  token: string;
  contributionId: string;
  initialCount: number;
  initialHearted: boolean;
  locale: Locale;
}

// BR-081: optimistic toggle; the server's count wins; a failure reverts and says so.
export function TributeButton({ token, contributionId, initialCount, initialHearted, locale }: Props) {
  const [state, setState] = useState({ count: initialCount, hearted: initialHearted });
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function toggle() {
    const previous = state;
    const hearted = !state.hearted;
    setState({ count: Math.max(0, state.count + (hearted ? 1 : -1)), hearted });
    setPending(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/m/${token}/tributes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contributionId, hearted }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setState((await response.json()) as { count: number; hearted: boolean });
    } catch {
      setState(previous);
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
        aria-pressed={state.hearted}
        aria-label={t("heart", locale)}
        disabled={pending}
        onClick={toggle}
      >
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
          <path
            d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.4 5 7 5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.6 0 5.8 3.6 4.5 6.8C19.5 16.4 12 21 12 21z"
            fill={state.hearted ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <span className={styles.count} aria-live="polite">
        {failed ? t("sendFailed", locale) : tributeCountLabel(state.count, locale)}
      </span>
    </div>
  );
}
