import { and, eq } from "drizzle-orm";

import { getCurrentContext } from "@/src/app-shell/current";
import { db } from "@/src/db";
import { question } from "@/src/db/schema";
import { InterviewClient } from "./interview-client";

export default async function InterviewPage() {
  const context = await getCurrentContext();
  if (!context) return null;

  const queued = await db.query.question.findMany({
    where: and(eq(question.spaceId, context.spaceId), eq(question.status, "queued")),
    orderBy: (fields, { asc }) => [asc(fields.createdAt)],
  });

  const questions =
    queued.length > 0
      ? queued.map((row) => ({ id: row.id, text: row.text }))
      : [{ id: null, text: "Ikwento mo ang isang alaala na hindi mo pa naibabahagi." }];

  return <InterviewClient spaceId={context.spaceId} locale={context.locale} questions={questions} />;
}
