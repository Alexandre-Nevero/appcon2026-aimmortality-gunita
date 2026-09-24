import type { Locale } from "@gunita/core";

import { FlowerMark } from "@/src/components/ui/FlowerMark";
import { getDictionary } from "@/src/i18n/dictionary";
import { t } from "@/src/i18n/t";

import styles from "./public-memorial.module.css";

export function ThanksScreen({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  return (
    <main className={styles.thanks}>
      <FlowerMark size={56} />
      <h1 className={styles.thanksTitle}>{t(dict, "memorialPublic.thanksTitle")}</h1>
      <p className={styles.thanksBody}>{t(dict, "memorialPublic.thanksBody")}</p>
      <p className={styles.thanksClose}>{t(dict, "memorialPublic.thanksClose")}</p>
    </main>
  );
}
