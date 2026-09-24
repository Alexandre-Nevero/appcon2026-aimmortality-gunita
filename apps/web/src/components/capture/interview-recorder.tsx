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

// Fixed bar heights (px) so the waveform reads as a voice line even before recording starts.
const WAVE = [14, 22, 30, 18, 44, 26, 58, 34, 20, 40, 28, 16, 36, 70, 88, 48, 64, 30, 76, 90, 60, 84, 40, 72, 54, 26];

export function InterviewRecorder() {
  const { t } = useI18n();
  const router = useRouter();
  const questions = fixtures.interviewQuestions;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [savedBlob, setSavedBlob] = useState<Blob | null>(null);
  // S-007 "edit question": local edits for this session only.
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
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

  function goBack() {
    // Reached from Home ("today's question") or the Capture hub; return to wherever that was.
    if (window.history.length > 1) router.back();
    else router.push("/capture");
  }

  function startEdit() {
    setDraft(edits[index] ?? questions[index]);
    setEditing(true);
  }

  function saveEdit() {
    const next = draft.trim();
    if (next) setEdits((prev) => ({ ...prev, [index]: next }));
    setEditing(false);
  }

  function onSkip() {
    setEditing(false);
    onReRecord();
    if (index < total - 1) {
      setIndex((i) => i + 1);
    } else {
      router.push("/capture");
    }
  }

  function onContinueAfterSave() {
    setEditing(false);
    onReRecord();
    if (index < total - 1) {
      setIndex((i) => i + 1);
    } else {
      router.push("/capture");
    }
  }

  const recording = phase === "recording";
  const saved = phase === "saved";
  const question = edits[index] ?? questions[index];
  const canRedo = (recording || savedBlob !== null) && phase !== "uploading";
  const recordLabel =
    phase === "uploading"
      ? t("capture.uploading").toLowerCase()
      : saved
        ? t("common.next").toLowerCase()
        : recording
          ? t("common.stop").toLowerCase()
          : t("common.record").toLowerCase();

  if (!space.consentSaved) {
    return (
      <main className={styles.page}>
        <BackHeader
          title={t("capture.interviewTitle").toLowerCase()}
          backLabel={t("common.back").toLowerCase()}
          onBack={goBack}
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
        hideTitle
        backLabel={t("common.back").toLowerCase()}
        onBack={goBack}
      />

      <h2 className={styles.counter}>{t("capture.questionOf", { current, total }).toLowerCase()}</h2>
      <div className={styles.progress} aria-hidden="true">
        {questions.map((_, i) => (
          <span
            key={i}
            className={[styles.dot, i === index ? styles.dotActive : ""].filter(Boolean).join(" ")}
          />
        ))}
      </div>

      <div className={styles.note}>
        {editing ? (
          <form
            className={styles.editForm}
            onSubmit={(e) => {
              e.preventDefault();
              saveEdit();
            }}
          >
            <textarea
              className={styles.editInput}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label={t("capture.editQuestion")}
              rows={4}
              autoFocus
            />
            <button type="submit" className={styles.editDone}>
              {t("common.done").toLowerCase()}
            </button>
          </form>
        ) : (
          <p className={styles.question}>{question}</p>
        )}
      </div>

      <div className={styles.waveform} aria-hidden="true">
        {WAVE.map((h, i) => (
          <span
            key={i}
            className={[styles.bar, recording ? styles.barLive : ""].filter(Boolean).join(" ")}
            style={{ height: `${h}px`, animationDelay: `${(i % 5) * 0.12}s` }}
          />
        ))}
      </div>

      {saved ? (
        <p className={styles.status} role="status">
          {t("capture.memorySaved")}
        </p>
      ) : null}

      <div className={styles.controls}>
        <button type="button" className={styles.sideBtn} onClick={onSkip} disabled={phase === "uploading"}>
          <svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true">
            <path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>{t("capture.skipQuestion").toLowerCase()}</span>
        </button>

        <button
          type="button"
          className={[styles.recordBtn, recording ? styles.recordBtnRecording : ""]
            .filter(Boolean)
            .join(" ")}
          onClick={() => (saved ? onContinueAfterSave() : void onRecordTap())}
          disabled={phase === "uploading"}
          aria-pressed={saved ? undefined : recording}
        >
          {recordLabel}
        </button>

        <button type="button" className={styles.sideBtn} onClick={onReRecord} disabled={!canRedo}>
          <svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true">
            <path
              d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{t("common.reRecord").toLowerCase()}</span>
        </button>
      </div>

      <p className={styles.tapHint}>
        {recording ? t("capture.recordingHint") : t("capture.recordTapHint")}
      </p>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {!editing && !saved ? (
        <button type="button" className={styles.editLink} onClick={startEdit}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M6 18L18 6M9 6h9v9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t("capture.editQuestion").toLowerCase()}
        </button>
      ) : null}
    </main>
  );
}
