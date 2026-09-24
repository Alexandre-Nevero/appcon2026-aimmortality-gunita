import { and, eq, isNotNull } from "drizzle-orm";
import Link from "next/link";

import { archiveReviewStateFilter, visibilityFilter } from "@/src/access/visibility";
import { getCurrentContext } from "@/src/app-shell/current";
import { db } from "@/src/db";
import { item } from "@/src/db/schema";
import { t } from "@/src/i18n/t";
import { ProvenanceBadges } from "@/src/components/badges";
import styles from "./archive.module.css";

export default async function ArchivePage() {
  const context = await getCurrentContext();
  if (!context) return null;
  const { locale, spaceId, role } = context;

  const items = await db.query.item.findMany({
    where: and(
      eq(item.spaceId, spaceId),
      archiveReviewStateFilter(),
      isNotNull(item.visibility),
      visibilityFilter(role),
    ),
    orderBy: (fields, { desc }) => [desc(fields.updatedAt)],
  });

  return (
    <>
      <h1 className={styles.title}>{t("tabs.archive", locale)}</h1>
      <p className={styles.subtitle}>{t("home.emptyBody", locale)}</p>
      <input className={styles.search} placeholder={t("common.search", locale)} disabled />

      {items.length === 0 ? (
        <div className={styles.empty}>{t("home.emptyTitle", locale)}</div>
      ) : (
        <div className={styles.grid}>
          {items.map((row) => (
            <Link key={row.id} href={`/archive/${row.id}`} className={styles.item}>
              <p className={styles.itemTitle}>{row.title}</p>
              <ProvenanceBadges
                origin={row.origin}
                reviewState={row.reviewState}
                visibility={row.visibility}
                locale={locale}
              />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
