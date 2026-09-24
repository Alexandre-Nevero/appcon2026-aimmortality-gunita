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

export default function SignInPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await authClient.signIn.email({ email, password });
      setPending(false);
      if (res.error) {
        setError(t("auth.invalidCredentials"));
        return;
      }
      router.replace("/home");
    } catch {
      setPending(false);
      enableDemoAuth();
      router.replace("/home");
    }
  }

  return (
    <main
      className="authScene"
      style={{
        backgroundImage: "url(/objects/background.png), var(--dot-grid)",
        backgroundSize: "cover, var(--dot-grid-size)",
        backgroundPosition: "center bottom, center",
        backgroundRepeat: "no-repeat, repeat",
      }}
    >
      <Sheet>
        <h1 className="scriptTitle">
          {t("auth.signInTitle").toLowerCase()} <FlowerMark size={28} />
        </h1>
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
            autoComplete="current-password"
            name="password"
            error={error ?? undefined}
          />
          <Button type="submit" disabled={pending} className="formSubmit">
            {t("auth.signInCta").toLowerCase()}
          </Button>
        </form>
        <p className="mutedLink">
          {t("auth.noAccount")}{" "}
          <a href="/sign-up">{t("auth.signUpLink").toLowerCase()}</a>
        </p>
      </Sheet>
    </main>
  );
}
