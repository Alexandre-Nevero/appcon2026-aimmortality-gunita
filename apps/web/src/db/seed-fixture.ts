import { fileURLToPath } from "node:url";

import {
  contributionStatusSchema,
  datePrecisionSchema,
  itemTypeSchema,
  localeSchema,
  membershipRoleSchema,
  originSchema,
  recipeStepKindSchema,
  reviewStateSchema,
  sourceStatusSchema,
  sourceTypeSchema,
  visibilitySchema,
} from "@gunita/core";
import { z } from "zod";

// Fixture shape for one family bundle. TASK-020 (seed/data/**, seed/media/**) replaces
// seed/data/family.json with the real fictional family (PRD BR-040); this loader stays generic.
// Kept dependency-free from the DB client (./index) so it can be validated without a DATABASE_URL.
const segmentFixture = z.object({
  index: z.number().int().min(0),
  text: z.string(),
  startSeconds: z.number().nullable().optional(),
  endSeconds: z.number().nullable().optional(),
});

const sourceFixture = z
  .object({
    key: z.string(),
    type: sourceTypeSchema,
    origin: originSchema,
    status: sourceStatusSchema.default("ready"),
    visibility: visibilitySchema.default("private"),
    mimeType: z.string(),
    byteSize: z.number().int().min(0),
    blobPathname: z.string(),
    contributorPersonKey: z.string().nullable().optional(),
    segments: z.array(segmentFixture).default([]),
  })
  // docs/data-model.md `source_segment`: "Photos have no segments — their vision output lives on
  // `source.aiVisibleDescription` instead."
  .refine((source) => source.type !== "photo" || source.segments.length === 0, {
    message: 'A "photo" source must not have segments',
    path: ["segments"],
  });

const recipeStepFixture = z.object({
  index: z.number().int().min(0),
  kind: recipeStepKindSchema,
  text: z.string(),
  quantityVerbatim: z.string().nullable().optional(),
  segmentIndexes: z.array(z.number().int().min(0)).default([]),
});

const dateFixture = z.object({
  text: z.string(),
  precision: datePrecisionSchema,
});

const itemFixture = z
  .object({
    sourceKey: z.string(),
    type: itemTypeSchema,
    title: z.string(),
    body: z.string(),
    origin: originSchema,
    reviewState: reviewStateSchema.default("ai_suggestion"),
    visibility: visibilitySchema.nullable().optional(),
    disputeNote: z.string().nullable().optional(),
    segmentIndexes: z.array(z.number().int().min(0)).default([]),
    rawPeople: z.array(z.string()).default([]),
    places: z.array(z.string()).default([]),
    dates: z.array(dateFixture).default([]),
    peopleKeys: z.array(z.string()).default([]),
    recipeSteps: z.array(recipeStepFixture).default([]),
  })
  // PRD BR-020: Dispute cannot be saved without a note.
  .refine((item) => item.reviewState !== "disputed" || Boolean(item.disputeNote?.trim()), {
    message: 'An item with reviewState "disputed" must have a disputeNote (BR-020)',
    path: ["disputeNote"],
  });

const personFixture = z.object({
  key: z.string(),
  displayName: z.string(),
  aliases: z.array(z.string()).default([]),
  relationshipToFeatured: z.string().nullable().optional(),
  isFeatured: z.boolean().default(false),
});

const membershipFixture = z.object({
  // Placeholder until TASK-006 (Better Auth) exists — see docs/data-model.md `membership.userId`.
  userId: z.string(),
  role: membershipRoleSchema,
  localeOverride: localeSchema.nullable().optional(),
});

// F-019/F-020 visitor memories, so S-030/S-033 have content before live moderation exists.
const contributionFixture = z
  .object({
    displayName: z.string(),
    relationship: z.string(),
    textContent: z.string().nullable().optional(),
    // Full public Blob URL, same convention as `source.blobPathname`.
    photoBlobPathname: z.string().nullable().optional(),
    audioBlobPathname: z.string().nullable().optional(),
    status: contributionStatusSchema.default("pending"),
  })
  .refine((c) => Boolean(c.textContent || c.photoBlobPathname || c.audioBlobPathname), {
    message: "A contribution needs text, photo, or audio (BR-060)",
    path: ["textContent"],
  });

export const familyFixture = z.object({
  space: z.object({ name: z.string(), locale: localeSchema.default("fil") }),
  consent: z
    .object({
      participationConsented: z.boolean().default(false),
      aiProcessingConsented: z.boolean().default(false),
      memorialUseAllowed: z.boolean().default(false),
      voiceClipsAllowed: z.boolean().default(false),
      evidenceSourceKey: z.string().nullable().optional(),
    })
    .optional(),
  people: z.array(personFixture).default([]),
  memberships: z.array(membershipFixture).default([]),
  sources: z.array(sourceFixture).default([]),
  items: z.array(itemFixture).default([]),
  // Activates Memorial Mode and publishes an (empty) recap; the loader prints the /m/<token> URL.
  publishMemorial: z.boolean().default(false),
  contributions: z.array(contributionFixture).default([]),
});

export type FamilyFixture = z.infer<typeof familyFixture>;

export const DEFAULT_FIXTURE_PATH = fileURLToPath(
  new URL("../../../../seed/data/family.json", import.meta.url),
);
