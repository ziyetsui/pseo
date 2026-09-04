import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_roles" AS ENUM('editor', 'reviewer', 'publisher', 'admin');
  CREATE TYPE "public"."enum_prompt_artifacts_parameters_value_type" AS ENUM('text', 'number', 'enum', 'boolean');
  CREATE TYPE "public"."enum_prompt_artifacts_media_media_type" AS ENUM('image', 'video');
  CREATE TYPE "public"."enum_prompt_artifacts_examples_output_media_type" AS ENUM('image', 'video');
  CREATE TYPE "public"."enum_prompt_artifacts_content_type" AS ENUM('image', 'video', 'text', 'other');
  CREATE TYPE "public"."enum_prompt_artifacts_source_locale" AS ENUM('en', 'zh-CN');
  CREATE TYPE "public"."enum_prompt_artifacts_draft_workflow_state" AS ENUM('draft', 'needs_review', 'validated', 'conflicted', 'rejected', 'archived');
  CREATE TYPE "public"."enum_prompt_artifacts_outcome_output_type" AS ENUM('image', 'video', 'text', 'other');
  CREATE TYPE "public"."enum_prompt_artifacts_git_publication_state" AS ENUM('unpublished', 'request_open', 'pr_open', 'merged', 'released', 'rejected', 'conflicted');
  CREATE TYPE "public"."enum_prompt_artifacts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__prompt_artifacts_v_version_parameters_value_type" AS ENUM('text', 'number', 'enum', 'boolean');
  CREATE TYPE "public"."enum__prompt_artifacts_v_version_media_media_type" AS ENUM('image', 'video');
  CREATE TYPE "public"."enum__prompt_artifacts_v_version_examples_output_media_type" AS ENUM('image', 'video');
  CREATE TYPE "public"."enum__prompt_artifacts_v_version_content_type" AS ENUM('image', 'video', 'text', 'other');
  CREATE TYPE "public"."enum__prompt_artifacts_v_version_source_locale" AS ENUM('en', 'zh-CN');
  CREATE TYPE "public"."enum__prompt_artifacts_v_version_draft_workflow_state" AS ENUM('draft', 'needs_review', 'validated', 'conflicted', 'rejected', 'archived');
  CREATE TYPE "public"."enum__prompt_artifacts_v_version_outcome_output_type" AS ENUM('image', 'video', 'text', 'other');
  CREATE TYPE "public"."enum__prompt_artifacts_v_version_git_publication_state" AS ENUM('unpublished', 'request_open', 'pr_open', 'merged', 'released', 'rejected', 'conflicted');
  CREATE TYPE "public"."enum__prompt_artifacts_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_locale_variants_locale" AS ENUM('en', 'zh-CN');
  CREATE TYPE "public"."enum_locale_variants_source_locale" AS ENUM('en', 'zh-CN');
  CREATE TYPE "public"."enum_locale_variants_translation_translation_status" AS ENUM('missing', 'draft', 'review', 'ready', 'stale');
  CREATE TYPE "public"."enum_locale_variants_seo_robots" AS ENUM('noindex,nofollow', 'index,follow');
  CREATE TYPE "public"."enum_locale_variants_git_publication_state" AS ENUM('unpublished', 'request_open', 'pr_open', 'merged', 'released', 'rejected', 'conflicted');
  CREATE TYPE "public"."enum_locale_variants_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__locale_variants_v_version_locale" AS ENUM('en', 'zh-CN');
  CREATE TYPE "public"."enum__locale_variants_v_version_source_locale" AS ENUM('en', 'zh-CN');
  CREATE TYPE "public"."enum__locale_variants_v_version_translation_translation_status" AS ENUM('missing', 'draft', 'review', 'ready', 'stale');
  CREATE TYPE "public"."enum__locale_variants_v_version_seo_robots" AS ENUM('noindex,nofollow', 'index,follow');
  CREATE TYPE "public"."enum__locale_variants_v_version_git_publication_state" AS ENUM('unpublished', 'request_open', 'pr_open', 'merged', 'released', 'rejected', 'conflicted');
  CREATE TYPE "public"."enum__locale_variants_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_taxonomies_axis" AS ENUM('model', 'use_case', 'technique', 'style', 'subject', 'collection', 'creator');
  CREATE TYPE "public"."enum_taxonomies_locale" AS ENUM('en', 'zh-CN');
  CREATE TYPE "public"."enum_taxonomies_source_locale" AS ENUM('en', 'zh-CN');
  CREATE TYPE "public"."enum_taxonomies_translation_translation_status" AS ENUM('missing', 'draft', 'review', 'ready', 'stale');
  CREATE TYPE "public"."enum_taxonomies_seo_robots" AS ENUM('noindex,nofollow', 'index,follow');
  CREATE TYPE "public"."enum_taxonomies_git_publication_state" AS ENUM('unpublished', 'request_open', 'pr_open', 'merged', 'released', 'rejected', 'conflicted');
  CREATE TYPE "public"."enum_taxonomies_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__taxonomies_v_version_axis" AS ENUM('model', 'use_case', 'technique', 'style', 'subject', 'collection', 'creator');
  CREATE TYPE "public"."enum__taxonomies_v_version_locale" AS ENUM('en', 'zh-CN');
  CREATE TYPE "public"."enum__taxonomies_v_version_source_locale" AS ENUM('en', 'zh-CN');
  CREATE TYPE "public"."enum__taxonomies_v_version_translation_translation_status" AS ENUM('missing', 'draft', 'review', 'ready', 'stale');
  CREATE TYPE "public"."enum__taxonomies_v_version_seo_robots" AS ENUM('noindex,nofollow', 'index,follow');
  CREATE TYPE "public"."enum__taxonomies_v_version_git_publication_state" AS ENUM('unpublished', 'request_open', 'pr_open', 'merged', 'released', 'rejected', 'conflicted');
  CREATE TYPE "public"."enum__taxonomies_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_source_evidence_record_type" AS ENUM('source', 'evidence');
  CREATE TYPE "public"."enum_source_evidence_source_platform" AS ENUM('x', 'rss', 'url', 'manual');
  CREATE TYPE "public"."enum_source_evidence_rights_status" AS ENUM('unknown', 'review_required', 'cleared', 'community_attributed', 'restricted', 'takedown');
  CREATE TYPE "public"."enum_source_evidence_git_publication_state" AS ENUM('unpublished', 'request_open', 'pr_open', 'merged', 'released', 'rejected', 'conflicted');
  CREATE TYPE "public"."enum_source_evidence_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__source_evidence_v_version_record_type" AS ENUM('source', 'evidence');
  CREATE TYPE "public"."enum__source_evidence_v_version_source_platform" AS ENUM('x', 'rss', 'url', 'manual');
  CREATE TYPE "public"."enum__source_evidence_v_version_rights_status" AS ENUM('unknown', 'review_required', 'cleared', 'community_attributed', 'restricted', 'takedown');
  CREATE TYPE "public"."enum__source_evidence_v_version_git_publication_state" AS ENUM('unpublished', 'request_open', 'pr_open', 'merged', 'released', 'rejected', 'conflicted');
  CREATE TYPE "public"."enum__source_evidence_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_publication_decision_sequences_locale" AS ENUM('en', 'zh-CN');
  CREATE TYPE "public"."enum_publication_decision_sequences_kind" AS ENUM('approval', 'withdrawal');
  CREATE TYPE "public"."enum_content_approvals_locale" AS ENUM('en', 'zh-CN');
  CREATE TYPE "public"."enum_content_approvals_decision" AS ENUM('approved');
  CREATE TYPE "public"."enum_content_withdrawals_locale" AS ENUM('en', 'zh-CN');
  CREATE TYPE "public"."enum_content_withdrawals_decision" AS ENUM('restricted', 'takedown');
  CREATE TYPE "public"."enum_content_withdrawals_sync_dispatch_mode" AS ENUM('disabled');
  CREATE TYPE "public"."enum_content_withdrawals_sync_event_type" AS ENUM('public_snapshot_withdrawal');
  CREATE TYPE "public"."enum_content_withdrawals_sync_priority" AS ENUM('urgent');
  CREATE TYPE "public"."enum_publication_requests_requested_locales_locale" AS ENUM('en', 'zh-CN');
  CREATE TYPE "public"."enum_publication_requests_checks_status" AS ENUM('pending', 'passed', 'failed');
  CREATE TYPE "public"."enum_publication_requests_status" AS ENUM('pending', 'mock_accepted', 'pr_open', 'checks_passed', 'conflicted', 'merged', 'released', 'rejected', 'failed');
  CREATE TYPE "public"."enum_publication_requests_provider" AS ENUM('mock', 'github');
  CREATE TABLE "users_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_users_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"display_name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "prompt_artifacts_prompt_variables_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "prompt_artifacts_prompt_variables" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"label" varchar,
  	"required" boolean DEFAULT true,
  	"default_value" varchar
  );
  
  CREATE TABLE "prompt_artifacts_outcome_platforms" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "prompt_artifacts_required_inputs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "prompt_artifacts_optional_inputs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "prompt_artifacts_parameters_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "prompt_artifacts_parameters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"label" varchar,
  	"value" varchar,
  	"value_type" "enum_prompt_artifacts_parameters_value_type",
  	"required" boolean DEFAULT false
  );
  
  CREATE TABLE "prompt_artifacts_media" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"asset_id" varchar,
  	"media_type" "enum_prompt_artifacts_media_media_type",
  	"url" varchar,
  	"width" numeric,
  	"height" numeric,
  	"alt" varchar,
  	"poster_url" varchar
  );
  
  CREATE TABLE "prompt_artifacts_examples" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"example_id" varchar,
  	"input" varchar,
  	"output_asset_id" varchar,
  	"output_media_type" "enum_prompt_artifacts_examples_output_media_type",
  	"output_url" varchar,
  	"output_width" numeric,
  	"output_height" numeric,
  	"output_alt" varchar,
  	"output_poster_url" varchar,
  	"caption" varchar
  );
  
  CREATE TABLE "prompt_artifacts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"artifact_key" varchar,
  	"content_type" "enum_prompt_artifacts_content_type",
  	"source_locale" "enum_prompt_artifacts_source_locale",
  	"draft_workflow_state" "enum_prompt_artifacts_draft_workflow_state" DEFAULT 'draft',
  	"prompt_language" varchar,
  	"prompt_text" varchar,
  	"outcome_output_type" "enum_prompt_artifacts_outcome_output_type",
  	"metrics_likes" numeric,
  	"metrics_bookmarks" numeric,
  	"metrics_comments" numeric,
  	"metrics_reposts" numeric,
  	"metrics_views" numeric,
  	"metrics_observed_at" timestamp(3) with time zone,
  	"creator_id" integer,
  	"actions_can_copy" boolean DEFAULT true,
  	"actions_try_url" varchar,
  	"beta_preview" jsonb,
  	"git_publication_state" "enum_prompt_artifacts_git_publication_state" DEFAULT 'unpublished',
  	"git_publication_pull_request_number" numeric,
  	"git_publication_pull_request_url" varchar,
  	"git_publication_merge_sha" varchar,
  	"git_publication_released_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_prompt_artifacts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "prompt_artifacts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"taxonomies_id" integer,
  	"prompt_artifacts_id" integer,
  	"source_evidence_id" integer
  );
  
  CREATE TABLE "_prompt_artifacts_v_version_prompt_variables_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_prompt_artifacts_v_version_prompt_variables" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"label" varchar,
  	"required" boolean DEFAULT true,
  	"default_value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_prompt_artifacts_v_version_outcome_platforms" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_prompt_artifacts_v_version_required_inputs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_prompt_artifacts_v_version_optional_inputs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_prompt_artifacts_v_version_parameters_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_prompt_artifacts_v_version_parameters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"label" varchar,
  	"value" varchar,
  	"value_type" "enum__prompt_artifacts_v_version_parameters_value_type",
  	"required" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_prompt_artifacts_v_version_media" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"asset_id" varchar,
  	"media_type" "enum__prompt_artifacts_v_version_media_media_type",
  	"url" varchar,
  	"width" numeric,
  	"height" numeric,
  	"alt" varchar,
  	"poster_url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_prompt_artifacts_v_version_examples" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"example_id" varchar,
  	"input" varchar,
  	"output_asset_id" varchar,
  	"output_media_type" "enum__prompt_artifacts_v_version_examples_output_media_type",
  	"output_url" varchar,
  	"output_width" numeric,
  	"output_height" numeric,
  	"output_alt" varchar,
  	"output_poster_url" varchar,
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_prompt_artifacts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_artifact_key" varchar,
  	"version_content_type" "enum__prompt_artifacts_v_version_content_type",
  	"version_source_locale" "enum__prompt_artifacts_v_version_source_locale",
  	"version_draft_workflow_state" "enum__prompt_artifacts_v_version_draft_workflow_state" DEFAULT 'draft',
  	"version_prompt_language" varchar,
  	"version_prompt_text" varchar,
  	"version_outcome_output_type" "enum__prompt_artifacts_v_version_outcome_output_type",
  	"version_metrics_likes" numeric,
  	"version_metrics_bookmarks" numeric,
  	"version_metrics_comments" numeric,
  	"version_metrics_reposts" numeric,
  	"version_metrics_views" numeric,
  	"version_metrics_observed_at" timestamp(3) with time zone,
  	"version_creator_id" integer,
  	"version_actions_can_copy" boolean DEFAULT true,
  	"version_actions_try_url" varchar,
  	"version_beta_preview" jsonb,
  	"version_git_publication_state" "enum__prompt_artifacts_v_version_git_publication_state" DEFAULT 'unpublished',
  	"version_git_publication_pull_request_number" numeric,
  	"version_git_publication_pull_request_url" varchar,
  	"version_git_publication_merge_sha" varchar,
  	"version_git_publication_released_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__prompt_artifacts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_prompt_artifacts_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"taxonomies_id" integer,
  	"prompt_artifacts_id" integer,
  	"source_evidence_id" integer
  );
  
  CREATE TABLE "locale_variants_localized_outcome_characteristics" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "locale_variants_workflow" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"position" numeric,
  	"title" varchar,
  	"body" varchar
  );
  
  CREATE TABLE "locale_variants" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"locale_variant_key" varchar,
  	"artifact_id" integer,
  	"locale" "enum_locale_variants_locale",
  	"source_locale" "enum_locale_variants_source_locale",
  	"slug" varchar,
  	"title" varchar,
  	"summary" varchar,
  	"indexable" boolean DEFAULT false,
  	"body_markdown" varchar,
  	"localized_outcome_purpose" varchar,
  	"translation_translation_status" "enum_locale_variants_translation_translation_status" DEFAULT 'draft',
  	"translation_translated_from_revision" varchar,
  	"translation_reviewer" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_robots" "enum_locale_variants_seo_robots" DEFAULT 'noindex,nofollow',
  	"beta_preview" jsonb,
  	"git_publication_state" "enum_locale_variants_git_publication_state" DEFAULT 'unpublished',
  	"git_publication_pull_request_number" numeric,
  	"git_publication_pull_request_url" varchar,
  	"git_publication_merge_sha" varchar,
  	"git_publication_released_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_locale_variants_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_locale_variants_v_version_localized_outcome_characteristics" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_locale_variants_v_version_workflow" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"position" numeric,
  	"title" varchar,
  	"body" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_locale_variants_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_locale_variant_key" varchar,
  	"version_artifact_id" integer,
  	"version_locale" "enum__locale_variants_v_version_locale",
  	"version_source_locale" "enum__locale_variants_v_version_source_locale",
  	"version_slug" varchar,
  	"version_title" varchar,
  	"version_summary" varchar,
  	"version_indexable" boolean DEFAULT false,
  	"version_body_markdown" varchar,
  	"version_localized_outcome_purpose" varchar,
  	"version_translation_translation_status" "enum__locale_variants_v_version_translation_translation_status" DEFAULT 'draft',
  	"version_translation_translated_from_revision" varchar,
  	"version_translation_reviewer" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_robots" "enum__locale_variants_v_version_seo_robots" DEFAULT 'noindex,nofollow',
  	"version_beta_preview" jsonb,
  	"version_git_publication_state" "enum__locale_variants_v_version_git_publication_state" DEFAULT 'unpublished',
  	"version_git_publication_pull_request_number" numeric,
  	"version_git_publication_pull_request_url" varchar,
  	"version_git_publication_merge_sha" varchar,
  	"version_git_publication_released_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__locale_variants_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "taxonomies_capabilities" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "taxonomies_inputs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "taxonomies_outputs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "taxonomies_limitations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "taxonomies" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"taxonomy_key" varchar,
  	"axis" "enum_taxonomies_axis",
  	"locale" "enum_taxonomies_locale",
  	"source_locale" "enum_taxonomies_source_locale",
  	"slug" varchar,
  	"name" varchar,
  	"description" varchar,
  	"official_url" varchar,
  	"translation_translation_status" "enum_taxonomies_translation_translation_status" DEFAULT 'draft',
  	"translation_translated_from_revision" varchar,
  	"translation_reviewer" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_robots" "enum_taxonomies_seo_robots" DEFAULT 'noindex,nofollow',
  	"beta_preview" jsonb,
  	"git_publication_state" "enum_taxonomies_git_publication_state" DEFAULT 'unpublished',
  	"git_publication_pull_request_number" numeric,
  	"git_publication_pull_request_url" varchar,
  	"git_publication_merge_sha" varchar,
  	"git_publication_released_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_taxonomies_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_taxonomies_v_version_capabilities" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_taxonomies_v_version_inputs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_taxonomies_v_version_outputs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_taxonomies_v_version_limitations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_taxonomies_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_taxonomy_key" varchar,
  	"version_axis" "enum__taxonomies_v_version_axis",
  	"version_locale" "enum__taxonomies_v_version_locale",
  	"version_source_locale" "enum__taxonomies_v_version_source_locale",
  	"version_slug" varchar,
  	"version_name" varchar,
  	"version_description" varchar,
  	"version_official_url" varchar,
  	"version_translation_translation_status" "enum__taxonomies_v_version_translation_translation_status" DEFAULT 'draft',
  	"version_translation_translated_from_revision" varchar,
  	"version_translation_reviewer" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_robots" "enum__taxonomies_v_version_seo_robots" DEFAULT 'noindex,nofollow',
  	"version_beta_preview" jsonb,
  	"version_git_publication_state" "enum__taxonomies_v_version_git_publication_state" DEFAULT 'unpublished',
  	"version_git_publication_pull_request_number" numeric,
  	"version_git_publication_pull_request_url" varchar,
  	"version_git_publication_merge_sha" varchar,
  	"version_git_publication_released_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__taxonomies_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "source_evidence" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"artifact_id" integer,
  	"record_type" "enum_source_evidence_record_type",
  	"source_platform" "enum_source_evidence_source_platform",
  	"source_url" varchar,
  	"source_id" varchar,
  	"creator_handle" varchar,
  	"source_published_date" timestamp(3) with time zone,
  	"observed_at" timestamp(3) with time zone,
  	"evidence_type" varchar,
  	"evidence_url" varchar,
  	"confidence" numeric,
  	"notes" varchar,
  	"rights_status" "enum_source_evidence_rights_status" DEFAULT 'review_required',
  	"basis" varchar,
  	"reviewed_by" varchar,
  	"reviewed_at" timestamp(3) with time zone,
  	"license_reference" varchar,
  	"author_name" varchar,
  	"author_handle" varchar,
  	"author_url" varchar,
  	"original_post_url" varchar,
  	"policy_version" varchar,
  	"risk_accepted_by" varchar,
  	"risk_accepted_at" timestamp(3) with time zone,
  	"takedown_url" varchar,
  	"takedown_case_id" varchar,
  	"takedown_handled_by" varchar,
  	"takedown_handled_at" timestamp(3) with time zone,
  	"takedown_scope" varchar,
  	"is_primary_source" boolean DEFAULT false,
  	"beta_preview" jsonb,
  	"git_publication_state" "enum_source_evidence_git_publication_state" DEFAULT 'unpublished',
  	"git_publication_pull_request_number" numeric,
  	"git_publication_pull_request_url" varchar,
  	"git_publication_merge_sha" varchar,
  	"git_publication_released_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_source_evidence_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_source_evidence_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_artifact_id" integer,
  	"version_record_type" "enum__source_evidence_v_version_record_type",
  	"version_source_platform" "enum__source_evidence_v_version_source_platform",
  	"version_source_url" varchar,
  	"version_source_id" varchar,
  	"version_creator_handle" varchar,
  	"version_source_published_date" timestamp(3) with time zone,
  	"version_observed_at" timestamp(3) with time zone,
  	"version_evidence_type" varchar,
  	"version_evidence_url" varchar,
  	"version_confidence" numeric,
  	"version_notes" varchar,
  	"version_rights_status" "enum__source_evidence_v_version_rights_status" DEFAULT 'review_required',
  	"version_basis" varchar,
  	"version_reviewed_by" varchar,
  	"version_reviewed_at" timestamp(3) with time zone,
  	"version_license_reference" varchar,
  	"version_author_name" varchar,
  	"version_author_handle" varchar,
  	"version_author_url" varchar,
  	"version_original_post_url" varchar,
  	"version_policy_version" varchar,
  	"version_risk_accepted_by" varchar,
  	"version_risk_accepted_at" timestamp(3) with time zone,
  	"version_takedown_url" varchar,
  	"version_takedown_case_id" varchar,
  	"version_takedown_handled_by" varchar,
  	"version_takedown_handled_at" timestamp(3) with time zone,
  	"version_takedown_scope" varchar,
  	"version_is_primary_source" boolean DEFAULT false,
  	"version_beta_preview" jsonb,
  	"version_git_publication_state" "enum__source_evidence_v_version_git_publication_state" DEFAULT 'unpublished',
  	"version_git_publication_pull_request_number" numeric,
  	"version_git_publication_pull_request_url" varchar,
  	"version_git_publication_merge_sha" varchar,
  	"version_git_publication_released_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__source_evidence_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "publication_decision_sequences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"artifact_id" integer NOT NULL,
  	"artifact_key" varchar NOT NULL,
  	"locale" "enum_publication_decision_sequences_locale" NOT NULL,
  	"kind" "enum_publication_decision_sequences_kind" NOT NULL,
  	"event_key" varchar NOT NULL,
  	"decision_fingerprint" varchar NOT NULL,
  	"decided_by_id" integer NOT NULL,
  	"decided_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "content_approvals_files" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"path" varchar NOT NULL,
  	"byte_length" numeric NOT NULL,
  	"sha256" varchar NOT NULL
  );
  
  CREATE TABLE "content_approvals" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"artifact_id" integer NOT NULL,
  	"artifact_key" varchar NOT NULL,
  	"locale" "enum_content_approvals_locale" NOT NULL,
  	"content_revision" varchar NOT NULL,
  	"source_revision" varchar NOT NULL,
  	"rights_revision" varchar NOT NULL,
  	"rights_policy_version" varchar NOT NULL,
  	"decision" "enum_content_approvals_decision" NOT NULL,
  	"approved_by_id" integer NOT NULL,
  	"approved_at" timestamp(3) with time zone NOT NULL,
  	"decision_sequence_id" integer NOT NULL,
  	"decision_fingerprint" varchar NOT NULL,
  	"idempotency_key" varchar NOT NULL,
  	"file_count" numeric NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "content_withdrawals" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"artifact_id" integer NOT NULL,
  	"artifact_key" varchar NOT NULL,
  	"locale" "enum_content_withdrawals_locale" NOT NULL,
  	"decision" "enum_content_withdrawals_decision" NOT NULL,
  	"case_id" varchar NOT NULL,
  	"rights_revision" varchar NOT NULL,
  	"withdrawn_by_id" integer NOT NULL,
  	"withdrawn_at" timestamp(3) with time zone NOT NULL,
  	"decision_sequence_id" integer NOT NULL,
  	"decision_fingerprint" varchar NOT NULL,
  	"idempotency_key" varchar NOT NULL,
  	"sync_dispatch_mode" "enum_content_withdrawals_sync_dispatch_mode" NOT NULL,
  	"sync_event_type" "enum_content_withdrawals_sync_event_type" NOT NULL,
  	"sync_priority" "enum_content_withdrawals_sync_priority" NOT NULL,
  	"sync_requested_at" timestamp(3) with time zone NOT NULL,
  	"sync_event_revision" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "publication_requests_requested_locales" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"locale" "enum_publication_requests_requested_locales_locale" NOT NULL
  );
  
  CREATE TABLE "publication_requests_checks" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"status" "enum_publication_requests_checks_status" NOT NULL
  );
  
  CREATE TABLE "publication_requests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"artifact_id" integer NOT NULL,
  	"artifact_key" varchar NOT NULL,
  	"expected_base_sha" varchar NOT NULL,
  	"expected_content_revision" varchar NOT NULL,
  	"expected_source_revision" varchar NOT NULL,
  	"validated_content_revision" varchar NOT NULL,
  	"validated_source_revision" varchar NOT NULL,
  	"commit_message" varchar NOT NULL,
  	"idempotency_key" varchar NOT NULL,
  	"request_fingerprint" varchar NOT NULL,
  	"requested_by_id" integer NOT NULL,
  	"status" "enum_publication_requests_status" NOT NULL,
  	"provider" "enum_publication_requests_provider",
  	"planned_branch" varchar,
  	"branch" varchar,
  	"commit_sha" varchar,
  	"pull_request_number" numeric,
  	"pull_request_url" varchar,
  	"error_code" varchar,
  	"error_detail" varchar,
  	"merge_sha" varchar,
  	"released_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"prompt_artifacts_id" integer,
  	"locale_variants_id" integer,
  	"taxonomies_id" integer,
  	"source_evidence_id" integer,
  	"publication_decision_sequences_id" integer,
  	"content_approvals_id" integer,
  	"content_withdrawals_id" integer,
  	"publication_requests_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_roles" ADD CONSTRAINT "users_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "prompt_artifacts_prompt_variables_options" ADD CONSTRAINT "prompt_artifacts_prompt_variables_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."prompt_artifacts_prompt_variables"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "prompt_artifacts_prompt_variables" ADD CONSTRAINT "prompt_artifacts_prompt_variables_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."prompt_artifacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "prompt_artifacts_outcome_platforms" ADD CONSTRAINT "prompt_artifacts_outcome_platforms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."prompt_artifacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "prompt_artifacts_required_inputs" ADD CONSTRAINT "prompt_artifacts_required_inputs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."prompt_artifacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "prompt_artifacts_optional_inputs" ADD CONSTRAINT "prompt_artifacts_optional_inputs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."prompt_artifacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "prompt_artifacts_parameters_options" ADD CONSTRAINT "prompt_artifacts_parameters_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."prompt_artifacts_parameters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "prompt_artifacts_parameters" ADD CONSTRAINT "prompt_artifacts_parameters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."prompt_artifacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "prompt_artifacts_media" ADD CONSTRAINT "prompt_artifacts_media_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."prompt_artifacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "prompt_artifacts_examples" ADD CONSTRAINT "prompt_artifacts_examples_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."prompt_artifacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "prompt_artifacts" ADD CONSTRAINT "prompt_artifacts_creator_id_taxonomies_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."taxonomies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "prompt_artifacts_rels" ADD CONSTRAINT "prompt_artifacts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."prompt_artifacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "prompt_artifacts_rels" ADD CONSTRAINT "prompt_artifacts_rels_taxonomies_fk" FOREIGN KEY ("taxonomies_id") REFERENCES "public"."taxonomies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "prompt_artifacts_rels" ADD CONSTRAINT "prompt_artifacts_rels_prompt_artifacts_fk" FOREIGN KEY ("prompt_artifacts_id") REFERENCES "public"."prompt_artifacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "prompt_artifacts_rels" ADD CONSTRAINT "prompt_artifacts_rels_source_evidence_fk" FOREIGN KEY ("source_evidence_id") REFERENCES "public"."source_evidence"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_prompt_artifacts_v_version_prompt_variables_options" ADD CONSTRAINT "_prompt_artifacts_v_version_prompt_variables_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_prompt_artifacts_v_version_prompt_variables"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_prompt_artifacts_v_version_prompt_variables" ADD CONSTRAINT "_prompt_artifacts_v_version_prompt_variables_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_prompt_artifacts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_prompt_artifacts_v_version_outcome_platforms" ADD CONSTRAINT "_prompt_artifacts_v_version_outcome_platforms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_prompt_artifacts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_prompt_artifacts_v_version_required_inputs" ADD CONSTRAINT "_prompt_artifacts_v_version_required_inputs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_prompt_artifacts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_prompt_artifacts_v_version_optional_inputs" ADD CONSTRAINT "_prompt_artifacts_v_version_optional_inputs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_prompt_artifacts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_prompt_artifacts_v_version_parameters_options" ADD CONSTRAINT "_prompt_artifacts_v_version_parameters_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_prompt_artifacts_v_version_parameters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_prompt_artifacts_v_version_parameters" ADD CONSTRAINT "_prompt_artifacts_v_version_parameters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_prompt_artifacts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_prompt_artifacts_v_version_media" ADD CONSTRAINT "_prompt_artifacts_v_version_media_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_prompt_artifacts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_prompt_artifacts_v_version_examples" ADD CONSTRAINT "_prompt_artifacts_v_version_examples_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_prompt_artifacts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_prompt_artifacts_v" ADD CONSTRAINT "_prompt_artifacts_v_parent_id_prompt_artifacts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."prompt_artifacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_prompt_artifacts_v" ADD CONSTRAINT "_prompt_artifacts_v_version_creator_id_taxonomies_id_fk" FOREIGN KEY ("version_creator_id") REFERENCES "public"."taxonomies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_prompt_artifacts_v_rels" ADD CONSTRAINT "_prompt_artifacts_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_prompt_artifacts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_prompt_artifacts_v_rels" ADD CONSTRAINT "_prompt_artifacts_v_rels_taxonomies_fk" FOREIGN KEY ("taxonomies_id") REFERENCES "public"."taxonomies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_prompt_artifacts_v_rels" ADD CONSTRAINT "_prompt_artifacts_v_rels_prompt_artifacts_fk" FOREIGN KEY ("prompt_artifacts_id") REFERENCES "public"."prompt_artifacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_prompt_artifacts_v_rels" ADD CONSTRAINT "_prompt_artifacts_v_rels_source_evidence_fk" FOREIGN KEY ("source_evidence_id") REFERENCES "public"."source_evidence"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "locale_variants_localized_outcome_characteristics" ADD CONSTRAINT "locale_variants_localized_outcome_characteristics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."locale_variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "locale_variants_workflow" ADD CONSTRAINT "locale_variants_workflow_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."locale_variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "locale_variants" ADD CONSTRAINT "locale_variants_artifact_id_prompt_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."prompt_artifacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_locale_variants_v_version_localized_outcome_characteristics" ADD CONSTRAINT "_locale_variants_v_version_localized_outcome_characteristics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_locale_variants_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_locale_variants_v_version_workflow" ADD CONSTRAINT "_locale_variants_v_version_workflow_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_locale_variants_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_locale_variants_v" ADD CONSTRAINT "_locale_variants_v_parent_id_locale_variants_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."locale_variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_locale_variants_v" ADD CONSTRAINT "_locale_variants_v_version_artifact_id_prompt_artifacts_id_fk" FOREIGN KEY ("version_artifact_id") REFERENCES "public"."prompt_artifacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "taxonomies_capabilities" ADD CONSTRAINT "taxonomies_capabilities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."taxonomies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "taxonomies_inputs" ADD CONSTRAINT "taxonomies_inputs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."taxonomies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "taxonomies_outputs" ADD CONSTRAINT "taxonomies_outputs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."taxonomies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "taxonomies_limitations" ADD CONSTRAINT "taxonomies_limitations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."taxonomies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_taxonomies_v_version_capabilities" ADD CONSTRAINT "_taxonomies_v_version_capabilities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_taxonomies_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_taxonomies_v_version_inputs" ADD CONSTRAINT "_taxonomies_v_version_inputs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_taxonomies_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_taxonomies_v_version_outputs" ADD CONSTRAINT "_taxonomies_v_version_outputs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_taxonomies_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_taxonomies_v_version_limitations" ADD CONSTRAINT "_taxonomies_v_version_limitations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_taxonomies_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_taxonomies_v" ADD CONSTRAINT "_taxonomies_v_parent_id_taxonomies_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."taxonomies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "source_evidence" ADD CONSTRAINT "source_evidence_artifact_id_prompt_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."prompt_artifacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_source_evidence_v" ADD CONSTRAINT "_source_evidence_v_parent_id_source_evidence_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."source_evidence"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_source_evidence_v" ADD CONSTRAINT "_source_evidence_v_version_artifact_id_prompt_artifacts_id_fk" FOREIGN KEY ("version_artifact_id") REFERENCES "public"."prompt_artifacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "publication_decision_sequences" ADD CONSTRAINT "publication_decision_sequences_artifact_id_prompt_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."prompt_artifacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "publication_decision_sequences" ADD CONSTRAINT "publication_decision_sequences_decided_by_id_users_id_fk" FOREIGN KEY ("decided_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_approvals_files" ADD CONSTRAINT "content_approvals_files_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."content_approvals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "content_approvals" ADD CONSTRAINT "content_approvals_artifact_id_prompt_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."prompt_artifacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_approvals" ADD CONSTRAINT "content_approvals_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_approvals" ADD CONSTRAINT "content_approvals_decision_sequence_id_publication_decision_sequences_id_fk" FOREIGN KEY ("decision_sequence_id") REFERENCES "public"."publication_decision_sequences"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_withdrawals" ADD CONSTRAINT "content_withdrawals_artifact_id_prompt_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."prompt_artifacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_withdrawals" ADD CONSTRAINT "content_withdrawals_withdrawn_by_id_users_id_fk" FOREIGN KEY ("withdrawn_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_withdrawals" ADD CONSTRAINT "content_withdrawals_decision_sequence_id_publication_decision_sequences_id_fk" FOREIGN KEY ("decision_sequence_id") REFERENCES "public"."publication_decision_sequences"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "publication_requests_requested_locales" ADD CONSTRAINT "publication_requests_requested_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."publication_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "publication_requests_checks" ADD CONSTRAINT "publication_requests_checks_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."publication_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "publication_requests" ADD CONSTRAINT "publication_requests_artifact_id_prompt_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."prompt_artifacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "publication_requests" ADD CONSTRAINT "publication_requests_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_prompt_artifacts_fk" FOREIGN KEY ("prompt_artifacts_id") REFERENCES "public"."prompt_artifacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_locale_variants_fk" FOREIGN KEY ("locale_variants_id") REFERENCES "public"."locale_variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_taxonomies_fk" FOREIGN KEY ("taxonomies_id") REFERENCES "public"."taxonomies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_source_evidence_fk" FOREIGN KEY ("source_evidence_id") REFERENCES "public"."source_evidence"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_publication_decision_sequen_fk" FOREIGN KEY ("publication_decision_sequences_id") REFERENCES "public"."publication_decision_sequences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_approvals_fk" FOREIGN KEY ("content_approvals_id") REFERENCES "public"."content_approvals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_withdrawals_fk" FOREIGN KEY ("content_withdrawals_id") REFERENCES "public"."content_withdrawals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_publication_requests_fk" FOREIGN KEY ("publication_requests_id") REFERENCES "public"."publication_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_roles_order_idx" ON "users_roles" USING btree ("order");
  CREATE INDEX "users_roles_parent_idx" ON "users_roles" USING btree ("parent_id");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "prompt_artifacts_prompt_variables_options_order_idx" ON "prompt_artifacts_prompt_variables_options" USING btree ("_order");
  CREATE INDEX "prompt_artifacts_prompt_variables_options_parent_id_idx" ON "prompt_artifacts_prompt_variables_options" USING btree ("_parent_id");
  CREATE INDEX "prompt_artifacts_prompt_variables_order_idx" ON "prompt_artifacts_prompt_variables" USING btree ("_order");
  CREATE INDEX "prompt_artifacts_prompt_variables_parent_id_idx" ON "prompt_artifacts_prompt_variables" USING btree ("_parent_id");
  CREATE INDEX "prompt_artifacts_outcome_platforms_order_idx" ON "prompt_artifacts_outcome_platforms" USING btree ("_order");
  CREATE INDEX "prompt_artifacts_outcome_platforms_parent_id_idx" ON "prompt_artifacts_outcome_platforms" USING btree ("_parent_id");
  CREATE INDEX "prompt_artifacts_required_inputs_order_idx" ON "prompt_artifacts_required_inputs" USING btree ("_order");
  CREATE INDEX "prompt_artifacts_required_inputs_parent_id_idx" ON "prompt_artifacts_required_inputs" USING btree ("_parent_id");
  CREATE INDEX "prompt_artifacts_optional_inputs_order_idx" ON "prompt_artifacts_optional_inputs" USING btree ("_order");
  CREATE INDEX "prompt_artifacts_optional_inputs_parent_id_idx" ON "prompt_artifacts_optional_inputs" USING btree ("_parent_id");
  CREATE INDEX "prompt_artifacts_parameters_options_order_idx" ON "prompt_artifacts_parameters_options" USING btree ("_order");
  CREATE INDEX "prompt_artifacts_parameters_options_parent_id_idx" ON "prompt_artifacts_parameters_options" USING btree ("_parent_id");
  CREATE INDEX "prompt_artifacts_parameters_order_idx" ON "prompt_artifacts_parameters" USING btree ("_order");
  CREATE INDEX "prompt_artifacts_parameters_parent_id_idx" ON "prompt_artifacts_parameters" USING btree ("_parent_id");
  CREATE INDEX "prompt_artifacts_media_order_idx" ON "prompt_artifacts_media" USING btree ("_order");
  CREATE INDEX "prompt_artifacts_media_parent_id_idx" ON "prompt_artifacts_media" USING btree ("_parent_id");
  CREATE INDEX "prompt_artifacts_examples_order_idx" ON "prompt_artifacts_examples" USING btree ("_order");
  CREATE INDEX "prompt_artifacts_examples_parent_id_idx" ON "prompt_artifacts_examples" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "prompt_artifacts_artifact_key_idx" ON "prompt_artifacts" USING btree ("artifact_key");
  CREATE INDEX "prompt_artifacts_creator_idx" ON "prompt_artifacts" USING btree ("creator_id");
  CREATE INDEX "prompt_artifacts_updated_at_idx" ON "prompt_artifacts" USING btree ("updated_at");
  CREATE INDEX "prompt_artifacts_created_at_idx" ON "prompt_artifacts" USING btree ("created_at");
  CREATE INDEX "prompt_artifacts__status_idx" ON "prompt_artifacts" USING btree ("_status");
  CREATE INDEX "prompt_artifacts_rels_order_idx" ON "prompt_artifacts_rels" USING btree ("order");
  CREATE INDEX "prompt_artifacts_rels_parent_idx" ON "prompt_artifacts_rels" USING btree ("parent_id");
  CREATE INDEX "prompt_artifacts_rels_path_idx" ON "prompt_artifacts_rels" USING btree ("path");
  CREATE INDEX "prompt_artifacts_rels_taxonomies_id_idx" ON "prompt_artifacts_rels" USING btree ("taxonomies_id");
  CREATE INDEX "prompt_artifacts_rels_prompt_artifacts_id_idx" ON "prompt_artifacts_rels" USING btree ("prompt_artifacts_id");
  CREATE INDEX "prompt_artifacts_rels_source_evidence_id_idx" ON "prompt_artifacts_rels" USING btree ("source_evidence_id");
  CREATE INDEX "_prompt_artifacts_v_version_prompt_variables_options_order_idx" ON "_prompt_artifacts_v_version_prompt_variables_options" USING btree ("_order");
  CREATE INDEX "_prompt_artifacts_v_version_prompt_variables_options_parent_id_idx" ON "_prompt_artifacts_v_version_prompt_variables_options" USING btree ("_parent_id");
  CREATE INDEX "_prompt_artifacts_v_version_prompt_variables_order_idx" ON "_prompt_artifacts_v_version_prompt_variables" USING btree ("_order");
  CREATE INDEX "_prompt_artifacts_v_version_prompt_variables_parent_id_idx" ON "_prompt_artifacts_v_version_prompt_variables" USING btree ("_parent_id");
  CREATE INDEX "_prompt_artifacts_v_version_outcome_platforms_order_idx" ON "_prompt_artifacts_v_version_outcome_platforms" USING btree ("_order");
  CREATE INDEX "_prompt_artifacts_v_version_outcome_platforms_parent_id_idx" ON "_prompt_artifacts_v_version_outcome_platforms" USING btree ("_parent_id");
  CREATE INDEX "_prompt_artifacts_v_version_required_inputs_order_idx" ON "_prompt_artifacts_v_version_required_inputs" USING btree ("_order");
  CREATE INDEX "_prompt_artifacts_v_version_required_inputs_parent_id_idx" ON "_prompt_artifacts_v_version_required_inputs" USING btree ("_parent_id");
  CREATE INDEX "_prompt_artifacts_v_version_optional_inputs_order_idx" ON "_prompt_artifacts_v_version_optional_inputs" USING btree ("_order");
  CREATE INDEX "_prompt_artifacts_v_version_optional_inputs_parent_id_idx" ON "_prompt_artifacts_v_version_optional_inputs" USING btree ("_parent_id");
  CREATE INDEX "_prompt_artifacts_v_version_parameters_options_order_idx" ON "_prompt_artifacts_v_version_parameters_options" USING btree ("_order");
  CREATE INDEX "_prompt_artifacts_v_version_parameters_options_parent_id_idx" ON "_prompt_artifacts_v_version_parameters_options" USING btree ("_parent_id");
  CREATE INDEX "_prompt_artifacts_v_version_parameters_order_idx" ON "_prompt_artifacts_v_version_parameters" USING btree ("_order");
  CREATE INDEX "_prompt_artifacts_v_version_parameters_parent_id_idx" ON "_prompt_artifacts_v_version_parameters" USING btree ("_parent_id");
  CREATE INDEX "_prompt_artifacts_v_version_media_order_idx" ON "_prompt_artifacts_v_version_media" USING btree ("_order");
  CREATE INDEX "_prompt_artifacts_v_version_media_parent_id_idx" ON "_prompt_artifacts_v_version_media" USING btree ("_parent_id");
  CREATE INDEX "_prompt_artifacts_v_version_examples_order_idx" ON "_prompt_artifacts_v_version_examples" USING btree ("_order");
  CREATE INDEX "_prompt_artifacts_v_version_examples_parent_id_idx" ON "_prompt_artifacts_v_version_examples" USING btree ("_parent_id");
  CREATE INDEX "_prompt_artifacts_v_parent_idx" ON "_prompt_artifacts_v" USING btree ("parent_id");
  CREATE INDEX "_prompt_artifacts_v_version_version_artifact_key_idx" ON "_prompt_artifacts_v" USING btree ("version_artifact_key");
  CREATE INDEX "_prompt_artifacts_v_version_version_creator_idx" ON "_prompt_artifacts_v" USING btree ("version_creator_id");
  CREATE INDEX "_prompt_artifacts_v_version_version_updated_at_idx" ON "_prompt_artifacts_v" USING btree ("version_updated_at");
  CREATE INDEX "_prompt_artifacts_v_version_version_created_at_idx" ON "_prompt_artifacts_v" USING btree ("version_created_at");
  CREATE INDEX "_prompt_artifacts_v_version_version__status_idx" ON "_prompt_artifacts_v" USING btree ("version__status");
  CREATE INDEX "_prompt_artifacts_v_created_at_idx" ON "_prompt_artifacts_v" USING btree ("created_at");
  CREATE INDEX "_prompt_artifacts_v_updated_at_idx" ON "_prompt_artifacts_v" USING btree ("updated_at");
  CREATE INDEX "_prompt_artifacts_v_latest_idx" ON "_prompt_artifacts_v" USING btree ("latest");
  CREATE INDEX "_prompt_artifacts_v_rels_order_idx" ON "_prompt_artifacts_v_rels" USING btree ("order");
  CREATE INDEX "_prompt_artifacts_v_rels_parent_idx" ON "_prompt_artifacts_v_rels" USING btree ("parent_id");
  CREATE INDEX "_prompt_artifacts_v_rels_path_idx" ON "_prompt_artifacts_v_rels" USING btree ("path");
  CREATE INDEX "_prompt_artifacts_v_rels_taxonomies_id_idx" ON "_prompt_artifacts_v_rels" USING btree ("taxonomies_id");
  CREATE INDEX "_prompt_artifacts_v_rels_prompt_artifacts_id_idx" ON "_prompt_artifacts_v_rels" USING btree ("prompt_artifacts_id");
  CREATE INDEX "_prompt_artifacts_v_rels_source_evidence_id_idx" ON "_prompt_artifacts_v_rels" USING btree ("source_evidence_id");
  CREATE INDEX "locale_variants_localized_outcome_characteristics_order_idx" ON "locale_variants_localized_outcome_characteristics" USING btree ("_order");
  CREATE INDEX "locale_variants_localized_outcome_characteristics_parent_id_idx" ON "locale_variants_localized_outcome_characteristics" USING btree ("_parent_id");
  CREATE INDEX "locale_variants_workflow_order_idx" ON "locale_variants_workflow" USING btree ("_order");
  CREATE INDEX "locale_variants_workflow_parent_id_idx" ON "locale_variants_workflow" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "locale_variants_locale_variant_key_idx" ON "locale_variants" USING btree ("locale_variant_key");
  CREATE INDEX "locale_variants_artifact_idx" ON "locale_variants" USING btree ("artifact_id");
  CREATE INDEX "locale_variants_locale_idx" ON "locale_variants" USING btree ("locale");
  CREATE INDEX "locale_variants_slug_idx" ON "locale_variants" USING btree ("slug");
  CREATE INDEX "locale_variants_updated_at_idx" ON "locale_variants" USING btree ("updated_at");
  CREATE INDEX "locale_variants_created_at_idx" ON "locale_variants" USING btree ("created_at");
  CREATE INDEX "locale_variants__status_idx" ON "locale_variants" USING btree ("_status");
  CREATE INDEX "_locale_variants_v_version_localized_outcome_characteristics_order_idx" ON "_locale_variants_v_version_localized_outcome_characteristics" USING btree ("_order");
  CREATE INDEX "_locale_variants_v_version_localized_outcome_characteristics_parent_id_idx" ON "_locale_variants_v_version_localized_outcome_characteristics" USING btree ("_parent_id");
  CREATE INDEX "_locale_variants_v_version_workflow_order_idx" ON "_locale_variants_v_version_workflow" USING btree ("_order");
  CREATE INDEX "_locale_variants_v_version_workflow_parent_id_idx" ON "_locale_variants_v_version_workflow" USING btree ("_parent_id");
  CREATE INDEX "_locale_variants_v_parent_idx" ON "_locale_variants_v" USING btree ("parent_id");
  CREATE INDEX "_locale_variants_v_version_version_locale_variant_key_idx" ON "_locale_variants_v" USING btree ("version_locale_variant_key");
  CREATE INDEX "_locale_variants_v_version_version_artifact_idx" ON "_locale_variants_v" USING btree ("version_artifact_id");
  CREATE INDEX "_locale_variants_v_version_version_locale_idx" ON "_locale_variants_v" USING btree ("version_locale");
  CREATE INDEX "_locale_variants_v_version_version_slug_idx" ON "_locale_variants_v" USING btree ("version_slug");
  CREATE INDEX "_locale_variants_v_version_version_updated_at_idx" ON "_locale_variants_v" USING btree ("version_updated_at");
  CREATE INDEX "_locale_variants_v_version_version_created_at_idx" ON "_locale_variants_v" USING btree ("version_created_at");
  CREATE INDEX "_locale_variants_v_version_version__status_idx" ON "_locale_variants_v" USING btree ("version__status");
  CREATE INDEX "_locale_variants_v_created_at_idx" ON "_locale_variants_v" USING btree ("created_at");
  CREATE INDEX "_locale_variants_v_updated_at_idx" ON "_locale_variants_v" USING btree ("updated_at");
  CREATE INDEX "_locale_variants_v_latest_idx" ON "_locale_variants_v" USING btree ("latest");
  CREATE INDEX "taxonomies_capabilities_order_idx" ON "taxonomies_capabilities" USING btree ("_order");
  CREATE INDEX "taxonomies_capabilities_parent_id_idx" ON "taxonomies_capabilities" USING btree ("_parent_id");
  CREATE INDEX "taxonomies_inputs_order_idx" ON "taxonomies_inputs" USING btree ("_order");
  CREATE INDEX "taxonomies_inputs_parent_id_idx" ON "taxonomies_inputs" USING btree ("_parent_id");
  CREATE INDEX "taxonomies_outputs_order_idx" ON "taxonomies_outputs" USING btree ("_order");
  CREATE INDEX "taxonomies_outputs_parent_id_idx" ON "taxonomies_outputs" USING btree ("_parent_id");
  CREATE INDEX "taxonomies_limitations_order_idx" ON "taxonomies_limitations" USING btree ("_order");
  CREATE INDEX "taxonomies_limitations_parent_id_idx" ON "taxonomies_limitations" USING btree ("_parent_id");
  CREATE INDEX "taxonomies_taxonomy_key_idx" ON "taxonomies" USING btree ("taxonomy_key");
  CREATE INDEX "taxonomies_locale_idx" ON "taxonomies" USING btree ("locale");
  CREATE INDEX "taxonomies_slug_idx" ON "taxonomies" USING btree ("slug");
  CREATE INDEX "taxonomies_updated_at_idx" ON "taxonomies" USING btree ("updated_at");
  CREATE INDEX "taxonomies_created_at_idx" ON "taxonomies" USING btree ("created_at");
  CREATE INDEX "taxonomies__status_idx" ON "taxonomies" USING btree ("_status");
  CREATE INDEX "_taxonomies_v_version_capabilities_order_idx" ON "_taxonomies_v_version_capabilities" USING btree ("_order");
  CREATE INDEX "_taxonomies_v_version_capabilities_parent_id_idx" ON "_taxonomies_v_version_capabilities" USING btree ("_parent_id");
  CREATE INDEX "_taxonomies_v_version_inputs_order_idx" ON "_taxonomies_v_version_inputs" USING btree ("_order");
  CREATE INDEX "_taxonomies_v_version_inputs_parent_id_idx" ON "_taxonomies_v_version_inputs" USING btree ("_parent_id");
  CREATE INDEX "_taxonomies_v_version_outputs_order_idx" ON "_taxonomies_v_version_outputs" USING btree ("_order");
  CREATE INDEX "_taxonomies_v_version_outputs_parent_id_idx" ON "_taxonomies_v_version_outputs" USING btree ("_parent_id");
  CREATE INDEX "_taxonomies_v_version_limitations_order_idx" ON "_taxonomies_v_version_limitations" USING btree ("_order");
  CREATE INDEX "_taxonomies_v_version_limitations_parent_id_idx" ON "_taxonomies_v_version_limitations" USING btree ("_parent_id");
  CREATE INDEX "_taxonomies_v_parent_idx" ON "_taxonomies_v" USING btree ("parent_id");
  CREATE INDEX "_taxonomies_v_version_version_taxonomy_key_idx" ON "_taxonomies_v" USING btree ("version_taxonomy_key");
  CREATE INDEX "_taxonomies_v_version_version_locale_idx" ON "_taxonomies_v" USING btree ("version_locale");
  CREATE INDEX "_taxonomies_v_version_version_slug_idx" ON "_taxonomies_v" USING btree ("version_slug");
  CREATE INDEX "_taxonomies_v_version_version_updated_at_idx" ON "_taxonomies_v" USING btree ("version_updated_at");
  CREATE INDEX "_taxonomies_v_version_version_created_at_idx" ON "_taxonomies_v" USING btree ("version_created_at");
  CREATE INDEX "_taxonomies_v_version_version__status_idx" ON "_taxonomies_v" USING btree ("version__status");
  CREATE INDEX "_taxonomies_v_created_at_idx" ON "_taxonomies_v" USING btree ("created_at");
  CREATE INDEX "_taxonomies_v_updated_at_idx" ON "_taxonomies_v" USING btree ("updated_at");
  CREATE INDEX "_taxonomies_v_latest_idx" ON "_taxonomies_v" USING btree ("latest");
  CREATE INDEX "source_evidence_artifact_idx" ON "source_evidence" USING btree ("artifact_id");
  CREATE INDEX "source_evidence_updated_at_idx" ON "source_evidence" USING btree ("updated_at");
  CREATE INDEX "source_evidence_created_at_idx" ON "source_evidence" USING btree ("created_at");
  CREATE INDEX "source_evidence__status_idx" ON "source_evidence" USING btree ("_status");
  CREATE INDEX "_source_evidence_v_parent_idx" ON "_source_evidence_v" USING btree ("parent_id");
  CREATE INDEX "_source_evidence_v_version_version_artifact_idx" ON "_source_evidence_v" USING btree ("version_artifact_id");
  CREATE INDEX "_source_evidence_v_version_version_updated_at_idx" ON "_source_evidence_v" USING btree ("version_updated_at");
  CREATE INDEX "_source_evidence_v_version_version_created_at_idx" ON "_source_evidence_v" USING btree ("version_created_at");
  CREATE INDEX "_source_evidence_v_version_version__status_idx" ON "_source_evidence_v" USING btree ("version__status");
  CREATE INDEX "_source_evidence_v_created_at_idx" ON "_source_evidence_v" USING btree ("created_at");
  CREATE INDEX "_source_evidence_v_updated_at_idx" ON "_source_evidence_v" USING btree ("updated_at");
  CREATE INDEX "_source_evidence_v_latest_idx" ON "_source_evidence_v" USING btree ("latest");
  CREATE INDEX "publication_decision_sequences_artifact_idx" ON "publication_decision_sequences" USING btree ("artifact_id");
  CREATE INDEX "publication_decision_sequences_artifact_key_idx" ON "publication_decision_sequences" USING btree ("artifact_key");
  CREATE INDEX "publication_decision_sequences_locale_idx" ON "publication_decision_sequences" USING btree ("locale");
  CREATE INDEX "publication_decision_sequences_kind_idx" ON "publication_decision_sequences" USING btree ("kind");
  CREATE UNIQUE INDEX "publication_decision_sequences_event_key_idx" ON "publication_decision_sequences" USING btree ("event_key");
  CREATE INDEX "publication_decision_sequences_decision_fingerprint_idx" ON "publication_decision_sequences" USING btree ("decision_fingerprint");
  CREATE INDEX "publication_decision_sequences_decided_by_idx" ON "publication_decision_sequences" USING btree ("decided_by_id");
  CREATE INDEX "publication_decision_sequences_decided_at_idx" ON "publication_decision_sequences" USING btree ("decided_at");
  CREATE INDEX "publication_decision_sequences_updated_at_idx" ON "publication_decision_sequences" USING btree ("updated_at");
  CREATE INDEX "publication_decision_sequences_created_at_idx" ON "publication_decision_sequences" USING btree ("created_at");
  CREATE INDEX "content_approvals_files_order_idx" ON "content_approvals_files" USING btree ("_order");
  CREATE INDEX "content_approvals_files_parent_id_idx" ON "content_approvals_files" USING btree ("_parent_id");
  CREATE INDEX "content_approvals_artifact_idx" ON "content_approvals" USING btree ("artifact_id");
  CREATE INDEX "content_approvals_artifact_key_idx" ON "content_approvals" USING btree ("artifact_key");
  CREATE INDEX "content_approvals_locale_idx" ON "content_approvals" USING btree ("locale");
  CREATE INDEX "content_approvals_content_revision_idx" ON "content_approvals" USING btree ("content_revision");
  CREATE INDEX "content_approvals_rights_revision_idx" ON "content_approvals" USING btree ("rights_revision");
  CREATE INDEX "content_approvals_approved_by_idx" ON "content_approvals" USING btree ("approved_by_id");
  CREATE UNIQUE INDEX "content_approvals_decision_sequence_idx" ON "content_approvals" USING btree ("decision_sequence_id");
  CREATE INDEX "content_approvals_decision_fingerprint_idx" ON "content_approvals" USING btree ("decision_fingerprint");
  CREATE UNIQUE INDEX "content_approvals_idempotency_key_idx" ON "content_approvals" USING btree ("idempotency_key");
  CREATE INDEX "content_approvals_updated_at_idx" ON "content_approvals" USING btree ("updated_at");
  CREATE INDEX "content_approvals_created_at_idx" ON "content_approvals" USING btree ("created_at");
  CREATE INDEX "content_withdrawals_artifact_idx" ON "content_withdrawals" USING btree ("artifact_id");
  CREATE INDEX "content_withdrawals_artifact_key_idx" ON "content_withdrawals" USING btree ("artifact_key");
  CREATE INDEX "content_withdrawals_locale_idx" ON "content_withdrawals" USING btree ("locale");
  CREATE INDEX "content_withdrawals_decision_idx" ON "content_withdrawals" USING btree ("decision");
  CREATE INDEX "content_withdrawals_case_id_idx" ON "content_withdrawals" USING btree ("case_id");
  CREATE INDEX "content_withdrawals_rights_revision_idx" ON "content_withdrawals" USING btree ("rights_revision");
  CREATE INDEX "content_withdrawals_withdrawn_by_idx" ON "content_withdrawals" USING btree ("withdrawn_by_id");
  CREATE INDEX "content_withdrawals_withdrawn_at_idx" ON "content_withdrawals" USING btree ("withdrawn_at");
  CREATE UNIQUE INDEX "content_withdrawals_decision_sequence_idx" ON "content_withdrawals" USING btree ("decision_sequence_id");
  CREATE INDEX "content_withdrawals_decision_fingerprint_idx" ON "content_withdrawals" USING btree ("decision_fingerprint");
  CREATE UNIQUE INDEX "content_withdrawals_idempotency_key_idx" ON "content_withdrawals" USING btree ("idempotency_key");
  CREATE INDEX "content_withdrawals_sync_requested_at_idx" ON "content_withdrawals" USING btree ("sync_requested_at");
  CREATE UNIQUE INDEX "content_withdrawals_sync_event_revision_idx" ON "content_withdrawals" USING btree ("sync_event_revision");
  CREATE INDEX "content_withdrawals_updated_at_idx" ON "content_withdrawals" USING btree ("updated_at");
  CREATE INDEX "content_withdrawals_created_at_idx" ON "content_withdrawals" USING btree ("created_at");
  CREATE INDEX "publication_requests_requested_locales_order_idx" ON "publication_requests_requested_locales" USING btree ("_order");
  CREATE INDEX "publication_requests_requested_locales_parent_id_idx" ON "publication_requests_requested_locales" USING btree ("_parent_id");
  CREATE INDEX "publication_requests_checks_order_idx" ON "publication_requests_checks" USING btree ("_order");
  CREATE INDEX "publication_requests_checks_parent_id_idx" ON "publication_requests_checks" USING btree ("_parent_id");
  CREATE INDEX "publication_requests_artifact_idx" ON "publication_requests" USING btree ("artifact_id");
  CREATE INDEX "publication_requests_artifact_key_idx" ON "publication_requests" USING btree ("artifact_key");
  CREATE UNIQUE INDEX "publication_requests_idempotency_key_idx" ON "publication_requests" USING btree ("idempotency_key");
  CREATE INDEX "publication_requests_requested_by_idx" ON "publication_requests" USING btree ("requested_by_id");
  CREATE INDEX "publication_requests_updated_at_idx" ON "publication_requests" USING btree ("updated_at");
  CREATE INDEX "publication_requests_created_at_idx" ON "publication_requests" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_prompt_artifacts_id_idx" ON "payload_locked_documents_rels" USING btree ("prompt_artifacts_id");
  CREATE INDEX "payload_locked_documents_rels_locale_variants_id_idx" ON "payload_locked_documents_rels" USING btree ("locale_variants_id");
  CREATE INDEX "payload_locked_documents_rels_taxonomies_id_idx" ON "payload_locked_documents_rels" USING btree ("taxonomies_id");
  CREATE INDEX "payload_locked_documents_rels_source_evidence_id_idx" ON "payload_locked_documents_rels" USING btree ("source_evidence_id");
  CREATE INDEX "payload_locked_documents_rels_publication_decision_seque_idx" ON "payload_locked_documents_rels" USING btree ("publication_decision_sequences_id");
  CREATE INDEX "payload_locked_documents_rels_content_approvals_id_idx" ON "payload_locked_documents_rels" USING btree ("content_approvals_id");
  CREATE INDEX "payload_locked_documents_rels_content_withdrawals_id_idx" ON "payload_locked_documents_rels" USING btree ("content_withdrawals_id");
  CREATE INDEX "payload_locked_documents_rels_publication_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("publication_requests_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_roles" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "prompt_artifacts_prompt_variables_options" CASCADE;
  DROP TABLE "prompt_artifacts_prompt_variables" CASCADE;
  DROP TABLE "prompt_artifacts_outcome_platforms" CASCADE;
  DROP TABLE "prompt_artifacts_required_inputs" CASCADE;
  DROP TABLE "prompt_artifacts_optional_inputs" CASCADE;
  DROP TABLE "prompt_artifacts_parameters_options" CASCADE;
  DROP TABLE "prompt_artifacts_parameters" CASCADE;
  DROP TABLE "prompt_artifacts_media" CASCADE;
  DROP TABLE "prompt_artifacts_examples" CASCADE;
  DROP TABLE "prompt_artifacts" CASCADE;
  DROP TABLE "prompt_artifacts_rels" CASCADE;
  DROP TABLE "_prompt_artifacts_v_version_prompt_variables_options" CASCADE;
  DROP TABLE "_prompt_artifacts_v_version_prompt_variables" CASCADE;
  DROP TABLE "_prompt_artifacts_v_version_outcome_platforms" CASCADE;
  DROP TABLE "_prompt_artifacts_v_version_required_inputs" CASCADE;
  DROP TABLE "_prompt_artifacts_v_version_optional_inputs" CASCADE;
  DROP TABLE "_prompt_artifacts_v_version_parameters_options" CASCADE;
  DROP TABLE "_prompt_artifacts_v_version_parameters" CASCADE;
  DROP TABLE "_prompt_artifacts_v_version_media" CASCADE;
  DROP TABLE "_prompt_artifacts_v_version_examples" CASCADE;
  DROP TABLE "_prompt_artifacts_v" CASCADE;
  DROP TABLE "_prompt_artifacts_v_rels" CASCADE;
  DROP TABLE "locale_variants_localized_outcome_characteristics" CASCADE;
  DROP TABLE "locale_variants_workflow" CASCADE;
  DROP TABLE "locale_variants" CASCADE;
  DROP TABLE "_locale_variants_v_version_localized_outcome_characteristics" CASCADE;
  DROP TABLE "_locale_variants_v_version_workflow" CASCADE;
  DROP TABLE "_locale_variants_v" CASCADE;
  DROP TABLE "taxonomies_capabilities" CASCADE;
  DROP TABLE "taxonomies_inputs" CASCADE;
  DROP TABLE "taxonomies_outputs" CASCADE;
  DROP TABLE "taxonomies_limitations" CASCADE;
  DROP TABLE "taxonomies" CASCADE;
  DROP TABLE "_taxonomies_v_version_capabilities" CASCADE;
  DROP TABLE "_taxonomies_v_version_inputs" CASCADE;
  DROP TABLE "_taxonomies_v_version_outputs" CASCADE;
  DROP TABLE "_taxonomies_v_version_limitations" CASCADE;
  DROP TABLE "_taxonomies_v" CASCADE;
  DROP TABLE "source_evidence" CASCADE;
  DROP TABLE "_source_evidence_v" CASCADE;
  DROP TABLE "publication_decision_sequences" CASCADE;
  DROP TABLE "content_approvals_files" CASCADE;
  DROP TABLE "content_approvals" CASCADE;
  DROP TABLE "content_withdrawals" CASCADE;
  DROP TABLE "publication_requests_requested_locales" CASCADE;
  DROP TABLE "publication_requests_checks" CASCADE;
  DROP TABLE "publication_requests" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_users_roles";
  DROP TYPE "public"."enum_prompt_artifacts_parameters_value_type";
  DROP TYPE "public"."enum_prompt_artifacts_media_media_type";
  DROP TYPE "public"."enum_prompt_artifacts_examples_output_media_type";
  DROP TYPE "public"."enum_prompt_artifacts_content_type";
  DROP TYPE "public"."enum_prompt_artifacts_source_locale";
  DROP TYPE "public"."enum_prompt_artifacts_draft_workflow_state";
  DROP TYPE "public"."enum_prompt_artifacts_outcome_output_type";
  DROP TYPE "public"."enum_prompt_artifacts_git_publication_state";
  DROP TYPE "public"."enum_prompt_artifacts_status";
  DROP TYPE "public"."enum__prompt_artifacts_v_version_parameters_value_type";
  DROP TYPE "public"."enum__prompt_artifacts_v_version_media_media_type";
  DROP TYPE "public"."enum__prompt_artifacts_v_version_examples_output_media_type";
  DROP TYPE "public"."enum__prompt_artifacts_v_version_content_type";
  DROP TYPE "public"."enum__prompt_artifacts_v_version_source_locale";
  DROP TYPE "public"."enum__prompt_artifacts_v_version_draft_workflow_state";
  DROP TYPE "public"."enum__prompt_artifacts_v_version_outcome_output_type";
  DROP TYPE "public"."enum__prompt_artifacts_v_version_git_publication_state";
  DROP TYPE "public"."enum__prompt_artifacts_v_version_status";
  DROP TYPE "public"."enum_locale_variants_locale";
  DROP TYPE "public"."enum_locale_variants_source_locale";
  DROP TYPE "public"."enum_locale_variants_translation_translation_status";
  DROP TYPE "public"."enum_locale_variants_seo_robots";
  DROP TYPE "public"."enum_locale_variants_git_publication_state";
  DROP TYPE "public"."enum_locale_variants_status";
  DROP TYPE "public"."enum__locale_variants_v_version_locale";
  DROP TYPE "public"."enum__locale_variants_v_version_source_locale";
  DROP TYPE "public"."enum__locale_variants_v_version_translation_translation_status";
  DROP TYPE "public"."enum__locale_variants_v_version_seo_robots";
  DROP TYPE "public"."enum__locale_variants_v_version_git_publication_state";
  DROP TYPE "public"."enum__locale_variants_v_version_status";
  DROP TYPE "public"."enum_taxonomies_axis";
  DROP TYPE "public"."enum_taxonomies_locale";
  DROP TYPE "public"."enum_taxonomies_source_locale";
  DROP TYPE "public"."enum_taxonomies_translation_translation_status";
  DROP TYPE "public"."enum_taxonomies_seo_robots";
  DROP TYPE "public"."enum_taxonomies_git_publication_state";
  DROP TYPE "public"."enum_taxonomies_status";
  DROP TYPE "public"."enum__taxonomies_v_version_axis";
  DROP TYPE "public"."enum__taxonomies_v_version_locale";
  DROP TYPE "public"."enum__taxonomies_v_version_source_locale";
  DROP TYPE "public"."enum__taxonomies_v_version_translation_translation_status";
  DROP TYPE "public"."enum__taxonomies_v_version_seo_robots";
  DROP TYPE "public"."enum__taxonomies_v_version_git_publication_state";
  DROP TYPE "public"."enum__taxonomies_v_version_status";
  DROP TYPE "public"."enum_source_evidence_record_type";
  DROP TYPE "public"."enum_source_evidence_source_platform";
  DROP TYPE "public"."enum_source_evidence_rights_status";
  DROP TYPE "public"."enum_source_evidence_git_publication_state";
  DROP TYPE "public"."enum_source_evidence_status";
  DROP TYPE "public"."enum__source_evidence_v_version_record_type";
  DROP TYPE "public"."enum__source_evidence_v_version_source_platform";
  DROP TYPE "public"."enum__source_evidence_v_version_rights_status";
  DROP TYPE "public"."enum__source_evidence_v_version_git_publication_state";
  DROP TYPE "public"."enum__source_evidence_v_version_status";
  DROP TYPE "public"."enum_publication_decision_sequences_locale";
  DROP TYPE "public"."enum_publication_decision_sequences_kind";
  DROP TYPE "public"."enum_content_approvals_locale";
  DROP TYPE "public"."enum_content_approvals_decision";
  DROP TYPE "public"."enum_content_withdrawals_locale";
  DROP TYPE "public"."enum_content_withdrawals_decision";
  DROP TYPE "public"."enum_content_withdrawals_sync_dispatch_mode";
  DROP TYPE "public"."enum_content_withdrawals_sync_event_type";
  DROP TYPE "public"."enum_content_withdrawals_sync_priority";
  DROP TYPE "public"."enum_publication_requests_requested_locales_locale";
  DROP TYPE "public"."enum_publication_requests_checks_status";
  DROP TYPE "public"."enum_publication_requests_status";
  DROP TYPE "public"."enum_publication_requests_provider";`)
}
