import { getDictionary } from "@/src/i18n/dictionary";
import { t } from "@/src/i18n/t";

import styles from "@/src/components/public-memorial/public-memorial.module.css";

export default function MemorialNotFound() {
  const dict = getDictionary("en");
  return (
    <main className={styles.unavailable}>
      <h1 className={styles.unavailableTitle}>{t(dict, "memorialPublic.unavailableTitle")}</h1>
      <p className={styles.unavailableBody}>{t(dict, "memorialPublic.unavailableBody")}</p>
    </main>
  );
}
