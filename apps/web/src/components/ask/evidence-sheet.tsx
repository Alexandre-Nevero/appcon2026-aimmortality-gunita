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
  fromThemLabel,
  aboutThemLabel,
  citations,
  onClose,
}: {
  open: boolean;
  title: string;
  emptyLabel: string;
  citeHint: string;
  closeLabel: string;
  fromThemLabel: string;
  aboutThemLabel: string;
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

  const groups = [
    {
      key: "from_them",
      label: fromThemLabel,
      items: citations.filter((citation) => citation.origin === "from_them"),
    },
    {
      key: "about_them",
      label: aboutThemLabel,
      items: citations.filter((citation) => citation.origin !== "from_them"),
    },
  ].filter((group) => group.items.length > 0);

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
            groups.map((group) => (
              <section key={group.key} className={styles.group}>
                <h3 className={styles.groupTitle}>{group.label}</h3>
                <ul className={styles.list}>
                  {group.items.map((citation) => (
                    <li key={citation.itemId} className={styles.item}>
                      <Link
                        href={`/archive/items/${citation.itemId}`}
                        className={styles.itemLink}
                        onClick={onClose}
                      >
                        <span className={styles.itemTitle}>{citation.title}</span>
                        {citation.excerpt ? <p className={styles.excerpt}>{citation.excerpt}</p> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </Sheet>
      </div>
    </div>
  );
}
