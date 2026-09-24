"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackHeader } from "@/src/components/ui/BackHeader";
import { Button } from "@/src/components/ui/Button";
import { useI18n } from "@/src/i18n/provider";
import { demoSpaceId } from "@/src/mocks/demo-path";
import {
  MAX_UPLOAD_BYTES,
  sourceTypeFromMime,
  validateUpload,
} from "@/src/media/validate";
import styles from "./artifact-form.module.css";

export function ArtifactForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [context, setContext] = useState("");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validateFile(next: File): string | null {
    const sourceType = sourceTypeFromMime(next.type);
    if (!sourceType || sourceType === "audio") {
      return t("capture.artifactTypeUnsupported");
    }
    const err = validateUpload({
      sourceType,
      mimeType: next.type,
      byteSize: next.size,
    });
    if (err?.code === "too_large") return t("capture.artifactTooLarge");
    if (err) return t("capture.artifactTypeUnsupported");
    if (next.size > MAX_UPLOAD_BYTES) return t("capture.artifactTooLarge");
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError(t("common.required"));
      return;
    }
    const validation = validateFile(file);
    if (validation) {
      setError(validation);
      return;
    }
    setPending(true);
    setError(null);
    const form = new FormData();
    form.set("file", file);
    form.set("origin", "about_them");
    const note = context.trim();
    if (note) {
      form.set("artifactContext", JSON.stringify({ note }));
    }
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
        title={t("capture.artifactTitle").toLowerCase()}
        backLabel={t("common.back").toLowerCase()}
        onBack={() => router.push("/capture")}
      />
      <p className={styles.hint}>{t("capture.artifactHint")}</p>
      {saved ? (
        <p className={styles.status} role="status">
          {t("capture.memorySaved")}
        </p>
      ) : (
        <form className={styles.form} onSubmit={(e) => void onSubmit(e)}>
          <label className={styles.fileLabel}>
            {t("capture.artifactPick").toLowerCase()}
            <input
              className={styles.fileInput}
              type="file"
              accept="image/jpeg,image/png,image/heic,application/pdf"
              onChange={(e) => {
                const next = e.target.files?.[0] ?? null;
                setFile(next);
                setError(next ? validateFile(next) : null);
              }}
            />
          </label>
          <label className={styles.contextLabel}>
            {t("capture.artifactContext").toLowerCase()}
            <textarea
              className={styles.contextInput}
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </label>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending || !file}>
            {pending ? t("capture.uploading").toLowerCase() : t("common.save").toLowerCase()}
          </Button>
        </form>
      )}
    </main>
  );
}
