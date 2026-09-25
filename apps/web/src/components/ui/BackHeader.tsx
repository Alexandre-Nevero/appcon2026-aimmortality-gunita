import styles from "./BackHeader.module.css";

export function BackHeader({
  title,
  onBack,
  backLabel = "Back",
}: {
  title: string;
  onBack?: () => void;
  backLabel?: string;
}) {
  return (
    <header className={styles.header}>
      {onBack ? (
        <button type="button" className={styles.back} onClick={onBack} aria-label={backLabel}>
          <span className={styles.backIcon} aria-hidden />
        </button>
      ) : null}
      <h1 className={styles.title}>{title}</h1>
    </header>
  );
}
