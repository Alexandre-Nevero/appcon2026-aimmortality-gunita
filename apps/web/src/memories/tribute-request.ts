import { z } from "zod";

// POST /api/m/:token/tributes. `hearted` is the desired end state, so a retried tap is idempotent.
export const tributeRequestSchema = z.object({
  contributionId: z.uuid(),
  hearted: z.boolean(),
});

export type TributeRequest = z.infer<typeof tributeRequestSchema>;
