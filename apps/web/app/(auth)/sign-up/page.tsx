"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { t } from "@/src/i18n/t";
import styles from "../auth.module.css";

const locale = "fil" as const;

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) return setError(t("onboarding.nameRequired", locale));
    if (!email.trim()) return setError(t("auth.emailRequired", locale));
    if (!password) return setError(t("auth.passwordRequired", locale));

    setPending(true);
    try {
      const response = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          inviteCode: inviteCode.trim() || undefined,
        }),
      });

      if (!response.ok) {
        setError(inviteCode.trim() ? t("auth.invalidInvite", locale) : t("common.errorGeneric", locale));
        return;
      }

      router.push(inviteCode.trim() ? "/home" : "/onboarding/space");
      router.refresh();
    } catch {
      setError(t("common.errorGeneric", locale));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.card}>
      <p className={styles.brand}>Himmel</p>
      <h1 className={styles.title}>{t("auth.signUpTitle", locale)}</h1>
      <p className={styles.subtitle}>{t("auth.signUpSubtitle", locale)}</p>

      <form onSubmit={onSubmit}>
        <label className={styles.field} htmlFor="name">
          Name
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          className={styles.input}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <label className={styles.field} htmlFor="email">
          {t("auth.email", locale)}
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className={styles.input}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <label className={styles.field} htmlFor="password">
          {t("auth.password", locale)}
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          className={styles.input}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <label className={styles.field} htmlFor="inviteCode">
          {t("auth.inviteCode", locale)}
        </label>
        <input
          id="inviteCode"
          type="text"
          className={styles.input}
          value={inviteCode}
          onChange={(event) => setInviteCode(event.target.value)}
        />
        <p className={styles.hint}>{t("auth.inviteCodeHint", locale)}</p>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.primary} disabled={pending}>
          {pending ? t("common.working", locale) : t("auth.signUpCta", locale)}
        </button>
      </form>

      <p className={styles.switch}>
        {t("auth.hasAccount", locale)} <Link href="/sign-in">{t("auth.signInLink", locale)}</Link>
      </p>
    </div>
  );
}
