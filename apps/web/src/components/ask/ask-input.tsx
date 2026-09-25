"use client";

import { useId, useState } from "react";
import styles from "./ask-input.module.css";

export function AskInput({
  placeholder,
  sendLabel,
  suggested,
  suggestedLabel,
  disabled,
  onSubmit,
  onPickSuggested,
}: {
  placeholder: string;
  sendLabel: string;
  suggested: string[];
  suggestedLabel: string;
  disabled?: boolean;
  onSubmit: (question: string) => void;
  onPickSuggested: (question: string) => void;
}) {
  const [value, setValue] = useState("");
  const inputId = useId();

  function submit() {
    const q = value.trim();
    if (!q || disabled) return;
    onSubmit(q);
    setValue("");
  }

  return (
    <div className={styles.footer}>
      {suggested.length > 0 ? (
        <ul className={styles.suggested} aria-label={suggestedLabel}>
          {suggested.map((q) => (
            <li key={q}>
              <button
                type="button"
                className={styles.suggestedBtn}
                disabled={disabled}
                onClick={() => onPickSuggested(q)}
              >
                {q}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className={styles.row}>
        <label htmlFor={inputId} className={styles.visuallyHidden}>
          {placeholder}
        </label>
        <input
          id={inputId}
          className={styles.input}
          type="text"
          enterKeyHint="send"
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          type="button"
          className={styles.send}
          aria-label={sendLabel}
          disabled={disabled || !value.trim()}
          onClick={submit}
        >
          <span className={styles.sendIcon} aria-hidden />
        </button>
      </div>
    </div>
  );
}
