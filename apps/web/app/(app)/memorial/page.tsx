import { getCurrentContext } from "@/src/app-shell/current";
import { MemorialClient } from "./memorial-client";

export default async function MemorialPage() {
  const context = await getCurrentContext();
  if (!context || context.role !== "steward") return null;

  return (
    <MemorialClient
      spaceId={context.spaceId}
      locale={context.locale}
      featuredName={context.featuredName}
      lifecycleMode={context.lifecycleMode}
    />
  );
}
