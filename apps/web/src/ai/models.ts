import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";

// docs/ops.md § Configuration & secrets: model IDs are env vars so they can be swapped without a
// code change. Defaults here are the System Design picks (Stack currency table, ADR-002).
const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

export const models = {
  transcribe: groq.transcription(process.env.MODEL_TRANSCRIBE ?? "whisper-large-v3"),
  text: groq.languageModel(process.env.MODEL_TEXT ?? "openai/gpt-oss-120b"),
  textFallback: google.languageModel(process.env.MODEL_TEXT_FALLBACK ?? "gemini-2.5-flash-lite"),
  vision: google.languageModel(process.env.MODEL_VISION ?? "gemini-2.5-flash-lite"),
  embed: google.embedding(process.env.MODEL_EMBED ?? "gemini-embedding-001"),
};
