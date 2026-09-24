"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/src/auth/client";
import { useI18n } from "@/src/i18n/provider";
import { Sheet } from "@/src/components/ui/Sheet";
import { Field } from "@/src/components/ui/Field";
import { Button } from "@/src/components/ui/Button";
import { FlowerMark } from "@/src/components/ui/FlowerMark";
import { enableDemoAuth } from "@/src/mocks/demo-path";

const INVITE_KEY = "himmel.pendingInvite";

export default function SignUpPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    if (inviteCode.trim()) {
      sessionStorage.setItem(INVITE_KEY, inviteCode.trim());
    }
    const name = email.split("@")[0]?.trim() || "Family";
    try {
      const res = await authClient.signUp.email({ email, password, name });
      setPending(false);
      if (res.error) {
        setError(t("auth.invalidCredentials"));
        return;
      }
      router.replace("/onboarding/space");
    } catch {
      setPending(false);
      enableDemoAuth();
      router.replace("/onboarding/space");
    }
  }

  return (
    <main className="authScene" style={{ backgroundImage: "url(/auth-bg.jpg)" }}>
      <Sheet>
        <h1 className="scriptTitle">
          {t("auth.signUpTitle").toLowerCase()} <FlowerMark size={28} />
        </h1>
        <p className="authSubtitle">{t("auth.signUpSubtitle")}</p>
        <form className="authForm" onSubmit={onSubmit}>
          <Field
            label={t("auth.email").toLowerCase()}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            name="email"
          />
          <Field
            label={t("auth.password").toLowerCase()}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
            name="password"
            error={error ?? undefined}
          />
          <Field
            label={t("auth.inviteCode").toLowerCase()}
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            name="invite"
          />
          <p className="fieldHint">{t("auth.inviteCodeHint")}</p>
          <Button type="submit" disabled={pending} className="formSubmit">
            {t("auth.signUpCta").toLowerCase()}
          </Button>
        </form>
        <p className="mutedLink">
          {t("auth.hasAccount")}{" "}
          <a href="/sign-in">{t("auth.signInLink").toLowerCase()}</a>
        </p>
      </Sheet>
    </main>
  );
}
