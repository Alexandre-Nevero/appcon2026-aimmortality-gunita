import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { MemoriesFeed } from "@/src/components/memories/memories-feed";
import { db } from "@/src/db";
import { findPublicMemorial, listPhotoMemories } from "@/src/memories/queries";
import { hashVisitorId, isVisitorId, VISITOR_COOKIE } from "@/src/memories/visitor";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PhotoMemoriesPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const memorial = await findPublicMemorial(db, token);
  // Renders S-034 once TASK-019 adds app/m/[token]/not-found.tsx; Next's 404 (noindex) until then.
  if (!memorial) notFound();

  const visitorId = (await cookies()).get(VISITOR_COOKIE)?.value;
  const memories = await listPhotoMemories(
    db,
    memorial.spaceId,
    isVisitorId(visitorId) ? hashVisitorId(visitorId) : null,
  );
  return (
    <MemoriesFeed
      token={token}
      locale={memorial.locale}
      featuredName={memorial.featuredName}
      memories={memories}
    />
  );
}
