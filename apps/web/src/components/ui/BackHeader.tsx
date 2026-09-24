import styles from "./BackHeader.module.css";

export function BackHeader({
  title,
  subtitle,
  hideTitle,
  onBack,
  backLabel = "Back",
}: {
  title: string;
  subtitle?: string;
  /** Keep the h1 for screen readers when the screen shows its own visual title. */
  hideTitle?: boolean;
  onBack?: () => void;
  backLabel?: string;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.row}>
        {onBack ? (
          <button type="button" className={styles.back} onClick={onBack} aria-label={backLabel}>
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path
                d="M20 12H5M11 5l-7 7 7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}
        <h1 className={hideTitle ? styles.srOnly : styles.title}>{title}</h1>
      </div>
      {subtitle ? (
        <p className={[styles.subtitle, onBack ? styles.indented : ""].filter(Boolean).join(" ")}>
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
