import { notFound } from "next/navigation";

import { PublicMemorialRecap } from "@/src/components/public-memorial/recap";
import { loadPublicMemorial } from "@/src/components/public-memorial/data";

export default async function PublicMemorialPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const memorial = await loadPublicMemorial(token);
  if (!memorial) notFound();
  return <PublicMemorialRecap token={token} memorial={memorial} />;
}
