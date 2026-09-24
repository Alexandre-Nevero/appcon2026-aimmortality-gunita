"use client";

import type { Locale } from "@gunita/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/src/components/ui/Button";
import { Field } from "@/src/components/ui/Field";
import { getDictionary } from "@/src/i18n/dictionary";
import { t } from "@/src/i18n/t";

import styles from "./public-memorial.module.css";

type ShareState = "idle" | "recording" | "uploading" | "rate-limited" | "error";

export function ShareMemoryForm({ token, locale }: { token: string; locale: Locale }) {
  const dict = getDictionary(locale);
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [state, setState] = useState<ShareState>("idle");
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setState("idle");
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioBlob(blob.size > 0 ? blob : null);
      };
      recorderRef.current = recorder;
      recorder.start();
      setState("recording");
    } catch {
      setError(t(dict, "memorialPublic.micPermissionDenied"));
    }
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim() || !relationship.trim()) {
      setError(t(dict, "memorialPublic.nameRequired"));
      setState("error");
      return;
    }
    if (!text.trim() && !photo && !audioBlob) {
      setError(t(dict, "memorialPublic.needOneOfThree"));
      setState("error");
      return;
    }

    setState("uploading");
    setError(null);
    const form = new FormData();
    form.set("displayName", displayName.trim());
    form.set("relationship", relationship.trim());
    if (text.trim()) form.set("text", text.trim());
    if (photo) form.set("photo", photo);
    if (audioBlob) form.set("audio", new File([audioBlob], "voice.webm", { type: audioBlob.type }));

    try {
      const res = await fetch(`/api/m/${token}/contributions`, { method: "POST", body: form });
      if (res.status === 429) {
        setState("rate-limited");
        setError(t(dict, "memorialPublic.rateLimited"));
        return;
      }
      if (!res.ok) {
        setState("error");
        setError(t(dict, "memorialPublic.submitFailed"));
        return;
      }
      router.push(`/m/${token}/thanks`);
    } catch {
      setState("error");
      setError(t(dict, "memorialPublic.submitFailed"));
    }
  }

  return (
    <main className={styles.page}>
      <p className={styles.hint}>
        <Link href={`/m/${token}`}>{t(dict, "common.back")}</Link>
      </p>
      <h1 className={styles.coverTitle}>{t(dict, "memorialPublic.shareTitle")}</h1>
      <p className={styles.hint}>{t(dict, "memorialPublic.shareHint")}</p>
      <form className={styles.form} onSubmit={(e) => void onSubmit(e)}>
        <Field
          name="displayName"
          label={t(dict, "memorialPublic.yourName").toLowerCase()}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="name"
        />
        <Field
          name="relationship"
          label={t(dict, "memorialPublic.yourRelationship").toLowerCase()}
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
        />
        <label className={styles.hint} htmlFor="share-text">
          {t(dict, "memorialPublic.textMemory")}
        </label>
        <textarea
          id="share-text"
          className={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t(dict, "memorialPublic.textPlaceholder")}
        />
        <label className={styles.hint} htmlFor="share-photo">
          {t(dict, "memorialPublic.photo")}
        </label>
        <input
          id="share-photo"
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />
        <div>
          <p className={styles.hint}>{t(dict, "memorialPublic.voiceNote")}</p>
          {state === "recording" ? (
            <Button type="button" variant="dark" onClick={stopRecording}>
              {t(dict, "common.stop").toLowerCase()}
            </Button>
          ) : (
            <Button type="button" onClick={() => void startRecording()}>
              {t(dict, "memorialPublic.voiceRecord").toLowerCase()}
            </Button>
          )}
          {audioBlob ? (
            <p className={styles.hint} role="status">
              {t(dict, "common.saved")}
            </p>
          ) : null}
        </div>
        <p className={styles.notice}>{t(dict, "memorialPublic.reviewNotice")}</p>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="dark" disabled={state === "uploading" || state === "recording"}>
          {state === "uploading"
            ? t(dict, "memorialPublic.submitting").toLowerCase()
            : t(dict, "memorialPublic.submitMemory").toLowerCase()}
        </Button>
      </form>
    </main>
  );
}
