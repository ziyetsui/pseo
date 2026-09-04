import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`users_roles\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`users_roles_order_idx\` ON \`users_roles\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`users_roles_parent_idx\` ON \`users_roles\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`users_sessions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`created_at\` text,
  	\`expires_at\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`users_sessions_order_idx\` ON \`users_sessions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`users_sessions_parent_id_idx\` ON \`users_sessions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`users\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`display_name\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`email\` text NOT NULL,
  	\`reset_password_token\` text,
  	\`reset_password_expiration\` text,
  	\`salt\` text,
  	\`hash\` text,
  	\`login_attempts\` numeric DEFAULT 0,
  	\`lock_until\` text
  );
  `)
  await db.run(sql`CREATE INDEX \`users_updated_at_idx\` ON \`users\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`users_created_at_idx\` ON \`users\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`users_email_idx\` ON \`users\` (\`email\`);`)
  await db.run(sql`CREATE TABLE \`prompt_artifacts_prompt_variables_options\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`value\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`prompt_artifacts_prompt_variables\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_prompt_variables_options_order_idx\` ON \`prompt_artifacts_prompt_variables_options\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_prompt_variables_options_parent_id_idx\` ON \`prompt_artifacts_prompt_variables_options\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`prompt_artifacts_prompt_variables\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`key\` text,
  	\`label\` text,
  	\`required\` integer DEFAULT true,
  	\`default_value\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`prompt_artifacts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_prompt_variables_order_idx\` ON \`prompt_artifacts_prompt_variables\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_prompt_variables_parent_id_idx\` ON \`prompt_artifacts_prompt_variables\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`prompt_artifacts_outcome_platforms\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`value\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`prompt_artifacts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_outcome_platforms_order_idx\` ON \`prompt_artifacts_outcome_platforms\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_outcome_platforms_parent_id_idx\` ON \`prompt_artifacts_outcome_platforms\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`prompt_artifacts_required_inputs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`value\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`prompt_artifacts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_required_inputs_order_idx\` ON \`prompt_artifacts_required_inputs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_required_inputs_parent_id_idx\` ON \`prompt_artifacts_required_inputs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`prompt_artifacts_optional_inputs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`value\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`prompt_artifacts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_optional_inputs_order_idx\` ON \`prompt_artifacts_optional_inputs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_optional_inputs_parent_id_idx\` ON \`prompt_artifacts_optional_inputs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`prompt_artifacts_parameters_options\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`value\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`prompt_artifacts_parameters\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_parameters_options_order_idx\` ON \`prompt_artifacts_parameters_options\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_parameters_options_parent_id_idx\` ON \`prompt_artifacts_parameters_options\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`prompt_artifacts_parameters\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`key\` text,
  	\`label\` text,
  	\`value\` text,
  	\`value_type\` text,
  	\`required\` integer DEFAULT false,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`prompt_artifacts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_parameters_order_idx\` ON \`prompt_artifacts_parameters\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_parameters_parent_id_idx\` ON \`prompt_artifacts_parameters\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`prompt_artifacts_media\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`asset_id\` text,
  	\`media_type\` text,
  	\`url\` text,
  	\`width\` numeric,
  	\`height\` numeric,
  	\`alt\` text,
  	\`poster_url\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`prompt_artifacts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_media_order_idx\` ON \`prompt_artifacts_media\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_media_parent_id_idx\` ON \`prompt_artifacts_media\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`prompt_artifacts_examples\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`example_id\` text,
  	\`input\` text,
  	\`output_asset_id\` text,
  	\`output_media_type\` text,
  	\`output_url\` text,
  	\`output_width\` numeric,
  	\`output_height\` numeric,
  	\`output_alt\` text,
  	\`output_poster_url\` text,
  	\`caption\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`prompt_artifacts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_examples_order_idx\` ON \`prompt_artifacts_examples\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_examples_parent_id_idx\` ON \`prompt_artifacts_examples\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`prompt_artifacts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`artifact_key\` text,
  	\`content_type\` text,
  	\`source_locale\` text,
  	\`draft_workflow_state\` text DEFAULT 'draft',
  	\`prompt_language\` text,
  	\`prompt_text\` text,
  	\`outcome_output_type\` text,
  	\`metrics_likes\` numeric,
  	\`metrics_bookmarks\` numeric,
  	\`metrics_comments\` numeric,
  	\`metrics_reposts\` numeric,
  	\`metrics_views\` numeric,
  	\`metrics_observed_at\` text,
  	\`creator_id\` integer,
  	\`actions_can_copy\` integer DEFAULT true,
  	\`actions_try_url\` text,
  	\`beta_preview\` text,
  	\`git_publication_state\` text DEFAULT 'unpublished',
  	\`git_publication_pull_request_number\` numeric,
  	\`git_publication_pull_request_url\` text,
  	\`git_publication_merge_sha\` text,
  	\`git_publication_released_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`creator_id\`) REFERENCES \`taxonomies\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`prompt_artifacts_artifact_key_idx\` ON \`prompt_artifacts\` (\`artifact_key\`);`)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_creator_idx\` ON \`prompt_artifacts\` (\`creator_id\`);`)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_updated_at_idx\` ON \`prompt_artifacts\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_created_at_idx\` ON \`prompt_artifacts\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`prompt_artifacts__status_idx\` ON \`prompt_artifacts\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`prompt_artifacts_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`taxonomies_id\` integer,
  	\`prompt_artifacts_id\` integer,
  	\`source_evidence_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`prompt_artifacts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`taxonomies_id\`) REFERENCES \`taxonomies\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`prompt_artifacts_id\`) REFERENCES \`prompt_artifacts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`source_evidence_id\`) REFERENCES \`source_evidence\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_rels_order_idx\` ON \`prompt_artifacts_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_rels_parent_idx\` ON \`prompt_artifacts_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_rels_path_idx\` ON \`prompt_artifacts_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_rels_taxonomies_id_idx\` ON \`prompt_artifacts_rels\` (\`taxonomies_id\`);`)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_rels_prompt_artifacts_id_idx\` ON \`prompt_artifacts_rels\` (\`prompt_artifacts_id\`);`)
  await db.run(sql`CREATE INDEX \`prompt_artifacts_rels_source_evidence_id_idx\` ON \`prompt_artifacts_rels\` (\`source_evidence_id\`);`)
  await db.run(sql`CREATE TABLE \`_prompt_artifacts_v_version_prompt_variables_options\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`value\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_prompt_artifacts_v_version_prompt_variables\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_version_prompt_variables_options_order_idx\` ON \`_prompt_artifacts_v_version_prompt_variables_options\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_version_prompt_variables_options_parent_id_idx\` ON \`_prompt_artifacts_v_version_prompt_variables_options\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_prompt_artifacts_v_version_prompt_variables\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text,
  	\`label\` text,
  	\`required\` integer DEFAULT true,
  	\`default_value\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_prompt_artifacts_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_version_prompt_variables_order_idx\` ON \`_prompt_artifacts_v_version_prompt_variables\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_version_prompt_variables_parent_id_idx\` ON \`_prompt_artifacts_v_version_prompt_variables\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_prompt_artifacts_v_version_outcome_platforms\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`value\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_prompt_artifacts_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_version_outcome_platforms_order_idx\` ON \`_prompt_artifacts_v_version_outcome_platforms\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_version_outcome_platforms_parent_id_idx\` ON \`_prompt_artifacts_v_version_outcome_platforms\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_prompt_artifacts_v_version_required_inputs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`value\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_prompt_artifacts_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_version_required_inputs_order_idx\` ON \`_prompt_artifacts_v_version_required_inputs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_version_required_inputs_parent_id_idx\` ON \`_prompt_artifacts_v_version_required_inputs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_prompt_artifacts_v_version_optional_inputs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`value\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_prompt_artifacts_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_version_optional_inputs_order_idx\` ON \`_prompt_artifacts_v_version_optional_inputs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_version_optional_inputs_parent_id_idx\` ON \`_prompt_artifacts_v_version_optional_inputs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_prompt_artifacts_v_version_parameters_options\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`value\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_prompt_artifacts_v_version_parameters\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_version_parameters_options_order_idx\` ON \`_prompt_artifacts_v_version_parameters_options\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_version_parameters_options_parent_id_idx\` ON \`_prompt_artifacts_v_version_parameters_options\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_prompt_artifacts_v_version_parameters\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text,
  	\`label\` text,
  	\`value\` text,
  	\`value_type\` text,
  	\`required\` integer DEFAULT false,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_prompt_artifacts_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_version_parameters_order_idx\` ON \`_prompt_artifacts_v_version_parameters\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_version_parameters_parent_id_idx\` ON \`_prompt_artifacts_v_version_parameters\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_prompt_artifacts_v_version_media\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`asset_id\` text,
  	\`media_type\` text,
  	\`url\` text,
  	\`width\` numeric,
  	\`height\` numeric,
  	\`alt\` text,
  	\`poster_url\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_prompt_artifacts_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_version_media_order_idx\` ON \`_prompt_artifacts_v_version_media\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_version_media_parent_id_idx\` ON \`_prompt_artifacts_v_version_media\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_prompt_artifacts_v_version_examples\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`example_id\` text,
  	\`input\` text,
  	\`output_asset_id\` text,
  	\`output_media_type\` text,
  	\`output_url\` text,
  	\`output_width\` numeric,
  	\`output_height\` numeric,
  	\`output_alt\` text,
  	\`output_poster_url\` text,
  	\`caption\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_prompt_artifacts_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_version_examples_order_idx\` ON \`_prompt_artifacts_v_version_examples\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_version_examples_parent_id_idx\` ON \`_prompt_artifacts_v_version_examples\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_prompt_artifacts_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_artifact_key\` text,
  	\`version_content_type\` text,
  	\`version_source_locale\` text,
  	\`version_draft_workflow_state\` text DEFAULT 'draft',
  	\`version_prompt_language\` text,
  	\`version_prompt_text\` text,
  	\`version_outcome_output_type\` text,
  	\`version_metrics_likes\` numeric,
  	\`version_metrics_bookmarks\` numeric,
  	\`version_metrics_comments\` numeric,
  	\`version_metrics_reposts\` numeric,
  	\`version_metrics_views\` numeric,
  	\`version_metrics_observed_at\` text,
  	\`version_creator_id\` integer,
  	\`version_actions_can_copy\` integer DEFAULT true,
  	\`version_actions_try_url\` text,
  	\`version_beta_preview\` text,
  	\`version_git_publication_state\` text DEFAULT 'unpublished',
  	\`version_git_publication_pull_request_number\` numeric,
  	\`version_git_publication_pull_request_url\` text,
  	\`version_git_publication_merge_sha\` text,
  	\`version_git_publication_released_at\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`prompt_artifacts\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_creator_id\`) REFERENCES \`taxonomies\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_parent_idx\` ON \`_prompt_artifacts_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_version_version_artifact_key_idx\` ON \`_prompt_artifacts_v\` (\`version_artifact_key\`);`)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_version_version_creator_idx\` ON \`_prompt_artifacts_v\` (\`version_creator_id\`);`)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_version_version_updated_at_idx\` ON \`_prompt_artifacts_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_version_version_created_at_idx\` ON \`_prompt_artifacts_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_version_version__status_idx\` ON \`_prompt_artifacts_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_created_at_idx\` ON \`_prompt_artifacts_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_updated_at_idx\` ON \`_prompt_artifacts_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_latest_idx\` ON \`_prompt_artifacts_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`_prompt_artifacts_v_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`taxonomies_id\` integer,
  	\`prompt_artifacts_id\` integer,
  	\`source_evidence_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`_prompt_artifacts_v\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`taxonomies_id\`) REFERENCES \`taxonomies\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`prompt_artifacts_id\`) REFERENCES \`prompt_artifacts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`source_evidence_id\`) REFERENCES \`source_evidence\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_rels_order_idx\` ON \`_prompt_artifacts_v_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_rels_parent_idx\` ON \`_prompt_artifacts_v_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_rels_path_idx\` ON \`_prompt_artifacts_v_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_rels_taxonomies_id_idx\` ON \`_prompt_artifacts_v_rels\` (\`taxonomies_id\`);`)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_rels_prompt_artifacts_id_idx\` ON \`_prompt_artifacts_v_rels\` (\`prompt_artifacts_id\`);`)
  await db.run(sql`CREATE INDEX \`_prompt_artifacts_v_rels_source_evidence_id_idx\` ON \`_prompt_artifacts_v_rels\` (\`source_evidence_id\`);`)
  await db.run(sql`CREATE TABLE \`locale_variants_localized_outcome_characteristics\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`value\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`locale_variants\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`locale_variants_localized_outcome_characteristics_order_idx\` ON \`locale_variants_localized_outcome_characteristics\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`locale_variants_localized_outcome_characteristics_parent_id_idx\` ON \`locale_variants_localized_outcome_characteristics\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`locale_variants_workflow\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`position\` numeric,
  	\`title\` text,
  	\`body\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`locale_variants\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`locale_variants_workflow_order_idx\` ON \`locale_variants_workflow\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`locale_variants_workflow_parent_id_idx\` ON \`locale_variants_workflow\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`locale_variants\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`locale_variant_key\` text,
  	\`artifact_id\` integer,
  	\`locale\` text,
  	\`source_locale\` text,
  	\`slug\` text,
  	\`title\` text,
  	\`summary\` text,
  	\`indexable\` integer DEFAULT false,
  	\`body_markdown\` text,
  	\`localized_outcome_purpose\` text,
  	\`translation_translation_status\` text DEFAULT 'draft',
  	\`translation_translated_from_revision\` text,
  	\`translation_reviewer\` text,
  	\`seo_title\` text,
  	\`seo_description\` text,
  	\`seo_robots\` text DEFAULT 'noindex,nofollow',
  	\`beta_preview\` text,
  	\`git_publication_state\` text DEFAULT 'unpublished',
  	\`git_publication_pull_request_number\` numeric,
  	\`git_publication_pull_request_url\` text,
  	\`git_publication_merge_sha\` text,
  	\`git_publication_released_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`artifact_id\`) REFERENCES \`prompt_artifacts\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`locale_variants_locale_variant_key_idx\` ON \`locale_variants\` (\`locale_variant_key\`);`)
  await db.run(sql`CREATE INDEX \`locale_variants_artifact_idx\` ON \`locale_variants\` (\`artifact_id\`);`)
  await db.run(sql`CREATE INDEX \`locale_variants_locale_idx\` ON \`locale_variants\` (\`locale\`);`)
  await db.run(sql`CREATE INDEX \`locale_variants_slug_idx\` ON \`locale_variants\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`locale_variants_updated_at_idx\` ON \`locale_variants\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`locale_variants_created_at_idx\` ON \`locale_variants\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`locale_variants__status_idx\` ON \`locale_variants\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`_locale_variants_v_version_localized_outcome_characteristics\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`value\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_locale_variants_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_locale_variants_v_version_localized_outcome_characteristics_order_idx\` ON \`_locale_variants_v_version_localized_outcome_characteristics\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_locale_variants_v_version_localized_outcome_characteristics_parent_id_idx\` ON \`_locale_variants_v_version_localized_outcome_characteristics\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_locale_variants_v_version_workflow\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`position\` numeric,
  	\`title\` text,
  	\`body\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_locale_variants_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_locale_variants_v_version_workflow_order_idx\` ON \`_locale_variants_v_version_workflow\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_locale_variants_v_version_workflow_parent_id_idx\` ON \`_locale_variants_v_version_workflow\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_locale_variants_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_locale_variant_key\` text,
  	\`version_artifact_id\` integer,
  	\`version_locale\` text,
  	\`version_source_locale\` text,
  	\`version_slug\` text,
  	\`version_title\` text,
  	\`version_summary\` text,
  	\`version_indexable\` integer DEFAULT false,
  	\`version_body_markdown\` text,
  	\`version_localized_outcome_purpose\` text,
  	\`version_translation_translation_status\` text DEFAULT 'draft',
  	\`version_translation_translated_from_revision\` text,
  	\`version_translation_reviewer\` text,
  	\`version_seo_title\` text,
  	\`version_seo_description\` text,
  	\`version_seo_robots\` text DEFAULT 'noindex,nofollow',
  	\`version_beta_preview\` text,
  	\`version_git_publication_state\` text DEFAULT 'unpublished',
  	\`version_git_publication_pull_request_number\` numeric,
  	\`version_git_publication_pull_request_url\` text,
  	\`version_git_publication_merge_sha\` text,
  	\`version_git_publication_released_at\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`locale_variants\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_artifact_id\`) REFERENCES \`prompt_artifacts\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_locale_variants_v_parent_idx\` ON \`_locale_variants_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_locale_variants_v_version_version_locale_variant_key_idx\` ON \`_locale_variants_v\` (\`version_locale_variant_key\`);`)
  await db.run(sql`CREATE INDEX \`_locale_variants_v_version_version_artifact_idx\` ON \`_locale_variants_v\` (\`version_artifact_id\`);`)
  await db.run(sql`CREATE INDEX \`_locale_variants_v_version_version_locale_idx\` ON \`_locale_variants_v\` (\`version_locale\`);`)
  await db.run(sql`CREATE INDEX \`_locale_variants_v_version_version_slug_idx\` ON \`_locale_variants_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_locale_variants_v_version_version_updated_at_idx\` ON \`_locale_variants_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_locale_variants_v_version_version_created_at_idx\` ON \`_locale_variants_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_locale_variants_v_version_version__status_idx\` ON \`_locale_variants_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_locale_variants_v_created_at_idx\` ON \`_locale_variants_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_locale_variants_v_updated_at_idx\` ON \`_locale_variants_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_locale_variants_v_latest_idx\` ON \`_locale_variants_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`taxonomies_capabilities\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`value\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`taxonomies\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`taxonomies_capabilities_order_idx\` ON \`taxonomies_capabilities\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`taxonomies_capabilities_parent_id_idx\` ON \`taxonomies_capabilities\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`taxonomies_inputs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`value\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`taxonomies\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`taxonomies_inputs_order_idx\` ON \`taxonomies_inputs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`taxonomies_inputs_parent_id_idx\` ON \`taxonomies_inputs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`taxonomies_outputs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`value\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`taxonomies\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`taxonomies_outputs_order_idx\` ON \`taxonomies_outputs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`taxonomies_outputs_parent_id_idx\` ON \`taxonomies_outputs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`taxonomies_limitations\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`value\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`taxonomies\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`taxonomies_limitations_order_idx\` ON \`taxonomies_limitations\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`taxonomies_limitations_parent_id_idx\` ON \`taxonomies_limitations\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`taxonomies\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`taxonomy_key\` text,
  	\`axis\` text,
  	\`locale\` text,
  	\`source_locale\` text,
  	\`slug\` text,
  	\`name\` text,
  	\`description\` text,
  	\`official_url\` text,
  	\`translation_translation_status\` text DEFAULT 'draft',
  	\`translation_translated_from_revision\` text,
  	\`translation_reviewer\` text,
  	\`seo_title\` text,
  	\`seo_description\` text,
  	\`seo_robots\` text DEFAULT 'noindex,nofollow',
  	\`beta_preview\` text,
  	\`git_publication_state\` text DEFAULT 'unpublished',
  	\`git_publication_pull_request_number\` numeric,
  	\`git_publication_pull_request_url\` text,
  	\`git_publication_merge_sha\` text,
  	\`git_publication_released_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft'
  );
  `)
  await db.run(sql`CREATE INDEX \`taxonomies_taxonomy_key_idx\` ON \`taxonomies\` (\`taxonomy_key\`);`)
  await db.run(sql`CREATE INDEX \`taxonomies_locale_idx\` ON \`taxonomies\` (\`locale\`);`)
  await db.run(sql`CREATE INDEX \`taxonomies_slug_idx\` ON \`taxonomies\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`taxonomies_updated_at_idx\` ON \`taxonomies\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`taxonomies_created_at_idx\` ON \`taxonomies\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`taxonomies__status_idx\` ON \`taxonomies\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`_taxonomies_v_version_capabilities\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`value\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_taxonomies_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_taxonomies_v_version_capabilities_order_idx\` ON \`_taxonomies_v_version_capabilities\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_taxonomies_v_version_capabilities_parent_id_idx\` ON \`_taxonomies_v_version_capabilities\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_taxonomies_v_version_inputs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`value\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_taxonomies_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_taxonomies_v_version_inputs_order_idx\` ON \`_taxonomies_v_version_inputs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_taxonomies_v_version_inputs_parent_id_idx\` ON \`_taxonomies_v_version_inputs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_taxonomies_v_version_outputs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`value\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_taxonomies_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_taxonomies_v_version_outputs_order_idx\` ON \`_taxonomies_v_version_outputs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_taxonomies_v_version_outputs_parent_id_idx\` ON \`_taxonomies_v_version_outputs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_taxonomies_v_version_limitations\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`value\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_taxonomies_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_taxonomies_v_version_limitations_order_idx\` ON \`_taxonomies_v_version_limitations\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_taxonomies_v_version_limitations_parent_id_idx\` ON \`_taxonomies_v_version_limitations\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_taxonomies_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_taxonomy_key\` text,
  	\`version_axis\` text,
  	\`version_locale\` text,
  	\`version_source_locale\` text,
  	\`version_slug\` text,
  	\`version_name\` text,
  	\`version_description\` text,
  	\`version_official_url\` text,
  	\`version_translation_translation_status\` text DEFAULT 'draft',
  	\`version_translation_translated_from_revision\` text,
  	\`version_translation_reviewer\` text,
  	\`version_seo_title\` text,
  	\`version_seo_description\` text,
  	\`version_seo_robots\` text DEFAULT 'noindex,nofollow',
  	\`version_beta_preview\` text,
  	\`version_git_publication_state\` text DEFAULT 'unpublished',
  	\`version_git_publication_pull_request_number\` numeric,
  	\`version_git_publication_pull_request_url\` text,
  	\`version_git_publication_merge_sha\` text,
  	\`version_git_publication_released_at\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`taxonomies\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_taxonomies_v_parent_idx\` ON \`_taxonomies_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_taxonomies_v_version_version_taxonomy_key_idx\` ON \`_taxonomies_v\` (\`version_taxonomy_key\`);`)
  await db.run(sql`CREATE INDEX \`_taxonomies_v_version_version_locale_idx\` ON \`_taxonomies_v\` (\`version_locale\`);`)
  await db.run(sql`CREATE INDEX \`_taxonomies_v_version_version_slug_idx\` ON \`_taxonomies_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_taxonomies_v_version_version_updated_at_idx\` ON \`_taxonomies_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_taxonomies_v_version_version_created_at_idx\` ON \`_taxonomies_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_taxonomies_v_version_version__status_idx\` ON \`_taxonomies_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_taxonomies_v_created_at_idx\` ON \`_taxonomies_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_taxonomies_v_updated_at_idx\` ON \`_taxonomies_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_taxonomies_v_latest_idx\` ON \`_taxonomies_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`source_evidence\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`artifact_id\` integer,
  	\`record_type\` text,
  	\`source_platform\` text,
  	\`source_url\` text,
  	\`source_id\` text,
  	\`creator_handle\` text,
  	\`source_published_date\` text,
  	\`observed_at\` text,
  	\`evidence_type\` text,
  	\`evidence_url\` text,
  	\`confidence\` numeric,
  	\`notes\` text,
  	\`rights_status\` text DEFAULT 'review_required',
  	\`basis\` text,
  	\`reviewed_by\` text,
  	\`reviewed_at\` text,
  	\`license_reference\` text,
  	\`is_primary_source\` integer DEFAULT false,
  	\`beta_preview\` text,
  	\`git_publication_state\` text DEFAULT 'unpublished',
  	\`git_publication_pull_request_number\` numeric,
  	\`git_publication_pull_request_url\` text,
  	\`git_publication_merge_sha\` text,
  	\`git_publication_released_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`artifact_id\`) REFERENCES \`prompt_artifacts\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`source_evidence_artifact_idx\` ON \`source_evidence\` (\`artifact_id\`);`)
  await db.run(sql`CREATE INDEX \`source_evidence_updated_at_idx\` ON \`source_evidence\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`source_evidence_created_at_idx\` ON \`source_evidence\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`source_evidence__status_idx\` ON \`source_evidence\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`_source_evidence_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_artifact_id\` integer,
  	\`version_record_type\` text,
  	\`version_source_platform\` text,
  	\`version_source_url\` text,
  	\`version_source_id\` text,
  	\`version_creator_handle\` text,
  	\`version_source_published_date\` text,
  	\`version_observed_at\` text,
  	\`version_evidence_type\` text,
  	\`version_evidence_url\` text,
  	\`version_confidence\` numeric,
  	\`version_notes\` text,
  	\`version_rights_status\` text DEFAULT 'review_required',
  	\`version_basis\` text,
  	\`version_reviewed_by\` text,
  	\`version_reviewed_at\` text,
  	\`version_license_reference\` text,
  	\`version_is_primary_source\` integer DEFAULT false,
  	\`version_beta_preview\` text,
  	\`version_git_publication_state\` text DEFAULT 'unpublished',
  	\`version_git_publication_pull_request_number\` numeric,
  	\`version_git_publication_pull_request_url\` text,
  	\`version_git_publication_merge_sha\` text,
  	\`version_git_publication_released_at\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`source_evidence\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_artifact_id\`) REFERENCES \`prompt_artifacts\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_source_evidence_v_parent_idx\` ON \`_source_evidence_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_source_evidence_v_version_version_artifact_idx\` ON \`_source_evidence_v\` (\`version_artifact_id\`);`)
  await db.run(sql`CREATE INDEX \`_source_evidence_v_version_version_updated_at_idx\` ON \`_source_evidence_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_source_evidence_v_version_version_created_at_idx\` ON \`_source_evidence_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_source_evidence_v_version_version__status_idx\` ON \`_source_evidence_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_source_evidence_v_created_at_idx\` ON \`_source_evidence_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_source_evidence_v_updated_at_idx\` ON \`_source_evidence_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_source_evidence_v_latest_idx\` ON \`_source_evidence_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`publication_requests_requested_locales\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`locale\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`publication_requests\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`publication_requests_requested_locales_order_idx\` ON \`publication_requests_requested_locales\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`publication_requests_requested_locales_parent_id_idx\` ON \`publication_requests_requested_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`publication_requests_checks\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`status\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`publication_requests\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`publication_requests_checks_order_idx\` ON \`publication_requests_checks\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`publication_requests_checks_parent_id_idx\` ON \`publication_requests_checks\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`publication_requests\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`artifact_id\` integer NOT NULL,
  	\`artifact_key\` text NOT NULL,
  	\`expected_base_sha\` text NOT NULL,
  	\`expected_content_revision\` text NOT NULL,
  	\`expected_source_revision\` text NOT NULL,
  	\`validated_content_revision\` text NOT NULL,
  	\`validated_source_revision\` text NOT NULL,
  	\`commit_message\` text NOT NULL,
  	\`idempotency_key\` text NOT NULL,
  	\`request_fingerprint\` text NOT NULL,
  	\`requested_by_id\` integer NOT NULL,
  	\`status\` text NOT NULL,
  	\`provider\` text,
  	\`planned_branch\` text,
  	\`branch\` text,
  	\`commit_sha\` text,
  	\`pull_request_number\` numeric,
  	\`pull_request_url\` text,
  	\`error_code\` text,
  	\`error_detail\` text,
  	\`merge_sha\` text,
  	\`released_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`artifact_id\`) REFERENCES \`prompt_artifacts\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`requested_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`publication_requests_artifact_idx\` ON \`publication_requests\` (\`artifact_id\`);`)
  await db.run(sql`CREATE INDEX \`publication_requests_artifact_key_idx\` ON \`publication_requests\` (\`artifact_key\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`publication_requests_idempotency_key_idx\` ON \`publication_requests\` (\`idempotency_key\`);`)
  await db.run(sql`CREATE INDEX \`publication_requests_requested_by_idx\` ON \`publication_requests\` (\`requested_by_id\`);`)
  await db.run(sql`CREATE INDEX \`publication_requests_updated_at_idx\` ON \`publication_requests\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`publication_requests_created_at_idx\` ON \`publication_requests\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_kv\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text NOT NULL,
  	\`data\` text NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`payload_kv_key_idx\` ON \`payload_kv\` (\`key\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`global_slug\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_global_slug_idx\` ON \`payload_locked_documents\` (\`global_slug\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_updated_at_idx\` ON \`payload_locked_documents\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_created_at_idx\` ON \`payload_locked_documents\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`prompt_artifacts_id\` integer,
  	\`locale_variants_id\` integer,
  	\`taxonomies_id\` integer,
  	\`source_evidence_id\` integer,
  	\`publication_requests_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`prompt_artifacts_id\`) REFERENCES \`prompt_artifacts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`locale_variants_id\`) REFERENCES \`locale_variants\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`taxonomies_id\`) REFERENCES \`taxonomies\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`source_evidence_id\`) REFERENCES \`source_evidence\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`publication_requests_id\`) REFERENCES \`publication_requests\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_prompt_artifacts_id_idx\` ON \`payload_locked_documents_rels\` (\`prompt_artifacts_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_locale_variants_id_idx\` ON \`payload_locked_documents_rels\` (\`locale_variants_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_taxonomies_id_idx\` ON \`payload_locked_documents_rels\` (\`taxonomies_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_source_evidence_id_idx\` ON \`payload_locked_documents_rels\` (\`source_evidence_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_publication_requests_id_idx\` ON \`payload_locked_documents_rels\` (\`publication_requests_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text,
  	\`value\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_key_idx\` ON \`payload_preferences\` (\`key\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_updated_at_idx\` ON \`payload_preferences\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_created_at_idx\` ON \`payload_preferences\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_preferences\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_order_idx\` ON \`payload_preferences_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_parent_idx\` ON \`payload_preferences_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_path_idx\` ON \`payload_preferences_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_users_id_idx\` ON \`payload_preferences_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_migrations\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`batch\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_migrations_updated_at_idx\` ON \`payload_migrations\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_migrations_created_at_idx\` ON \`payload_migrations\` (\`created_at\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`_locale_variants_v_version_localized_outcome_characteristics\`;`)
  await db.run(sql`DROP TABLE \`_locale_variants_v_version_workflow\`;`)
  await db.run(sql`DROP TABLE \`_locale_variants_v\`;`)
  await db.run(sql`DROP TABLE \`_prompt_artifacts_v_rels\`;`)
  await db.run(sql`DROP TABLE \`_prompt_artifacts_v_version_examples\`;`)
  await db.run(sql`DROP TABLE \`_prompt_artifacts_v_version_media\`;`)
  await db.run(sql`DROP TABLE \`_prompt_artifacts_v_version_optional_inputs\`;`)
  await db.run(sql`DROP TABLE \`_prompt_artifacts_v_version_outcome_platforms\`;`)
  await db.run(sql`DROP TABLE \`_prompt_artifacts_v_version_parameters_options\`;`)
  await db.run(sql`DROP TABLE \`_prompt_artifacts_v_version_parameters\`;`)
  await db.run(sql`DROP TABLE \`_prompt_artifacts_v_version_prompt_variables_options\`;`)
  await db.run(sql`DROP TABLE \`_prompt_artifacts_v_version_prompt_variables\`;`)
  await db.run(sql`DROP TABLE \`_prompt_artifacts_v_version_required_inputs\`;`)
  await db.run(sql`DROP TABLE \`_prompt_artifacts_v\`;`)
  await db.run(sql`DROP TABLE \`_source_evidence_v\`;`)
  await db.run(sql`DROP TABLE \`_taxonomies_v_version_capabilities\`;`)
  await db.run(sql`DROP TABLE \`_taxonomies_v_version_inputs\`;`)
  await db.run(sql`DROP TABLE \`_taxonomies_v_version_limitations\`;`)
  await db.run(sql`DROP TABLE \`_taxonomies_v_version_outputs\`;`)
  await db.run(sql`DROP TABLE \`_taxonomies_v\`;`)
  await db.run(sql`DROP TABLE \`locale_variants_localized_outcome_characteristics\`;`)
  await db.run(sql`DROP TABLE \`locale_variants_workflow\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`locale_variants\`;`)
  await db.run(sql`DROP TABLE \`payload_kv\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents\`;`)
  await db.run(sql`DROP TABLE \`payload_migrations\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences\`;`)
  await db.run(sql`DROP TABLE \`prompt_artifacts_examples\`;`)
  await db.run(sql`DROP TABLE \`prompt_artifacts_media\`;`)
  await db.run(sql`DROP TABLE \`prompt_artifacts_optional_inputs\`;`)
  await db.run(sql`DROP TABLE \`prompt_artifacts_outcome_platforms\`;`)
  await db.run(sql`DROP TABLE \`prompt_artifacts_parameters_options\`;`)
  await db.run(sql`DROP TABLE \`prompt_artifacts_parameters\`;`)
  await db.run(sql`DROP TABLE \`prompt_artifacts_prompt_variables_options\`;`)
  await db.run(sql`DROP TABLE \`prompt_artifacts_prompt_variables\`;`)
  await db.run(sql`DROP TABLE \`prompt_artifacts_rels\`;`)
  await db.run(sql`DROP TABLE \`prompt_artifacts_required_inputs\`;`)
  await db.run(sql`DROP TABLE \`publication_requests_checks\`;`)
  await db.run(sql`DROP TABLE \`publication_requests_requested_locales\`;`)
  await db.run(sql`DROP TABLE \`publication_requests\`;`)
  await db.run(sql`DROP TABLE \`source_evidence\`;`)
  await db.run(sql`DROP TABLE \`prompt_artifacts\`;`)
  await db.run(sql`DROP TABLE \`taxonomies_capabilities\`;`)
  await db.run(sql`DROP TABLE \`taxonomies_inputs\`;`)
  await db.run(sql`DROP TABLE \`taxonomies_limitations\`;`)
  await db.run(sql`DROP TABLE \`taxonomies_outputs\`;`)
  await db.run(sql`DROP TABLE \`taxonomies\`;`)
  await db.run(sql`DROP TABLE \`users_roles\`;`)
  await db.run(sql`DROP TABLE \`users_sessions\`;`)
  await db.run(sql`DROP TABLE \`users\`;`)
}
