import Link from "next/link";
import {
  ORIGIN_LABELS,
  REVIEW_STATE_LABELS,
  type Locale,
  type Origin,
  type ReviewState,
} from "@gunita/core";
import { Polaroid } from "@/src/components/ui/Polaroid";
import styles from "./polaroid-grid.module.css";

export type ArchiveGridItem = {
  id: string;
  title: string;
  caption: string;
  photoUrl: string;
  origin: Origin;
  reviewState?: ReviewState;
};

function chipsFor(item: ArchiveGridItem, locale: Locale): string[] {
  const chips = [ORIGIN_LABELS[item.origin][locale]];
  if (item.reviewState) chips.push(REVIEW_STATE_LABELS[item.reviewState][locale]);
  return chips.map((chip) => chip.toLowerCase());
}

export function PolaroidGrid({ items, locale }: { items: ArchiveGridItem[]; locale: Locale }) {
  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <Link key={item.id} href={`/archive/items/${item.id}`} className={styles.link}>
          <Polaroid src={item.photoUrl} caption={item.caption} chips={chipsFor(item, locale)} />
        </Link>
      ))}
    </div>
  );
}
