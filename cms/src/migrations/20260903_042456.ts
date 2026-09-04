import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`content_approvals_files\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`path\` text NOT NULL,
  	\`byte_length\` numeric NOT NULL,
  	\`sha256\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`content_approvals\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`content_approvals_files_order_idx\` ON \`content_approvals_files\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`content_approvals_files_parent_id_idx\` ON \`content_approvals_files\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`content_approvals\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`artifact_id\` integer NOT NULL,
  	\`artifact_key\` text NOT NULL,
  	\`locale\` text NOT NULL,
  	\`content_revision\` text NOT NULL,
  	\`source_revision\` text NOT NULL,
  	\`rights_policy_version\` text NOT NULL,
  	\`decision\` text NOT NULL,
  	\`approved_by_id\` integer NOT NULL,
  	\`approved_at\` text NOT NULL,
  	\`decision_fingerprint\` text NOT NULL,
  	\`idempotency_key\` text NOT NULL,
  	\`file_count\` numeric NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`artifact_id\`) REFERENCES \`prompt_artifacts\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`approved_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`content_approvals_artifact_idx\` ON \`content_approvals\` (\`artifact_id\`);`)
  await db.run(sql`CREATE INDEX \`content_approvals_artifact_key_idx\` ON \`content_approvals\` (\`artifact_key\`);`)
  await db.run(sql`CREATE INDEX \`content_approvals_locale_idx\` ON \`content_approvals\` (\`locale\`);`)
  await db.run(sql`CREATE INDEX \`content_approvals_content_revision_idx\` ON \`content_approvals\` (\`content_revision\`);`)
  await db.run(sql`CREATE INDEX \`content_approvals_approved_by_idx\` ON \`content_approvals\` (\`approved_by_id\`);`)
  await db.run(sql`CREATE INDEX \`content_approvals_decision_fingerprint_idx\` ON \`content_approvals\` (\`decision_fingerprint\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`content_approvals_idempotency_key_idx\` ON \`content_approvals\` (\`idempotency_key\`);`)
  await db.run(sql`CREATE INDEX \`content_approvals_updated_at_idx\` ON \`content_approvals\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`content_approvals_created_at_idx\` ON \`content_approvals\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`source_evidence\` ADD \`author_name\` text;`)
  await db.run(sql`ALTER TABLE \`source_evidence\` ADD \`author_handle\` text;`)
  await db.run(sql`ALTER TABLE \`source_evidence\` ADD \`author_url\` text;`)
  await db.run(sql`ALTER TABLE \`source_evidence\` ADD \`original_post_url\` text;`)
  await db.run(sql`ALTER TABLE \`source_evidence\` ADD \`policy_version\` text;`)
  await db.run(sql`ALTER TABLE \`source_evidence\` ADD \`risk_accepted_by\` text;`)
  await db.run(sql`ALTER TABLE \`source_evidence\` ADD \`risk_accepted_at\` text;`)
  await db.run(sql`ALTER TABLE \`source_evidence\` ADD \`takedown_url\` text;`)
  await db.run(sql`ALTER TABLE \`source_evidence\` ADD \`takedown_case_id\` text;`)
  await db.run(sql`ALTER TABLE \`source_evidence\` ADD \`takedown_handled_by\` text;`)
  await db.run(sql`ALTER TABLE \`source_evidence\` ADD \`takedown_handled_at\` text;`)
  await db.run(sql`ALTER TABLE \`source_evidence\` ADD \`takedown_scope\` text;`)
  await db.run(sql`ALTER TABLE \`_source_evidence_v\` ADD \`version_author_name\` text;`)
  await db.run(sql`ALTER TABLE \`_source_evidence_v\` ADD \`version_author_handle\` text;`)
  await db.run(sql`ALTER TABLE \`_source_evidence_v\` ADD \`version_author_url\` text;`)
  await db.run(sql`ALTER TABLE \`_source_evidence_v\` ADD \`version_original_post_url\` text;`)
  await db.run(sql`ALTER TABLE \`_source_evidence_v\` ADD \`version_policy_version\` text;`)
  await db.run(sql`ALTER TABLE \`_source_evidence_v\` ADD \`version_risk_accepted_by\` text;`)
  await db.run(sql`ALTER TABLE \`_source_evidence_v\` ADD \`version_risk_accepted_at\` text;`)
  await db.run(sql`ALTER TABLE \`_source_evidence_v\` ADD \`version_takedown_url\` text;`)
  await db.run(sql`ALTER TABLE \`_source_evidence_v\` ADD \`version_takedown_case_id\` text;`)
  await db.run(sql`ALTER TABLE \`_source_evidence_v\` ADD \`version_takedown_handled_by\` text;`)
  await db.run(sql`ALTER TABLE \`_source_evidence_v\` ADD \`version_takedown_handled_at\` text;`)
  await db.run(sql`ALTER TABLE \`_source_evidence_v\` ADD \`version_takedown_scope\` text;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`content_approvals_id\` integer REFERENCES content_approvals(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_content_approvals_id_idx\` ON \`payload_locked_documents_rels\` (\`content_approvals_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`content_approvals_files\`;`)
  await db.run(sql`DROP TABLE \`content_approvals\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
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
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "prompt_artifacts_id", "locale_variants_id", "taxonomies_id", "source_evidence_id", "publication_requests_id") SELECT "id", "order", "parent_id", "path", "users_id", "prompt_artifacts_id", "locale_variants_id", "taxonomies_id", "source_evidence_id", "publication_requests_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_prompt_artifacts_id_idx\` ON \`payload_locked_documents_rels\` (\`prompt_artifacts_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_locale_variants_id_idx\` ON \`payload_locked_documents_rels\` (\`locale_variants_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_taxonomies_id_idx\` ON \`payload_locked_documents_rels\` (\`taxonomies_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_source_evidence_id_idx\` ON \`payload_locked_documents_rels\` (\`source_evidence_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_publication_requests_id_idx\` ON \`payload_locked_documents_rels\` (\`publication_requests_id\`);`)
  await db.run(sql`ALTER TABLE \`source_evidence\` DROP COLUMN \`author_name\`;`)
  await db.run(sql`ALTER TABLE \`source_evidence\` DROP COLUMN \`author_handle\`;`)
  await db.run(sql`ALTER TABLE \`source_evidence\` DROP COLUMN \`author_url\`;`)
  await db.run(sql`ALTER TABLE \`source_evidence\` DROP COLUMN \`original_post_url\`;`)
  await db.run(sql`ALTER TABLE \`source_evidence\` DROP COLUMN \`policy_version\`;`)
  await db.run(sql`ALTER TABLE \`source_evidence\` DROP COLUMN \`risk_accepted_by\`;`)
  await db.run(sql`ALTER TABLE \`source_evidence\` DROP COLUMN \`risk_accepted_at\`;`)
  await db.run(sql`ALTER TABLE \`source_evidence\` DROP COLUMN \`takedown_url\`;`)
  await db.run(sql`ALTER TABLE \`source_evidence\` DROP COLUMN \`takedown_case_id\`;`)
  await db.run(sql`ALTER TABLE \`source_evidence\` DROP COLUMN \`takedown_handled_by\`;`)
  await db.run(sql`ALTER TABLE \`source_evidence\` DROP COLUMN \`takedown_handled_at\`;`)
  await db.run(sql`ALTER TABLE \`source_evidence\` DROP COLUMN \`takedown_scope\`;`)
  await db.run(sql`ALTER TABLE \`_source_evidence_v\` DROP COLUMN \`version_author_name\`;`)
  await db.run(sql`ALTER TABLE \`_source_evidence_v\` DROP COLUMN \`version_author_handle\`;`)
  await db.run(sql`ALTER TABLE \`_source_evidence_v\` DROP COLUMN \`version_author_url\`;`)
  await db.run(sql`ALTER TABLE \`_source_evidence_v\` DROP COLUMN \`version_original_post_url\`;`)
  await db.run(sql`ALTER TABLE \`_source_evidence_v\` DROP COLUMN \`version_policy_version\`;`)
  await db.run(sql`ALTER TABLE \`_source_evidence_v\` DROP COLUMN \`version_risk_accepted_by\`;`)
  await db.run(sql`ALTER TABLE \`_source_evidence_v\` DROP COLUMN \`version_risk_accepted_at\`;`)
  await db.run(sql`ALTER TABLE \`_source_evidence_v\` DROP COLUMN \`version_takedown_url\`;`)
  await db.run(sql`ALTER TABLE \`_source_evidence_v\` DROP COLUMN \`version_takedown_case_id\`;`)
  await db.run(sql`ALTER TABLE \`_source_evidence_v\` DROP COLUMN \`version_takedown_handled_by\`;`)
  await db.run(sql`ALTER TABLE \`_source_evidence_v\` DROP COLUMN \`version_takedown_handled_at\`;`)
  await db.run(sql`ALTER TABLE \`_source_evidence_v\` DROP COLUMN \`version_takedown_scope\`;`)
}
