import { getCurrentContext } from "@/src/app-shell/current";
import { AskClient } from "./ask-client";

export default async function AskPage() {
  const context = await getCurrentContext();
  if (!context) return null;

  return <AskClient spaceId={context.spaceId} locale={context.locale} featuredName={context.featuredName} />;
}
