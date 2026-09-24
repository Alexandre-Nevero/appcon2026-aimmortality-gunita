"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@gunita/core";

import { createBrowserRecorder, type BrowserRecorder, type RecordingResult } from "@/src/recording";
import { t } from "@/src/i18n/t";
import styles from "./interview.module.css";

interface Question {
  id: string | null;
  text: string;
}

export function InterviewClient({
  spaceId,
  locale,
  questions,
}: {
  spaceId: string;
  locale: Locale;
  questions: Question[];
}) {
  const router = useRouter();
  const recorderRef = useRef<BrowserRecorder | null>(null);
  const [index, setIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const current = questions[index];
  const progress = ((index + (done ? 1 : 0)) / questions.length) * 100;

  function getRecorder(): BrowserRecorder {
    if (!recorderRef.current) recorderRef.current = createBrowserRecorder();
    return recorderRef.current;
  }

  async function toggleRecord() {
    setError(null);
    const recorder = getRecorder();

    if (!recording) {
      try {
        await recorder.start();
        setRecording(true);
      } catch {
        setError(t("common.errorGeneric", locale));
      }
      return;
    }

    setRecording(false);
    setUploading(true);
    try {
      const result: RecordingResult = await recorder.stop();
      await submit(result);
    } catch {
      setError(t("common.errorGeneric", locale));
    } finally {
      setUploading(false);
    }
  }

  async function submit(result: RecordingResult) {
    const extension = result.mimeType.includes("mp4") ? "mp4" : "webm";
    const file = new File([result.blob], `interview-${Date.now()}.${extension}`, { type: result.mimeType });
    const form = new FormData();
    form.set("file", file);
    form.set("origin", "from_them");

    const response = await fetch(`/api/spaces/${spaceId}/sources`, { method: "POST", body: form });
    if (!response.ok) {
      setError(t("capture.uploadFailed", locale));
      return;
    }

    if (current.id) {
      await fetch(`/api/spaces/${spaceId}/questions`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId: current.id, status: "answered" }),
      }).catch(() => {});
    }

    if (index + 1 < questions.length) {
      setIndex(index + 1);
    } else {
      setDone(true);
    }
  }

  function skip() {
    if (index + 1 < questions.length) setIndex(index + 1);
    else setDone(true);
  }

  if (done) {
    return (
      <div className={styles.center}>
        <h1>{t("common.done", locale)}</h1>
        <p className={styles.hint}>{t("capture.processing", locale)}</p>
        <button type="button" className={styles.secondary} onClick={() => router.push("/capture")}>
          {t("common.back", locale)}
        </button>
      </div>
    );
  }

  return (
    <>
      <button type="button" className={styles.back} onClick={() => router.push("/capture")}>
        ← {t("tabs.capture", locale)}
      </button>

      <p className={styles.hint}>{t("capture.questionOf", locale, { current: index + 1, total: questions.length })}</p>
      <div className={styles.progress}>
        <div className={styles.progressBar} style={{ width: `${progress}%` }} />
      </div>

      <div className={styles.questionCard}>
        <p className={styles.eyebrow}>{t("capture.interviewTitle", locale)}</p>
        <h1 className={styles.questionText}>{current.text}</h1>
      </div>

      <div className={styles.center}>
        <button
          type="button"
          className={styles.recordButton}
          data-recording={recording}
          onClick={toggleRecord}
          disabled={uploading}
          aria-label={recording ? t("common.stop", locale) : t("common.record", locale)}
        >
          {recording ? "■" : "●"}
        </button>
        <p className={styles.hint}>
          {uploading ? t("capture.uploading", locale) : recording ? t("capture.recording", locale) : t("capture.recordingHint", locale)}
        </p>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.controls}>
        <button type="button" className={styles.link} onClick={skip}>
          {t("capture.skipQuestion", locale)} →
        </button>
      </div>
    </>
  );
}
