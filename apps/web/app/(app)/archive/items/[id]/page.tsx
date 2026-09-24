import { ArchiveItemDetail } from "@/src/components/archive/item-detail";

export default async function ArchiveItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ArchiveItemDetail itemId={id} />;
}
