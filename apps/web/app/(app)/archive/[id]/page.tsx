import { and, asc, eq, isNotNull } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { archiveReviewStateFilter, visibilityFilter } from "@/src/access/visibility";
import { getCurrentContext } from "@/src/app-shell/current";
import { db } from "@/src/db";
import { item, recipeStep, source, sourceSegment } from "@/src/db/schema";
import { t } from "@/src/i18n/t";
import { ProvenanceBadges } from "@/src/components/badges";
import styles from "./item.module.css";

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getCurrentContext();
  if (!context) return null;
  const { locale, spaceId, role } = context;

  // BR-033: visibility checked in the query itself, not after — a direct URL to an item above this
  // viewer's access level 404s, same as if it didn't exist.
  const row = await db.query.item.findFirst({
    where: and(
      eq(item.id, id),
      eq(item.spaceId, spaceId),
      archiveReviewStateFilter(),
      isNotNull(item.visibility),
      visibilityFilter(role),
    ),
  });
  if (!row) notFound();

  const [sourceRow, steps, segments] = await Promise.all([
    db.query.source.findFirst({ where: eq(source.id, row.sourceId) }),
    db.query.recipeStep.findMany({ where: eq(recipeStep.itemId, row.id), orderBy: asc(recipeStep.index) }),
    db.query.sourceSegment.findMany({ where: eq(sourceSegment.sourceId, row.sourceId), orderBy: asc(sourceSegment.index) }),
  ]);

  const segmentText = new Map(segments.map((segment) => [segment.id, segment.text]));

  return (
    <>
      <Link href="/archive" className={styles.back}>
        ← {t("tabs.archive", locale)}
      </Link>
      <h1 className={styles.title}>{row.title}</h1>
      <ProvenanceBadges origin={row.origin} reviewState={row.reviewState} visibility={row.visibility} locale={locale} />
      <p className={styles.body}>{row.body}</p>

      {steps.length > 0 && (
        <div className={styles.section}>
          {steps.map((step) => (
            <div key={step.id} className={styles.step}>
              <span className={`${styles.stepKind} ${step.kind === "measured" ? styles.measured : styles.judgement}`}>
                {t(step.kind === "measured" ? "badges.measured" : "badges.byJudgement", locale)}
              </span>
              <p>
                {step.quantityVerbatim && <span className={styles.quantity}>{step.quantityVerbatim} — </span>}
                {step.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {row.disputeNote && (
        <div className={styles.section}>
          <p className={styles.source}>{row.disputeNote}</p>
        </div>
      )}

      {sourceRow && Array.isArray(row.segmentIds) && row.segmentIds.length > 0 && (
        <div className={styles.section}>
          <p className={styles.source}>
            &ldquo;
            {row.segmentIds
              .filter((segmentId): segmentId is string => typeof segmentId === "string")
              .map((segmentId) => segmentText.get(segmentId))
              .filter(Boolean)
              .join(" ")}
            &rdquo;
          </p>
        </div>
      )}
    </>
  );
}
