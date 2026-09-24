"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Sheet } from "@/src/components/ui/Sheet";
import type { AskCitation } from "./ask-thread";
import styles from "./evidence-sheet.module.css";

export function EvidenceSheet({
  open,
  title,
  emptyLabel,
  citeHint,
  closeLabel,
  citations,
  onClose,
}: {
  open: boolean;
  title: string;
  emptyLabel: string;
  citeHint: string;
  closeLabel: string;
  citations: AskCitation[];
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className={styles.root} role="presentation">
      <button type="button" className={styles.backdrop} aria-label={closeLabel} onClick={onClose} />
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-title"
        aria-describedby="evidence-hint"
      >
        <Sheet className={styles.sheet}>
          <div className={styles.header}>
            <h2 id="evidence-title" className={styles.title}>
              {title}
            </h2>
            <button ref={closeRef} type="button" className={styles.close} onClick={onClose}>
              {closeLabel}
            </button>
          </div>
          <p id="evidence-hint" className={styles.hint}>
            {citeHint}
          </p>
          {citations.length === 0 ? (
            <p className={styles.empty}>{emptyLabel}</p>
          ) : (
            <ul className={styles.list}>
              {citations.map((c) => (
                <li key={c.itemId} className={styles.item}>
                  <Link href={`/archive/items/${c.itemId}`} className={styles.itemLink} onClick={onClose}>
                    <span className={styles.itemTitle}>{c.title}</span>
                    {c.excerpt ? <p className={styles.excerpt}>{c.excerpt}</p> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Sheet>
      </div>
    </div>
  );
}
