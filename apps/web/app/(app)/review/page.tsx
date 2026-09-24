import { and, eq } from "drizzle-orm";

import { getCurrentContext } from "@/src/app-shell/current";
import { db } from "@/src/db";
import { item } from "@/src/db/schema";
import { t } from "@/src/i18n/t";
import { ReviewClient } from "./review-client";
import styles from "./review.module.css";

export default async function ReviewPage() {
  const context = await getCurrentContext();
  if (!context || context.role !== "steward") return null;
  const { locale, spaceId } = context;

  const items = await db.query.item.findMany({
    where: and(eq(item.spaceId, spaceId), eq(item.reviewState, "ai_suggestion")),
    orderBy: (fields, { asc }) => [asc(fields.createdAt)],
  });

  return (
    <>
      <h1 className={styles.title}>{t("home.reviewCta", locale)}</h1>
      {items.length === 0 ? (
        <p className={styles.empty}>{t("home.emptyTitle", locale)}</p>
      ) : (
        <ReviewClient
          locale={locale}
          items={items.map((row) => ({ id: row.id, title: row.title, body: row.body }))}
        />
      )}
    </>
  );
}
