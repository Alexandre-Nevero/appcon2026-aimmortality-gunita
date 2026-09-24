"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/src/i18n/provider";
import type { Locale } from "@/src/i18n/dictionary";
import { Sheet } from "@/src/components/ui/Sheet";
import { Field } from "@/src/components/ui/Field";
import { Button } from "@/src/components/ui/Button";
import { FlowerMark } from "@/src/components/ui/FlowerMark";
import { saveDemoSpace, setDemoOfflineBanner } from "@/src/mocks/demo-path";

export default function OnboardingSpacePage() {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const [featuredPersonName, setFeaturedPersonName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = featuredPersonName.trim();
    if (!name) {
      setError(t("onboarding.nameRequired"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featuredPersonName: name, locale }),
      });
      if (!res.ok) throw new Error("space_create_failed");
      const data = (await res.json()) as { space?: { id?: string } };
      saveDemoSpace(name, data.space?.id);
      setDemoOfflineBanner(false);
      router.replace("/onboarding/consent");
    } catch {
      saveDemoSpace(name);
      setDemoOfflineBanner(true);
      router.replace("/onboarding/consent");
    } finally {
      setPending(false);
    }
  }

  function onLocaleChange(next: Locale) {
    setLocale(next);
  }

  return (
    <main className="authScene onboardingScene">
      <Sheet>
        <h1 className="scriptTitle">
          {t("onboarding.spaceTitle").toLowerCase()} <FlowerMark size={28} />
        </h1>
        <p className="authSubtitle">{t("onboarding.spaceSubtitle")}</p>
        <form className="authForm" onSubmit={onSubmit}>
          <Field
            label={t("onboarding.featuredPersonName").toLowerCase()}
            value={featuredPersonName}
            onChange={(e) => setFeaturedPersonName(e.target.value)}
            name="featuredPersonName"
          />
          <p className="fieldHint">{t("onboarding.featuredPersonHint")}</p>
          <fieldset className="localeFieldset">
            <legend className="localeLegend">{t("onboarding.uiLanguage").toLowerCase()}</legend>
            <label className="localeOption">
              <input
                type="radio"
                name="locale"
                checked={locale === "fil"}
                onChange={() => onLocaleChange("fil")}
              />
              {t("onboarding.uiLanguageFil")}
            </label>
            <label className="localeOption">
              <input
                type="radio"
                name="locale"
                checked={locale === "en"}
                onChange={() => onLocaleChange("en")}
              />
              {t("onboarding.uiLanguageEn")}
            </label>
            <p className="fieldHint">{t("onboarding.uiLanguageHint")}</p>
          </fieldset>
          {error ? (
            <p className="formError" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="formSubmit">
            {t("onboarding.createSpaceCta").toLowerCase()}
          </Button>
        </form>
      </Sheet>
    </main>
  );
}
