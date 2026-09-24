import { contributionStatusSchema, originSchema, reviewStateSchema } from "@gunita/core";
import { z } from "zod";

export const memorialCardTypeSchema = z.enum([
  "cover",
  "life_moment",
  "quote",
  "recipe",
  "lesson",
  "closing",
]);

export const memorialClipSchema = z.object({
  startSeconds: z.number().min(0),
  endSeconds: z.number().min(0),
});

export const memorialCardSchema = z.object({
  type: memorialCardTypeSchema,
  order: z.number().int().min(0),
  itemId: z.uuid().nullable().optional(),
  sourceId: z.uuid().nullable().optional(),
  title: z.string(),
  body: z.string().nullable().optional(),
  caption: z.string().max(140).nullable().optional(),
  aiWritten: z.boolean().default(false),
  origin: originSchema.nullable().optional(),
  reviewState: reviewStateSchema.nullable().optional(),
  blobUrl: z.string().url().nullable().optional(),
  audioUrl: z.string().url().nullable().optional(),
  transcriptExcerpt: z.string().nullable().optional(),
  clip: memorialClipSchema.nullable().optional(),
});

export type MemorialCard = z.infer<typeof memorialCardSchema>;

export const memorialActivateRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("activate"),
    typedName: z.string().trim().min(1),
  }),
  z.object({
    action: z.literal("reverse"),
  }),
]);

export const memorialPublishRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("draft"),
    itemIds: z.array(z.uuid()).min(1),
  }),
  z.object({
    action: z.literal("publish"),
    cards: z.array(memorialCardSchema).min(1),
  }),
  z.object({
    action: z.literal("set_link_state"),
    disabled: z.boolean(),
  }),
]);

export const contributionModerationRequestSchema = z.object({
  contributionId: z.uuid(),
  status: contributionStatusSchema.refine((value) => value !== "pending", {
    message: "Moderation must approve or reject a contribution.",
  }),
});

export type MemorialActivateRequest = z.infer<typeof memorialActivateRequestSchema>;
export type MemorialPublishRequest = z.infer<typeof memorialPublishRequestSchema>;
export type ContributionModerationRequest = z.infer<typeof contributionModerationRequestSchema>;
