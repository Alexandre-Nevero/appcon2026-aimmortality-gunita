import Link from "next/link";
import {
  ORIGIN_LABELS,
  REVIEW_STATE_LABELS,
  type Locale,
  type Origin,
  type ReviewState,
} from "@gunita/core";
import styles from "./sticky-note-grid.module.css";

export type StickyNoteItem = {
  id: string;
  caption: string;
  body: string;
  origin: Origin;
  reviewState?: ReviewState;
};

// Small fixed tilts (DESIGN.md: scattered objects stay within -6° and 6°).
const TILTS = [-3, 2, -1.5, 3, 1.5, -2.5];

export function StickyNoteGrid({ items, locale }: { items: StickyNoteItem[]; locale: Locale }) {
  return (
    <ul className={styles.grid}>
      {items.map((item, i) => (
        <li key={item.id} className={styles.cell}>
          <Link
            href={`/archive/items/${item.id}`}
            className={styles.note}
            style={{ rotate: `${TILTS[i % TILTS.length]}deg` }}
          >
            <span className={styles.caption}>{item.caption}</span>
            <span className={styles.excerpt}>{item.body}</span>
            <span className={styles.chips}>
              <span className={styles.chip}>{ORIGIN_LABELS[item.origin][locale].toLowerCase()}</span>
              {item.reviewState ? (
                <span className={styles.chip}>
                  {REVIEW_STATE_LABELS[item.reviewState][locale].toLowerCase()}
                </span>
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
