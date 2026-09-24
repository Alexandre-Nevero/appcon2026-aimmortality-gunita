"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { authClient } from "@/src/auth/client";
import { useI18n } from "@/src/i18n/provider";
import { FlowerMark } from "@/src/components/ui/FlowerMark";
import { isDemoAuthenticated } from "@/src/mocks/demo-path";

export default function SplashPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const goNext = useCallback(() => {
    if (session?.user || isDemoAuthenticated()) {
      router.replace("/home");
    } else {
      router.replace("/sign-in");
    }
  }, [router, session?.user]);

  useEffect(() => {
    if (isPending) return;
    if (session?.user || isDemoAuthenticated()) {
      router.replace("/home");
      return;
    }
    const timer = window.setTimeout(() => router.replace("/sign-in"), 1200);
    return () => window.clearTimeout(timer);
  }, [isPending, router, session?.user]);

  if (isPending) {
    return <main className="splashScene" aria-busy="true" />;
  }

  if (session?.user || isDemoAuthenticated()) {
    return null;
  }

  return (
    <main className="splashScene">
      <button type="button" className="splashTap" onClick={goNext} aria-label={t("common.continue")}>
        <FlowerMark size={64} />
        <span className="splashBrand">Himmel</span>
        <span className="splashTagline">{t("app.tagline")}</span>
      </button>
    </main>
  );
}
