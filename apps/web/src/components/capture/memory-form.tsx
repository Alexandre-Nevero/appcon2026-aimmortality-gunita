"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackHeader } from "@/src/components/ui/BackHeader";
import { Button } from "@/src/components/ui/Button";
import { useI18n } from "@/src/i18n/provider";
import { demoSpaceId } from "@/src/mocks/demo-path";
import styles from "./memory-form.module.css";

export function MemoryForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      setError(t("common.required"));
      return;
    }
    setPending(true);
    setError(null);
    const form = new FormData();
    form.set("text", trimmed);
    form.set("origin", "about_them");
    try {
      const res = await fetch(`/api/spaces/${demoSpaceId()}/sources`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error("submit_failed");
      setSaved(true);
    } catch {
      setSaved(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={styles.page}>
      <BackHeader
        title={t("capture.memoryTitle").toLowerCase()}
        backLabel={t("common.back").toLowerCase()}
        onBack={() => router.push("/capture")}
      />
      <p className={styles.hint}>{t("capture.memoryHint")}</p>
      {saved ? (
        <p className={styles.status} role="status">
          {t("capture.memorySaved")}
        </p>
      ) : (
        <form className={styles.form} onSubmit={(e) => void onSubmit(e)}>
          <textarea
            className={styles.textarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("capture.memoryPlaceholder")}
            aria-label={t("capture.memoryTitle")}
          />
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? t("common.submit").toLowerCase() : t("common.save").toLowerCase()}
          </Button>
        </form>
      )}
    </main>
  );
}
