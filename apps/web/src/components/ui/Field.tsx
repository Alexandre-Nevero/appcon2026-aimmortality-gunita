import type { InputHTMLAttributes } from "react";
import styles from "./Field.module.css";

export function Field({
  label,
  error,
  id,
  ...inputProps
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  const inputId = id ?? inputProps.name;
  return (
    <div className={styles.field}>
      {label ? (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <input id={inputId} className={styles.input} {...inputProps} />
      {error ? (
        <span className={styles.error} role="alert">
          <span className={styles.errorDot} aria-hidden />
          {error}
        </span>
      ) : null}
    </div>
  );
}
