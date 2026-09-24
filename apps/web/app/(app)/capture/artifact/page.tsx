import { getCurrentContext } from "@/src/app-shell/current";
import { ArtifactClient } from "./artifact-client";

export default async function ArtifactPage() {
  const context = await getCurrentContext();
  if (!context) return null;

  return <ArtifactClient spaceId={context.spaceId} locale={context.locale} />;
}
