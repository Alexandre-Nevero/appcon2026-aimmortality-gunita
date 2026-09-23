import type { TranscriptionModel } from "ai";
import { transcribe } from "ai";

export interface TranscribedSegment {
  index: number;
  text: string;
  startSeconds: number;
  endSeconds: number;
}

export interface TranscriptionOutput {
  fullText: string;
  segments: TranscribedSegment[];
  durationSeconds: number | undefined;
}

// System Design data flow: Groq whisper-large-v3, verbose_json, segment timestamps. `model` is
// injected so tests can pass `MockTranscriptionModelV4` (ai/test) instead of a live provider.
export async function transcribeAudio(
  model: TranscriptionModel,
  audio: ArrayBuffer,
): Promise<TranscriptionOutput> {
  const result = await transcribe({
    model,
    audio,
    providerOptions: {
      groq: { responseFormat: "verbose_json", timestampGranularities: ["segment"] },
    },
  });
  return {
    fullText: result.text,
    segments: result.segments.map((segment, index) => ({
      index,
      text: segment.text,
      startSeconds: segment.startSecond,
      endSeconds: segment.endSecond,
    })),
    durationSeconds: result.durationInSeconds,
  };
}
