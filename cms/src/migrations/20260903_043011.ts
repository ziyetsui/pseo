import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`content_approvals\` ADD \`rights_revision\` text NOT NULL;`)
  await db.run(sql`CREATE INDEX \`content_approvals_rights_revision_idx\` ON \`content_approvals\` (\`rights_revision\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`content_approvals_rights_revision_idx\`;`)
  await db.run(sql`ALTER TABLE \`content_approvals\` DROP COLUMN \`rights_revision\`;`)
}
