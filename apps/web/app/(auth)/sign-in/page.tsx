"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { t } from "@/src/i18n/t";
import styles from "../auth.module.css";

const locale = "fil" as const;

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!email.trim()) return setError(t("auth.emailRequired", locale));
    if (!password) return setError(t("auth.passwordRequired", locale));

    setPending(true);
    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!response.ok) {
        setError(t("auth.invalidCredentials", locale));
        return;
      }

      router.push("/home");
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
      <h1 className={styles.title}>{t("auth.signInTitle", locale)}</h1>
      <p className={styles.subtitle}>{t("auth.signInSubtitle", locale)}</p>

      <form onSubmit={onSubmit}>
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
          autoComplete="current-password"
          className={styles.input}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.primary} disabled={pending}>
          {pending ? t("common.working", locale) : t("auth.signInCta", locale)}
        </button>
      </form>

      <p className={styles.switch}>
        {t("auth.noAccount", locale)} <Link href="/sign-up">{t("auth.signUpLink", locale)}</Link>
      </p>
    </div>
  );
}
