import { getCurrentContext } from "@/src/app-shell/current";
import { db } from "@/src/db";
import { listModerationContributions } from "@/src/memorial/service";
import { t } from "@/src/i18n/t";
import { ModerationClient } from "./moderation-client";
import styles from "../memorial.module.css";

export default async function ModerationPage() {
  const context = await getCurrentContext();
  if (!context || context.role !== "steward") return null;

  const pending = await listModerationContributions(db, { spaceId: context.spaceId, status: "pending" });

  return (
    <>
      <h1 className={styles.title}>Moderation</h1>
      {pending.length === 0 ? (
        <p>{t("home.emptyTitle", context.locale)}</p>
      ) : (
        <ModerationClient
          spaceId={context.spaceId}
          items={pending.map((row) => ({
            id: row.id,
            displayName: row.displayName,
            relationship: row.relationship,
            textContent: row.textContent,
            photoBlobPathname: row.photoBlobPathname,
          }))}
        />
      )}
    </>
  );
}
