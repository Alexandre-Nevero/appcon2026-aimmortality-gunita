import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { MemoriesFeed } from "@/src/components/memories/memories-feed";
import { loadPublicMemorial } from "@/src/components/public-memorial/data";
import { db } from "@/src/db";
import {
  DEMO_TRIBUTES_COOKIE,
  listDemoPhotoMemories,
  parseDemoTributes,
} from "@/src/memories/demo";
import { listPhotoMemories } from "@/src/memories/queries";
import { hashVisitorId, isVisitorId, VISITOR_COOKIE } from "@/src/memories/visitor";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PhotoMemoriesPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const memorial = await loadPublicMemorial(token);
  if (!memorial) notFound();

  const cookieStore = await cookies();
  const demoMemories = listDemoPhotoMemories(
    token,
    parseDemoTributes(cookieStore.get(DEMO_TRIBUTES_COOKIE)?.value),
  );
  const visitorId = cookieStore.get(VISITOR_COOKIE)?.value;
  const memories =
    demoMemories ??
    (await listPhotoMemories(
      db,
      memorial.spaceId,
      isVisitorId(visitorId) ? hashVisitorId(visitorId) : null,
    ));
  return (
    <MemoriesFeed
      token={token}
      locale={memorial.locale}
      featuredName={memorial.featuredName}
      memories={memories}
    />
  );
}
