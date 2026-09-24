"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@gunita/core";

import { t } from "@/src/i18n/t";
import styles from "../capture.module.css";

type Status = "idle" | "uploading" | "processing" | "ready" | "failed";

export function ArtifactClient({ spaceId, locale }: { spaceId: string; locale: Locale }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [who, setWho] = useState("");
  const [when, setWhen] = useState("");
  const [where, setWhere] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [questions, setQuestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  }

  async function pollUntilDone(sourceId: string) {
    setStatus("processing");
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const response = await fetch(`/api/sources/${sourceId}`);
      const data = (await response.json()) as {
        status: Status;
        aiVisibleDescription?: { questions?: string[] } | null;
      };
      if (data.status === "ready") {
        setStatus("ready");
        setQuestions(data.aiVisibleDescription?.questions ?? []);
        return;
      }
      if (data.status === "failed") {
        setStatus("failed");
        setError(t("capture.processingFailed", locale));
        return;
      }
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setStatus("uploading");
    setError(null);
    const form = new FormData();
    form.set("file", file);
    if (who || when || where) {
      form.set("artifactContext", JSON.stringify({ who, when, where }));
    }

    try {
      const response = await fetch(`/api/spaces/${spaceId}/sources`, { method: "POST", body: form });
      if (!response.ok) {
        setStatus("failed");
        setError(t("common.errorGeneric", locale));
        return;
      }
      const { sourceId } = (await response.json()) as { sourceId: string };
      await pollUntilDone(sourceId);
    } catch {
      setStatus("failed");
      setError(t("common.errorGeneric", locale));
    }
  }

  return (
    <>
      <h1 className={styles.title}>{t("capture.artifactTitle", locale)}</h1>
      <p className={styles.subtitle}>{t("capture.artifactHint", locale)}</p>

      {status === "ready" ? (
        <>
          {preview && <img src={preview} alt="" style={{ width: "100%", borderRadius: "1rem", marginBottom: "1rem" }} />}
          <div className={styles.notice}>
            {questions.length > 0 ? (
              <>
                <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>{questions[0]}</p>
                <p>Record an answer in the Interview screen — Himmel never assigns identity, only asks.</p>
              </>
            ) : (
              <p>Saved for review.</p>
            )}
          </div>
          <button type="button" className={styles.action} onClick={() => router.push("/capture/interview")}>
            <span className={styles.icon}>◉</span>
            <span>
              <p className={styles.actionTitle}>{t("capture.startInterview", locale)}</p>
            </span>
          </button>
        </>
      ) : (
        <form onSubmit={onSubmit}>
          <label htmlFor="artifact-file" style={{ display: "block", marginBottom: "1rem" }}>
            {preview ? (
              <img src={preview} alt="" style={{ width: "100%", borderRadius: "1rem" }} />
            ) : (
              <span className={styles.action} style={{ justifyContent: "center" }}>
                {t("capture.artifactPick", locale)}
              </span>
            )}
          </label>
          <input id="artifact-file" ref={fileRef} type="file" accept="image/*,.pdf" onChange={onPick} hidden />

          <label>{t("capture.artifactContext", locale)}</label>
          <input placeholder="Sino ang nasa larawan?" value={who} onChange={(e) => setWho(e.target.value)} style={inputStyle} />
          <input placeholder="Kailan ito?" value={when} onChange={(e) => setWhen(e.target.value)} style={inputStyle} />
          <input placeholder="Saan ito?" value={where} onChange={(e) => setWhere(e.target.value)} style={inputStyle} />

          {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

          <button
            type="submit"
            className={styles.action}
            style={{ justifyContent: "center", background: "var(--color-primary)", color: "var(--color-primary-on)" }}
            disabled={status === "uploading" || status === "processing"}
          >
            {status === "uploading" && t("common.working", locale)}
            {status === "processing" && t("capture.processing", locale)}
            {status === "idle" && t("common.upload", locale)}
          </button>
        </form>
      )}
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem 1rem",
  borderRadius: "0.75rem",
  border: "1px solid var(--color-border-strong)",
  background: "var(--color-bg-alt)",
  marginBottom: "0.75rem",
};
