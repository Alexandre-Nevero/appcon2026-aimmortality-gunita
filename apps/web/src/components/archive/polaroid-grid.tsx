import Link from "next/link";
import { ORIGIN_LABELS, type Locale, type Origin } from "@gunita/core";
import { Polaroid } from "@/src/components/ui/Polaroid";
import styles from "./polaroid-grid.module.css";

export type ArchiveGridItem = {
  id: string;
  title: string;
  caption: string;
  photoUrl: string;
  origin: Origin;
};

export function PolaroidGrid({ items, locale }: { items: ArchiveGridItem[]; locale: Locale }) {
  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <Link key={item.id} href={`/archive/items/${item.id}`} className={styles.link}>
          <Polaroid
            src={item.photoUrl}
            caption={item.caption}
            chips={[ORIGIN_LABELS[item.origin][locale].toLowerCase()]}
          />
        </Link>
      ))}
    </div>
  );
}
