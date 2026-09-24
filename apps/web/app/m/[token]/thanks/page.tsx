import { notFound } from "next/navigation";

import { loadPublicMemorial } from "@/src/components/public-memorial/data";
import { ThanksScreen } from "@/src/components/public-memorial/thanks";

export default async function ThanksPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const memorial = await loadPublicMemorial(token);
  if (!memorial) notFound();
  return <ThanksScreen locale={memorial.locale} />;
}
