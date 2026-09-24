import styles from "./Polaroid.module.css";

export function Polaroid({
  src,
  caption,
  selected,
  chips,
}: {
  src: string;
  caption: string;
  selected?: boolean;
  chips?: string[];
}) {
  return (
    <figure
      className={[styles.polaroid, selected ? styles.selected : ""]
        .filter(Boolean)
        .join(" ")}
    >
      {src ? (
        <img className={styles.image} src={src} alt="" />
      ) : (
        <div className={styles.image} aria-hidden="true" />
      )}
      <figcaption className={styles.caption}>{caption}</figcaption>
      {chips?.length ? (
        <div className={styles.chips}>
          {chips.map((chip) => (
            <span key={chip} className={styles.chip}>
              {chip}
            </span>
          ))}
        </div>
      ) : null}
    </figure>
  );
}
