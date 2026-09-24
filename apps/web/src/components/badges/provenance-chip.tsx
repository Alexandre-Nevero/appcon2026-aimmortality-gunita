import { ORIGIN_LABELS, type Locale, type Origin } from "@gunita/core";
import styles from "./provenance-chip.module.css";

export function ProvenanceChip({ origin, locale }: { origin: Origin; locale: Locale }) {
  return <span className={styles.chip}>{ORIGIN_LABELS[origin][locale]}</span>;
}
