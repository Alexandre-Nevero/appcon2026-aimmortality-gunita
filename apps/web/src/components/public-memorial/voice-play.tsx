"use client";

import { useRef, useState } from "react";

import type { Locale } from "@gunita/core";
import { getDictionary } from "@/src/i18n/dictionary";
import { t } from "@/src/i18n/t";

import styles from "./public-memorial.module.css";

export function VoicePlay({
  audioUrl,
  locale,
  transcript,
}: {
  audioUrl: string;
  locale: Locale;
  transcript?: string | null;
}) {
  const dict = getDictionary(locale);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  return (
    <div>
      <button
        type="button"
        className={styles.playBtn}
        aria-pressed={playing}
        onClick={() => {
          const el = audioRef.current;
          if (!el) return;
          void el.play();
        }}
      >
        {t(dict, "memorialPublic.tapToPlay")}
      </button>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      {transcript ? <p className={styles.transcript}>{transcript}</p> : null}
    </div>
  );
}
