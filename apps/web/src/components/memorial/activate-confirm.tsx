"use client";

import { Button } from "@/src/components/ui/Button";
import styles from "./memorial.module.css";

export function ActivateConfirm({
  open,
  title,
  hint,
  mismatch,
  value,
  onChange,
  onCancel,
  onConfirm,
  confirmLabel,
  cancelLabel,
  busy,
}: {
  open: boolean;
  title: string;
  hint: string;
  mismatch: string | null;
  value: string;
  onChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  cancelLabel: string;
  busy: boolean;
}) {
  if (!open) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.sheet}>
        <h2 className={styles.sheetTitle}>{title}</h2>
        <p className={styles.sheetHint}>{hint}</p>
        <input
          className={styles.input}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          autoFocus
        />
        {mismatch ? <p className={styles.error}>{mismatch}</p> : null}
        <div className={styles.sheetActions}>
          <Button variant="dark" disabled={busy || !value.trim()} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
