"use client";

import { useRef, useState } from "react";
import type { Locale } from "@gunita/core";

import { t } from "@/src/i18n/t";
import styles from "@/src/components/public-memorial/public-memorial.module.css";

export function ShareClient({ token, locale }: { token: string; locale: Locale }) {
  const photoRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!displayName.trim()) return setError(t("memorialPublic.nameRequired", locale));
    const photo = photoRef.current?.files?.[0];
    if (!text.trim() && !photo) return setError(t("memorialPublic.needOneOfThree", locale));

    setStatus("submitting");
    setError(null);
    const form = new FormData();
    form.set("displayName", displayName.trim());
    form.set("relationship", relationship.trim());
    if (text.trim()) form.set("text", text.trim());
    if (photo) form.set("photo", photo);

    const response = await fetch(`/api/m/${token}/contributions`, { method: "POST", body: form });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setStatus("error");
      setError(body.error === "rate_limited" ? t("memorialPublic.rateLimited", locale) : t("memorialPublic.submitFailed", locale));
      return;
    }
    setStatus("done");
  }

  if (status === "done") {
    return (
      <div className={styles.unavailable}>
        <h1>{t("memorialPublic.thanksTitle", locale)}</h1>
        <p>{t("memorialPublic.thanksBody", locale)}</p>
      </div>
    );
  }

  return (
    <div className={styles.entrySection} style={{ textAlign: "left" }}>
      <h1>{t("memorialPublic.shareTitle", locale)}</h1>
      <p>{t("memorialPublic.reviewNotice", locale)}</p>

      <form onSubmit={onSubmit}>
        <label>{t("memorialPublic.yourName", locale)}</label>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={inputStyle} />

        <label>{t("memorialPublic.yourRelationship", locale)}</label>
        <input value={relationship} onChange={(e) => setRelationship(e.target.value)} style={inputStyle} />

        <label>{t("memorialPublic.textMemory", locale)}</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("memorialPublic.textPlaceholder", locale)}
          style={{ ...inputStyle, minHeight: "6rem" }}
        />

        <label>{t("memorialPublic.photoAdd", locale)}</label>
        <input ref={photoRef} type="file" accept="image/*" style={inputStyle} />

        {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

        <button type="submit" className={styles.shareCta} disabled={status === "submitting"} style={{ border: 0, width: "100%" }}>
          {status === "submitting" ? t("memorialPublic.submitting", locale) : t("memorialPublic.submitMemory", locale)}
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem 1rem",
  borderRadius: "0.75rem",
  border: "1px solid var(--color-border-strong)",
  background: "var(--color-bg-alt)",
  marginBottom: "0.75rem",
  display: "block",
};
