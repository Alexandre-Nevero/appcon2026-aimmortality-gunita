import { fileURLToPath } from "node:url";

import {
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

const sourceFixture = z.object({
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

const itemFixture = z.object({
  sourceKey: z.string(),
  type: itemTypeSchema,
  title: z.string(),
  body: z.string(),
  origin: originSchema,
  reviewState: reviewStateSchema.default("ai_suggestion"),
  visibility: visibilitySchema.nullable().optional(),
  segmentIndexes: z.array(z.number().int().min(0)).default([]),
  rawPeople: z.array(z.string()).default([]),
  places: z.array(z.string()).default([]),
  dates: z.array(dateFixture).default([]),
  peopleKeys: z.array(z.string()).default([]),
  recipeSteps: z.array(recipeStepFixture).default([]),
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
});

export type FamilyFixture = z.infer<typeof familyFixture>;

export const DEFAULT_FIXTURE_PATH = fileURLToPath(
  new URL("../../../../seed/data/family.json", import.meta.url),
);
