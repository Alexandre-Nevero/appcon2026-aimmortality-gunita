CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "vector";--> statement-breakpoint
CREATE TYPE "public"."activity_type" AS ENUM('consent_recorded', 'consent_withdrawn', 'invite_sent', 'source_deleted', 'item_deleted', 'item_visibility_changed', 'contribution_approved', 'contribution_rejected', 'memorial_activated', 'memorial_reversed', 'memorial_published', 'memorial_link_disabled', 'memorial_link_enabled');--> statement-breakpoint
CREATE TYPE "public"."ai_call_provider" AS ENUM('groq', 'gemini');--> statement-breakpoint
CREATE TYPE "public"."ai_call_purpose" AS ENUM('transcribe', 'vision', 'extract', 'hints', 'ask', 'caption', 'embed');--> statement-breakpoint
CREATE TYPE "public"."ai_call_status" AS ENUM('ok', 'error');--> statement-breakpoint
CREATE TYPE "public"."ask_outcome" AS ENUM('answered', 'abstained', 'refused', 'error');--> statement-breakpoint
CREATE TYPE "public"."contribution_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('memorial_opened', 'share_started', 'share_submitted', 'ask_answered', 'question_added_from_abstain', 'item_reviewed');--> statement-breakpoint
CREATE TYPE "public"."item_type" AS ENUM('story', 'recipe', 'tradition', 'lesson', 'fact');--> statement-breakpoint
CREATE TYPE "public"."lifecycle_mode" AS ENUM('during', 'memorial');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('fil', 'en');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('steward', 'family');--> statement-breakpoint
CREATE TYPE "public"."origin" AS ENUM('from_them', 'about_them');--> statement-breakpoint
CREATE TYPE "public"."question_origin" AS ENUM('artifact_gap', 'hint', 'ask_abstain');--> statement-breakpoint
CREATE TYPE "public"."question_status" AS ENUM('queued', 'dismissed', 'answered');--> statement-breakpoint
CREATE TYPE "public"."recap_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."recipe_step_kind" AS ENUM('measured', 'judgement');--> statement-breakpoint
CREATE TYPE "public"."review_action" AS ENUM('confirm', 'correct', 'reject', 'dispute', 'uncertain');--> statement-breakpoint
CREATE TYPE "public"."review_state" AS ENUM('ai_suggestion', 'verified', 'corrected', 'uncertain', 'disputed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."source_status" AS ENUM('uploaded', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('audio', 'text', 'photo', 'document');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('private', 'family', 'memorial');--> statement-breakpoint
CREATE TYPE "public"."visibility_set_by" AS ENUM('featured_person', 'steward');--> statement-breakpoint
CREATE TABLE "activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"membership_id" uuid,
	"type" "activity_type" NOT NULL,
	"target_type" text,
	"target_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_call" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"source_id" uuid,
	"item_id" uuid,
	"purpose" "ai_call_purpose" NOT NULL,
	"provider" "ai_call_provider" NOT NULL,
	"model" text NOT NULL,
	"status" "ai_call_status" NOT NULL,
	"latency_ms" integer NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"participation_consented" boolean DEFAULT false NOT NULL,
	"ai_processing_consented" boolean DEFAULT false NOT NULL,
	"memorial_use_allowed" boolean DEFAULT false NOT NULL,
	"voice_clips_allowed" boolean DEFAULT false NOT NULL,
	"evidence_source_id" uuid,
	"recorded_at" timestamp with time zone,
	"recorded_by_membership_id" uuid,
	"withdrawn_at" timestamp with time zone,
	"withdrawn_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consent_space_id_unique" UNIQUE("space_id")
);
--> statement-breakpoint
CREATE TABLE "contribution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"relationship" text NOT NULL,
	"text_content" text,
	"photo_blob_pathname" text,
	"audio_blob_pathname" text,
	"status" "contribution_status" DEFAULT 'pending' NOT NULL,
	"submitted_ip_hash" text NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by_membership_id" uuid,
	"reviewed_at" timestamp with time zone,
	CONSTRAINT "contribution_has_content" CHECK ("contribution"."text_content" is not null or "contribution"."photo_blob_pathname" is not null or "contribution"."audio_blob_pathname" is not null)
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"membership_id" uuid,
	"type" "event_type" NOT NULL,
	"visit_id" text,
	"outcome" "ask_outcome",
	"properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"type" "item_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"origin" "origin" NOT NULL,
	"segment_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"raw_people" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"places" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"review_state" "review_state" DEFAULT 'ai_suggestion' NOT NULL,
	"visibility" "visibility",
	"visibility_set_by" "visibility_set_by",
	"dispute_note" text,
	"reviewed_by_membership_id" uuid,
	"reviewed_with_featured_person" boolean DEFAULT false NOT NULL,
	"reviewed_at" timestamp with time zone,
	"embedding" vector(768),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_person" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"role" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"action" "review_action" NOT NULL,
	"note" text,
	"previous_value" jsonb NOT NULL,
	"changed_by_membership_id" uuid NOT NULL,
	"changed_with_featured_person" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "membership_role" NOT NULL,
	"locale_override" "locale",
	"invited_by_membership_id" uuid,
	"invited_at" timestamp with time zone,
	"joined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "person" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"relationship_to_featured" text,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"text" text NOT NULL,
	"locale" "locale" NOT NULL,
	"reason" text NOT NULL,
	"origin_kind" "question_origin" NOT NULL,
	"triggered_by_source_id" uuid,
	"triggered_by_item_id" uuid,
	"status" "question_status" DEFAULT 'queued' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "recap" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"status" "recap_status" DEFAULT 'draft' NOT NULL,
	"snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"published_by_membership_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recap_space_id_unique" UNIQUE("space_id")
);
--> statement-breakpoint
CREATE TABLE "recipe_step" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"index" integer NOT NULL,
	"kind" "recipe_step_kind" NOT NULL,
	"text" text NOT NULL,
	"quantity_verbatim" text,
	"segment_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"type" "source_type" NOT NULL,
	"status" "source_status" DEFAULT 'uploaded' NOT NULL,
	"status_reason" text,
	"origin" "origin" NOT NULL,
	"visibility" "visibility" DEFAULT 'private' NOT NULL,
	"contributor_person_id" uuid,
	"uploaded_by_membership_id" uuid NOT NULL,
	"blob_pathname" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"duration_seconds" numeric,
	"artifact_context" jsonb,
	"ai_visible_description" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_segment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"index" integer NOT NULL,
	"text" text NOT NULL,
	"start_seconds" numeric,
	"end_seconds" numeric,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "space" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"locale" "locale" DEFAULT 'fil' NOT NULL,
	"lifecycle_mode" "lifecycle_mode" DEFAULT 'during' NOT NULL,
	"memorial_token" text,
	"memorial_link_disabled" boolean DEFAULT false NOT NULL,
	"memorial_activated_at" timestamp with time zone,
	"memorial_reversed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "space_memorial_token_unique" UNIQUE("memorial_token")
);
--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_membership_id_membership_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_call" ADD CONSTRAINT "ai_call_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_call" ADD CONSTRAINT "ai_call_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_call" ADD CONSTRAINT "ai_call_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent" ADD CONSTRAINT "consent_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent" ADD CONSTRAINT "consent_evidence_source_id_source_id_fk" FOREIGN KEY ("evidence_source_id") REFERENCES "public"."source"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent" ADD CONSTRAINT "consent_recorded_by_membership_id_membership_id_fk" FOREIGN KEY ("recorded_by_membership_id") REFERENCES "public"."membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution" ADD CONSTRAINT "contribution_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution" ADD CONSTRAINT "contribution_reviewed_by_membership_id_membership_id_fk" FOREIGN KEY ("reviewed_by_membership_id") REFERENCES "public"."membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_membership_id_membership_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_reviewed_by_membership_id_membership_id_fk" FOREIGN KEY ("reviewed_by_membership_id") REFERENCES "public"."membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_person" ADD CONSTRAINT "item_person_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_person" ADD CONSTRAINT "item_person_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_revision" ADD CONSTRAINT "item_revision_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_revision" ADD CONSTRAINT "item_revision_changed_by_membership_id_membership_id_fk" FOREIGN KEY ("changed_by_membership_id") REFERENCES "public"."membership"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_invited_by_membership_id_membership_id_fk" FOREIGN KEY ("invited_by_membership_id") REFERENCES "public"."membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_triggered_by_source_id_source_id_fk" FOREIGN KEY ("triggered_by_source_id") REFERENCES "public"."source"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_triggered_by_item_id_item_id_fk" FOREIGN KEY ("triggered_by_item_id") REFERENCES "public"."item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recap" ADD CONSTRAINT "recap_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recap" ADD CONSTRAINT "recap_published_by_membership_id_membership_id_fk" FOREIGN KEY ("published_by_membership_id") REFERENCES "public"."membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_step" ADD CONSTRAINT "recipe_step_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source" ADD CONSTRAINT "source_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source" ADD CONSTRAINT "source_contributor_person_id_person_id_fk" FOREIGN KEY ("contributor_person_id") REFERENCES "public"."person"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source" ADD CONSTRAINT "source_uploaded_by_membership_id_membership_id_fk" FOREIGN KEY ("uploaded_by_membership_id") REFERENCES "public"."membership"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_segment" ADD CONSTRAINT "source_segment_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contribution_rate_limit_idx" ON "contribution" USING btree ("space_id","submitted_ip_hash","submitted_at");--> statement-breakpoint
CREATE INDEX "item_space_review_visibility_idx" ON "item" USING btree ("space_id","review_state","visibility");--> statement-breakpoint
CREATE INDEX "item_source_idx" ON "item" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "item_embedding_hnsw_idx" ON "item" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "item_person_unique" ON "item_person" USING btree ("item_id","person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_space_user_unique" ON "membership" USING btree ("space_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_one_steward_per_space" ON "membership" USING btree ("space_id") WHERE "membership"."role" = 'steward';--> statement-breakpoint
CREATE UNIQUE INDEX "person_one_featured_per_space" ON "person" USING btree ("space_id") WHERE "person"."is_featured" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_step_item_index_unique" ON "recipe_step" USING btree ("item_id","index");--> statement-breakpoint
CREATE UNIQUE INDEX "source_segment_source_index_unique" ON "source_segment" USING btree ("source_id","index");