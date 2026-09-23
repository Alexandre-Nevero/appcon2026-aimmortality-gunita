import { embed, type EmbeddingModel } from "ai";

// System Design: Gemini gemini-embedding-001, 768 dims (ADR-002). RETRIEVAL_DOCUMENT for items
// (this file's caller), RETRIEVAL_QUERY for an Ask GUNITA question (a future TASK-013 caller).
export type EmbedTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export async function embedText(
  model: EmbeddingModel,
  text: string,
  taskType: EmbedTaskType,
): Promise<number[]> {
  const { embedding } = await embed({
    model,
    value: text,
    providerOptions: {
      google: { outputDimensionality: 768, taskType },
    },
  });
  return embedding;
}
