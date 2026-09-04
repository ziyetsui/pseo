import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-d1-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`publication_decision_sequences\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`artifact_id\` integer NOT NULL,
    \`artifact_key\` text NOT NULL,
    \`locale\` text NOT NULL,
    \`kind\` text NOT NULL,
    \`event_key\` text NOT NULL,
    \`decision_fingerprint\` text NOT NULL,
    \`decided_by_id\` integer NOT NULL,
    \`decided_at\` text NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (\`artifact_id\`) REFERENCES \`prompt_artifacts\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`decided_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );`)
  await db.run(sql`CREATE INDEX \`publication_decision_sequences_artifact_idx\` ON \`publication_decision_sequences\` (\`artifact_id\`);`)
  await db.run(sql`CREATE INDEX \`publication_decision_sequences_artifact_key_idx\` ON \`publication_decision_sequences\` (\`artifact_key\`);`)
  await db.run(sql`CREATE INDEX \`publication_decision_sequences_locale_idx\` ON \`publication_decision_sequences\` (\`locale\`);`)
  await db.run(sql`CREATE INDEX \`publication_decision_sequences_kind_idx\` ON \`publication_decision_sequences\` (\`kind\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`publication_decision_sequences_event_key_idx\` ON \`publication_decision_sequences\` (\`event_key\`);`)
  await db.run(sql`CREATE INDEX \`publication_decision_sequences_decision_fingerprint_idx\` ON \`publication_decision_sequences\` (\`decision_fingerprint\`);`)
  await db.run(sql`CREATE INDEX \`publication_decision_sequences_decided_by_idx\` ON \`publication_decision_sequences\` (\`decided_by_id\`);`)
  await db.run(sql`CREATE INDEX \`publication_decision_sequences_decided_at_idx\` ON \`publication_decision_sequences\` (\`decided_at\`);`)
  await db.run(sql`CREATE INDEX \`publication_decision_sequences_updated_at_idx\` ON \`publication_decision_sequences\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`publication_decision_sequences_created_at_idx\` ON \`publication_decision_sequences\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`content_approvals\` ADD \`decision_sequence_id\` integer REFERENCES publication_decision_sequences(id);`)
  await db.run(sql`INSERT INTO \`publication_decision_sequences\` (
    \`artifact_id\`, \`artifact_key\`, \`locale\`, \`kind\`, \`event_key\`,
    \`decision_fingerprint\`, \`decided_by_id\`, \`decided_at\`
  ) SELECT
    \`artifact_id\`, \`artifact_key\`, \`locale\`, 'approval', 'approval:' || \`idempotency_key\`,
    \`decision_fingerprint\`, \`approved_by_id\`, \`approved_at\`
  FROM \`content_approvals\`
  ORDER BY \`approved_at\`, \`id\`;`)
  await db.run(sql`UPDATE \`content_approvals\`
    SET \`decision_sequence_id\` = (
      SELECT \`id\` FROM \`publication_decision_sequences\`
      WHERE \`event_key\` = 'approval:' || \`content_approvals\`.\`idempotency_key\`
    );`)
  await db.run(sql`CREATE UNIQUE INDEX \`content_approvals_decision_sequence_idx\` ON \`content_approvals\` (\`decision_sequence_id\`);`)
  await db.run(sql`CREATE TABLE \`content_withdrawals\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`artifact_id\` integer NOT NULL,
    \`artifact_key\` text NOT NULL,
    \`locale\` text NOT NULL,
    \`decision\` text NOT NULL,
    \`case_id\` text NOT NULL,
    \`rights_revision\` text NOT NULL,
    \`withdrawn_by_id\` integer NOT NULL,
    \`withdrawn_at\` text NOT NULL,
    \`decision_sequence_id\` integer NOT NULL,
    \`decision_fingerprint\` text NOT NULL,
    \`idempotency_key\` text NOT NULL,
    \`sync_dispatch_mode\` text NOT NULL,
    \`sync_event_type\` text NOT NULL,
    \`sync_priority\` text NOT NULL,
    \`sync_requested_at\` text NOT NULL,
    \`sync_event_revision\` text NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (\`artifact_id\`) REFERENCES \`prompt_artifacts\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`withdrawn_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`decision_sequence_id\`) REFERENCES \`publication_decision_sequences\`(\`id\`) ON UPDATE no action ON DELETE set null
  );`)
  await db.run(sql`CREATE INDEX \`content_withdrawals_artifact_idx\` ON \`content_withdrawals\` (\`artifact_id\`);`)
  await db.run(sql`CREATE INDEX \`content_withdrawals_artifact_key_idx\` ON \`content_withdrawals\` (\`artifact_key\`);`)
  await db.run(sql`CREATE INDEX \`content_withdrawals_locale_idx\` ON \`content_withdrawals\` (\`locale\`);`)
  await db.run(sql`CREATE INDEX \`content_withdrawals_decision_idx\` ON \`content_withdrawals\` (\`decision\`);`)
  await db.run(sql`CREATE INDEX \`content_withdrawals_case_id_idx\` ON \`content_withdrawals\` (\`case_id\`);`)
  await db.run(sql`CREATE INDEX \`content_withdrawals_rights_revision_idx\` ON \`content_withdrawals\` (\`rights_revision\`);`)
  await db.run(sql`CREATE INDEX \`content_withdrawals_withdrawn_by_idx\` ON \`content_withdrawals\` (\`withdrawn_by_id\`);`)
  await db.run(sql`CREATE INDEX \`content_withdrawals_withdrawn_at_idx\` ON \`content_withdrawals\` (\`withdrawn_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`content_withdrawals_decision_sequence_idx\` ON \`content_withdrawals\` (\`decision_sequence_id\`);`)
  await db.run(sql`CREATE INDEX \`content_withdrawals_decision_fingerprint_idx\` ON \`content_withdrawals\` (\`decision_fingerprint\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`content_withdrawals_idempotency_key_idx\` ON \`content_withdrawals\` (\`idempotency_key\`);`)
  await db.run(sql`CREATE INDEX \`content_withdrawals_sync_requested_at_idx\` ON \`content_withdrawals\` (\`sync_requested_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`content_withdrawals_sync_event_revision_idx\` ON \`content_withdrawals\` (\`sync_event_revision\`);`)
  await db.run(sql`CREATE INDEX \`content_withdrawals_updated_at_idx\` ON \`content_withdrawals\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`content_withdrawals_created_at_idx\` ON \`content_withdrawals\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`content_withdrawals_id\` integer REFERENCES content_withdrawals(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_content_withdrawals_id_idx\` ON \`payload_locked_documents_rels\` (\`content_withdrawals_id\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`publication_decision_sequences_id\` integer REFERENCES publication_decision_sequences(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_publication_decision_sequences_id_idx\` ON \`payload_locked_documents_rels\` (\`publication_decision_sequences_id\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`payload_locked_documents_rels_publication_decision_sequences_id_idx\`;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` DROP COLUMN \`publication_decision_sequences_id\`;`)
  await db.run(sql`DROP INDEX \`payload_locked_documents_rels_content_withdrawals_id_idx\`;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` DROP COLUMN \`content_withdrawals_id\`;`)
  await db.run(sql`DROP TABLE \`content_withdrawals\`;`)
  await db.run(sql`DROP INDEX \`content_approvals_decision_sequence_idx\`;`)
  await db.run(sql`ALTER TABLE \`content_approvals\` DROP COLUMN \`decision_sequence_id\`;`)
  await db.run(sql`DROP TABLE \`publication_decision_sequences\`;`)
}
