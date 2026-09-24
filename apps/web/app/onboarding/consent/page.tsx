"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/src/i18n/provider";
import { Sheet } from "@/src/components/ui/Sheet";
import { Button } from "@/src/components/ui/Button";
import { FlowerMark } from "@/src/components/ui/FlowerMark";
import {
  demoSpaceId,
  markDemoConsentSaved,
  setDemoOfflineBanner,
} from "@/src/mocks/demo-path";

export default function OnboardingConsentPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [evidenceText, setEvidenceText] = useState("");
  const [aiProcessingAllowed, setAiProcessingAllowed] = useState(false);
  const [familyDefault, setFamilyDefault] = useState(false);
  const [memorialUseAllowed, setMemorialUseAllowed] = useState(false);
  const [voiceClipsAllowed, setVoiceClipsAllowed] = useState(false);
  const [stewardAttestation, setStewardAttestation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = evidenceText.trim();
    if (!text) {
      setError(t("onboarding.consentRequired"));
      return;
    }
    if (!stewardAttestation) {
      setError(t("onboarding.consentRequired"));
      return;
    }
    setPending(true);
    setError(null);
    const spaceId = demoSpaceId();
    const body = {
      evidenceType: "written" as const,
      evidenceText: text,
      aiProcessingAllowed,
      memorialUseAllowed,
      voiceClipsAllowed,
      stewardAttestation,
      participationApproved: true,
      familyVisibilityDefault: familyDefault ? ("family" as const) : ("private" as const),
    };
    try {
      const res = await fetch(`/api/spaces/${spaceId}/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("consent_failed");
      markDemoConsentSaved();
      setDemoOfflineBanner(false);
      router.replace("/home");
    } catch {
      markDemoConsentSaved();
      setDemoOfflineBanner(true);
      router.replace("/home");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="authScene onboardingScene">
      <Sheet>
        <h1 className="scriptTitle">
          {t("onboarding.consentTitle").toLowerCase()} <FlowerMark size={28} />
        </h1>
        <p className="authSubtitle">{t("onboarding.consentSubtitle")}</p>
        <form className="authForm consentForm" onSubmit={onSubmit}>
          <label className="consentLabel">{t("onboarding.consentWritten").toLowerCase()}</label>
          <textarea
            className="consentTextarea"
            value={evidenceText}
            onChange={(e) => setEvidenceText(e.target.value)}
            placeholder={t("onboarding.consentWrittenPlaceholder")}
            rows={4}
          />
          <p className="choicesHeading">{t("onboarding.consentChoicesHeading")}</p>
          <label className="checkRow">
            <input
              type="checkbox"
              checked={aiProcessingAllowed}
              onChange={(e) => setAiProcessingAllowed(e.target.checked)}
            />
            {t("onboarding.consentAi")}
          </label>
          <label className="checkRow">
            <input
              type="checkbox"
              checked={familyDefault}
              onChange={(e) => setFamilyDefault(e.target.checked)}
            />
            {t("onboarding.consentFamilyDefault")}
          </label>
          <label className="checkRow">
            <input
              type="checkbox"
              checked={memorialUseAllowed}
              onChange={(e) => setMemorialUseAllowed(e.target.checked)}
            />
            {t("onboarding.consentMemorial")}
          </label>
          <label className="checkRow">
            <input
              type="checkbox"
              checked={voiceClipsAllowed}
              onChange={(e) => setVoiceClipsAllowed(e.target.checked)}
            />
            {t("onboarding.consentVoiceClips")}
          </label>
          <label className="checkRow">
            <input
              type="checkbox"
              checked={stewardAttestation}
              onChange={(e) => setStewardAttestation(e.target.checked)}
            />
            {t("onboarding.stewardAttestation")}
          </label>
          {error ? (
            <p className="formError" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="formSubmit">
            {t("onboarding.consentSave").toLowerCase()}
          </Button>
        </form>
        <p className="mutedLink">
          <Link href="/onboarding/space">{t("common.back").toLowerCase()}</Link>
        </p>
      </Sheet>
    </main>
  );
}
