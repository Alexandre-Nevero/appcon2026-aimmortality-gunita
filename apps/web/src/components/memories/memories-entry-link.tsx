import type { Locale } from "@gunita/core";
import Link from "next/link";

import { t } from "./copy";
import styles from "./memories.module.css";

// S-030 → S-033. TASK-019 renders this on the recap; never on S-032 (BR-080).
export function MemoriesEntryLink({ token, locale }: { token: string; locale: Locale }) {
  return (
    <Link href={`/m/${token}/memories`} className={styles.cta}>
      {t("entry", locale)}
    </Link>
  );
}
