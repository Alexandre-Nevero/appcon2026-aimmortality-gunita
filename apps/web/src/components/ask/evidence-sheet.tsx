"use client";

import Link from "next/link";
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
  if (!open) return null;

  return (
    <div className={styles.root} role="presentation">
      <button type="button" className={styles.backdrop} aria-label={closeLabel} onClick={onClose} />
      <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="evidence-title">
        <Sheet className={styles.sheet}>
          <div className={styles.header}>
            <h2 id="evidence-title" className={styles.title}>
              {title}
            </h2>
            <button type="button" className={styles.close} onClick={onClose}>
              {closeLabel}
            </button>
          </div>
          <p className={styles.hint}>{citeHint}</p>
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
