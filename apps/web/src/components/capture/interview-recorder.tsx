"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { BackHeader } from "@/src/components/ui/BackHeader";
import { useI18n } from "@/src/i18n/provider";
import { fixtures } from "@/src/mocks/fixtures";
import { demoSpaceId, readDemoSpace } from "@/src/mocks/demo-path";
import {
  createBrowserRecorder,
  isRecordingError,
  type BrowserRecorder,
} from "@/src/recording";
import styles from "./interview-recorder.module.css";

type Phase = "idle" | "recording" | "uploading" | "saved";

export function InterviewRecorder() {
  const { t } = useI18n();
  const router = useRouter();
  const questions = fixtures.interviewQuestions;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [savedBlob, setSavedBlob] = useState<Blob | null>(null);
  const recorderRef = useRef<BrowserRecorder | null>(null);
  const stubRecordingRef = useRef(false);

  const space = useMemo(() => readDemoSpace(), []);
  const total = questions.length;
  const current = index + 1;

  const ensureRecorder = useCallback(() => {
    if (!recorderRef.current) {
      recorderRef.current = createBrowserRecorder();
    }
    return recorderRef.current;
  }, []);

  async function uploadRecording(blob: Blob, mimeType: string) {
    const spaceId = demoSpaceId();
    const ext = mimeType.includes("mp4") ? "m4a" : "webm";
    const file = new File([blob], `interview-${Date.now()}.${ext}`, { type: mimeType || "audio/webm" });
    const form = new FormData();
    form.set("file", file);
    form.set("origin", "from_them");
    const res = await fetch(`/api/spaces/${spaceId}/sources`, { method: "POST", body: form });
    if (!res.ok) throw new Error("upload_failed");
  }

  async function onRecordTap() {
    setError(null);
    if (phase === "uploading") return;

    if (phase === "recording" || stubRecordingRef.current) {
      setPhase("uploading");
      try {
        let blob: Blob;
        if (stubRecordingRef.current) {
          stubRecordingRef.current = false;
          blob = savedBlob ?? new Blob(["demo-audio"], { type: "audio/webm" });
        } else {
          const recorder = recorderRef.current;
          if (!recorder) throw new Error("no_recorder");
          const result = await recorder.stop();
          blob = result.blob;
          setSavedBlob(blob);
        }
        try {
          await uploadRecording(blob, blob.type || "audio/webm");
        } catch {
          setSavedBlob(blob);
        }
        setPhase("saved");
      } catch (e) {
        if (isRecordingError(e) && e.code === "PERMISSION_DENIED") {
          setError(t("capture.micPermissionDenied"));
        } else {
          setError(t("capture.uploadFailed"));
        }
        setPhase("idle");
      }
      return;
    }

    try {
      const recorder = ensureRecorder();
      await recorder.start();
      setPhase("recording");
    } catch {
      stubRecordingRef.current = true;
      setSavedBlob(new Blob(["demo-audio"], { type: "audio/webm" }));
      setPhase("recording");
    }
  }

  function onReRecord() {
    recorderRef.current?.cancel();
    recorderRef.current = null;
    stubRecordingRef.current = false;
    setSavedBlob(null);
    setPhase("idle");
    setError(null);
  }

  function onSkip() {
    onReRecord();
    if (index < total - 1) {
      setIndex((i) => i + 1);
    } else {
      router.push("/capture");
    }
  }

  function onContinueAfterSave() {
    onReRecord();
    if (index < total - 1) {
      setIndex((i) => i + 1);
    } else {
      router.push("/capture");
    }
  }

  const recording = phase === "recording";
  const recordLabel = recording ? t("common.stop").toLowerCase() : t("common.record").toLowerCase();

  if (!space.consentSaved) {
    return (
      <main className={styles.page}>
        <BackHeader
          title={t("capture.interviewTitle").toLowerCase()}
          backLabel={t("common.back").toLowerCase()}
          onBack={() => router.push("/capture")}
        />
        <p className={styles.hint} role="status">
          {t("capture.consentBlocked")}
        </p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <BackHeader
        title={t("capture.interviewTitle").toLowerCase()}
        backLabel={t("common.back").toLowerCase()}
        onBack={() => router.push("/capture")}
      />
      <p className={styles.hint}>{t("capture.interviewHint")}</p>

      <div className={styles.progress} aria-hidden={total <= 1}>
        {questions.map((_, i) => (
          <span
            key={i}
            className={[styles.dot, i === index ? styles.dotActive : ""].filter(Boolean).join(" ")}
          />
        ))}
      </div>

      <article className={styles.questionCard}>
        <p className={styles.questionMeta}>
          {t("capture.questionOf", { current, total }).toLowerCase()}
        </p>
        <p>{questions[index]}</p>
      </article>

      <div className={styles.waveform} aria-hidden>
        {Array.from({ length: 12 }, (_, i) => (
          <span
            key={i}
            className={[styles.bar, recording ? styles.barLive : ""].filter(Boolean).join(" ")}
          />
        ))}
      </div>

      {phase === "saved" ? (
        <p className={styles.status} role="status">
          {t("capture.memorySaved")}
        </p>
      ) : (
        <div className={styles.recordWrap}>
          <button
            type="button"
            className={[styles.recordBtn, recording ? styles.recordBtnRecording : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={() => void onRecordTap()}
            disabled={phase === "uploading"}
            aria-pressed={recording}
          >
            {phase === "uploading" ? t("capture.uploading").toLowerCase() : recordLabel}
          </button>
        </div>
      )}

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.actions}>
        {phase === "saved" ? (
          <button type="button" className={styles.linkBtn} onClick={onContinueAfterSave}>
            {t("common.continue").toLowerCase()}
          </button>
        ) : (
          <>
            <button type="button" className={styles.linkBtn} onClick={onSkip}>
              {t("capture.skipQuestion").toLowerCase()}
            </button>
            {(recording || savedBlob) && phase !== "uploading" ? (
              <button type="button" className={styles.linkBtn} onClick={onReRecord}>
                {t("common.reRecord").toLowerCase()}
              </button>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
