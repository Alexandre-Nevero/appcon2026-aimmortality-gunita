import { notFound } from "next/navigation";

import { loadPublicMemorial } from "@/src/components/public-memorial/data";
import { ShareMemoryForm } from "@/src/components/public-memorial/share-form";

export default async function ShareMemoryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const memorial = await loadPublicMemorial(token);
  if (!memorial) notFound();
  return <ShareMemoryForm token={token} locale={memorial.locale} />;
}
