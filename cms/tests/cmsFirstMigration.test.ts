import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import { pathToFileURL } from 'node:url'

import {
  up as initialUp,
} from '../src/migrations/20260902_225800_initial_cloudflare_d1.ts'

const CMS_FIRST_MIGRATION_URLS = [
  new URL('../src/migrations/20260903_042456.ts', import.meta.url),
  new URL('../src/migrations/20260903_043011.ts', import.meta.url),
  new URL('../src/migrations/20260903_120000_content_withdrawals.ts', import.meta.url),
] as const

interface SqliteDialect {
  sqlToQuery(query: unknown): { readonly sql: string }
}

interface SqliteDialectModule {
  readonly SQLiteSyncDialect: new () => SqliteDialect
}

interface TableColumn {
  readonly name: string
}

interface IndexRecord {
  readonly name: string
  readonly unique: number
}

async function migrationHarness(): Promise<{
  readonly args: unknown
  readonly database: DatabaseSync
}> {
  const require = createRequire(import.meta.url)
  const requireFromAdapter = createRequire(require.resolve('@payloadcms/db-d1-sqlite'))
  const dialectUrl = pathToFileURL(requireFromAdapter.resolve('drizzle-orm/sqlite-core')).href
  const { SQLiteSyncDialect } = await import(dialectUrl) as SqliteDialectModule
  const dialect = new SQLiteSyncDialect()
  const database = new DatabaseSync(':memory:')
  database.exec('PRAGMA foreign_keys=ON')

  return {
    database,
    args: {
      db: {
        run: async (query: unknown): Promise<void> => {
          database.exec(dialect.sqlToQuery(query).sql)
        },
      },
      payload: {},
      req: {},
    },
  }
}

function tableExists(database: DatabaseSync, table: string): boolean {
  const row = database.prepare(
    "SELECT count(*) AS count FROM sqlite_master WHERE type = 'table' AND name = ?",
  ).get(table) as { readonly count: number }
  return row.count === 1
}

function columnNames(database: DatabaseSync, table: string): readonly string[] {
  return (database.prepare(`PRAGMA table_info('${table}')`).all() as unknown as TableColumn[])
    .map((column) => column.name)
}

function indexRecords(database: DatabaseSync, table: string): readonly IndexRecord[] {
  return database.prepare(`PRAGMA index_list('${table}')`).all() as unknown as IndexRecord[]
}

function migrationStatements(
  migrationUrl: URL,
  direction: 'up' | 'down',
): readonly string[] {
  const source = readFileSync(migrationUrl, 'utf8')
  const startMarker = `export async function ${direction}`
  const start = source.indexOf(startMarker)
  assert.notEqual(start, -1, `${startMarker} must exist`)
  const end = direction === 'up'
    ? source.indexOf('export async function down', start)
    : source.length
  assert.ok(end > start, `${direction} migration body must be complete`)
  const body = source.slice(start, end)
  const statements = [...body.matchAll(/db\.run\(sql`((?:\\[\s\S]|[^`])*)`\)/gu)]
    .map((match) => (match[1] ?? '').replaceAll('\\`', '`'))
  assert.ok(statements.length > 0, `${direction} migration must contain SQL statements`)
  return statements
}

function applyCmsFirstMigrations(database: DatabaseSync, direction: 'up' | 'down'): void {
  const migrations = direction === 'up'
    ? CMS_FIRST_MIGRATION_URLS
    : [...CMS_FIRST_MIGRATION_URLS].reverse()
  for (const migrationUrl of migrations) {
    for (const statement of migrationStatements(migrationUrl, direction)) database.exec(statement)
  }
}

test('CMS-first forward migration preserves review-required content and creates audit schema', async () => {
  const { args, database } = await migrationHarness()

  try {
    await initialUp(args as never)
    database.exec(
      "INSERT INTO users (id, display_name, email) VALUES (1, 'Existing Reviewer', 'existing@example.invalid')",
    )
    database.exec(`
      INSERT INTO prompt_artifacts (
        id, artifact_key, draft_workflow_state, prompt_language, prompt_text, _status
      ) VALUES (
        1, 'prm_existing_seed', 'needs_review', 'en', 'Existing Prompt text', 'draft'
      )
    `)
    database.exec(`
      INSERT INTO source_evidence (
        id, artifact_id, record_type, source_platform, source_url, source_id,
        observed_at, rights_status, is_primary_source, _status
      ) VALUES (
        1, 1, 'source', 'x', 'https://x.com/example/status/1', '1',
        '2026-09-02T00:00:00.000Z', 'review_required', 1, 'draft'
      )
    `)

    const before = database.prepare(`
      SELECT
        source_evidence.id,
        source_evidence.artifact_id AS artifactId,
        source_evidence.rights_status AS rightsStatus,
        source_evidence._status AS payloadStatus,
        prompt_artifacts.artifact_key AS artifactKey,
        prompt_artifacts.draft_workflow_state AS workflowState
      FROM source_evidence
      JOIN prompt_artifacts ON prompt_artifacts.id = source_evidence.artifact_id
      WHERE source_evidence.id = 1
    `).get()
    const userBefore = database.prepare(
      'SELECT id, display_name AS displayName, email FROM users WHERE id = 1',
    ).get()

    applyCmsFirstMigrations(database, 'up')

    const after = database.prepare(`
      SELECT
        source_evidence.id,
        source_evidence.artifact_id AS artifactId,
        source_evidence.rights_status AS rightsStatus,
        source_evidence._status AS payloadStatus,
        prompt_artifacts.artifact_key AS artifactKey,
        prompt_artifacts.draft_workflow_state AS workflowState
      FROM source_evidence
      JOIN prompt_artifacts ON prompt_artifacts.id = source_evidence.artifact_id
      WHERE source_evidence.id = 1
    `).get()
    assert.deepEqual(after, before)
    assert.deepEqual(
      database.prepare(
        'SELECT id, display_name AS displayName, email FROM users WHERE id = 1',
      ).get(),
      userBefore,
    )
    assert.equal(
      (after as { readonly rightsStatus: string }).rightsStatus,
      'review_required',
    )
    assert.equal(
      (after as { readonly workflowState: string }).workflowState,
      'needs_review',
    )

    assert.equal(tableExists(database, 'content_approvals'), true)
    assert.equal(tableExists(database, 'content_approvals_files'), true)
    assert.equal(tableExists(database, 'content_withdrawals'), true)
    assert.equal(tableExists(database, 'publication_decision_sequences'), true)
    const approvalColumns = columnNames(database, 'content_approvals')
    for (const column of [
      'artifact_id',
      'artifact_key',
      'locale',
      'content_revision',
      'source_revision',
      'rights_revision',
      'rights_policy_version',
      'decision',
      'decision_sequence_id',
      'approved_by_id',
      'approved_at',
      'decision_fingerprint',
      'idempotency_key',
    ]) {
      assert.ok(approvalColumns.includes(column), `content_approvals.${column} must exist`)
    }
    const approvalCount = database.prepare(
      'SELECT count(*) AS count FROM content_approvals',
    ).get() as { readonly count: number }
    assert.equal(approvalCount.count, 0, 'migration must not synthesize approval decisions')
    const withdrawalColumns = columnNames(database, 'content_withdrawals')
    for (const column of [
      'artifact_id',
      'artifact_key',
      'locale',
      'decision',
      'case_id',
      'rights_revision',
      'withdrawn_by_id',
      'withdrawn_at',
      'decision_sequence_id',
      'decision_fingerprint',
      'idempotency_key',
      'sync_dispatch_mode',
      'sync_event_type',
      'sync_priority',
      'sync_requested_at',
      'sync_event_revision',
    ]) {
      assert.ok(withdrawalColumns.includes(column), `content_withdrawals.${column} must exist`)
    }
    assert.equal(
      (database.prepare('SELECT count(*) AS count FROM content_withdrawals').get() as { count: number }).count,
      0,
      'migration must not synthesize withdrawal decisions',
    )

    const rightsColumns = [
      'author_name',
      'author_handle',
      'author_url',
      'original_post_url',
      'policy_version',
      'risk_accepted_by',
      'risk_accepted_at',
      'takedown_url',
      'takedown_case_id',
      'takedown_handled_by',
      'takedown_handled_at',
      'takedown_scope',
    ] as const
    const sourceColumns = columnNames(database, 'source_evidence')
    const sourceVersionColumns = columnNames(database, '_source_evidence_v')
    for (const column of rightsColumns) {
      assert.ok(sourceColumns.includes(column), `source_evidence.${column} must exist`)
      assert.ok(
        sourceVersionColumns.includes(`version_${column}`),
        `_source_evidence_v.version_${column} must exist`,
      )
    }

    const approvalIndexes = indexRecords(database, 'content_approvals')
    assert.ok(
      approvalIndexes.some(
        (index) => index.name === 'content_approvals_idempotency_key_idx' && index.unique === 1,
      ),
      'content approval idempotency must have a unique index',
    )
    assert.ok(
      approvalIndexes.some(
        (index) => index.name === 'content_approvals_rights_revision_idx',
      ),
      'content approval rights revisions must be indexed',
    )
    assert.ok(
      approvalIndexes.some(
        (index) => index.name === 'content_approvals_decision_sequence_idx' && index.unique === 1,
      ),
      'content approval decision sequences must have a unique index',
    )
    const lockRelationIndexes = indexRecords(database, 'payload_locked_documents_rels')
    assert.ok(
      columnNames(database, 'payload_locked_documents_rels').includes('content_approvals_id'),
      'Payload lock relations must reference content approvals',
    )
    assert.ok(
      columnNames(database, 'payload_locked_documents_rels').includes('content_withdrawals_id'),
      'Payload lock relations must reference content withdrawals',
    )
    assert.ok(
      lockRelationIndexes.some(
        (index) => index.name === 'payload_locked_documents_rels_content_withdrawals_id_idx',
      ),
      'Payload lock relations must index content withdrawals',
    )

    const withdrawalIndexes = indexRecords(database, 'content_withdrawals')
    assert.ok(
      withdrawalIndexes.some(
        (index) => index.name === 'content_withdrawals_decision_sequence_idx' && index.unique === 1,
      ),
      'content withdrawal decision sequences must have a unique index',
    )
    const decisionSequenceIndexes = indexRecords(database, 'publication_decision_sequences')
    assert.ok(
      decisionSequenceIndexes.some(
        (index) => index.name === 'publication_decision_sequences_event_key_idx' && index.unique === 1,
      ),
      'publication decision event keys must have a unique index',
    )
    assert.ok(
      withdrawalIndexes.some(
        (index) => index.name === 'content_withdrawals_idempotency_key_idx' && index.unique === 1,
      ),
      'content withdrawal idempotency must have a unique index',
    )
    assert.ok(
      withdrawalIndexes.some(
        (index) => index.name === 'content_withdrawals_sync_event_revision_idx' && index.unique === 1,
      ),
      'content withdrawal sync event revisions must have a unique index',
    )
    assert.ok(
      lockRelationIndexes.some(
        (index) => index.name === 'payload_locked_documents_rels_content_approvals_id_idx',
      ),
      'Payload lock relations must index content approvals',
    )
    assert.ok(
      columnNames(database, 'payload_locked_documents_rels')
        .includes('publication_decision_sequences_id'),
      'Payload lock relations must reference publication decision sequences',
    )
    assert.ok(
      lockRelationIndexes.some(
        (index) => index.name === 'payload_locked_documents_rels_publication_decision_sequences_id_idx',
      ),
      'Payload lock relations must index publication decision sequences',
    )

    assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(), [])

    applyCmsFirstMigrations(database, 'down')

    assert.equal(tableExists(database, 'content_approvals'), false)
    assert.equal(tableExists(database, 'content_approvals_files'), false)
    assert.equal(tableExists(database, 'content_withdrawals'), false)
    assert.equal(tableExists(database, 'publication_decision_sequences'), false)
    assert.ok(!columnNames(database, 'source_evidence').includes('author_name'))
    const preservedAfterDown = database.prepare(`
      SELECT
        source_evidence.rights_status AS rightsStatus,
        prompt_artifacts.artifact_key AS artifactKey,
        users.email AS userEmail
      FROM source_evidence
      JOIN prompt_artifacts ON prompt_artifacts.id = source_evidence.artifact_id
      JOIN users ON users.id = 1
      WHERE source_evidence.id = 1
    `).get() as {
      readonly artifactKey: string
      readonly rightsStatus: string
      readonly userEmail: string
    }
    assert.deepEqual({ ...preservedAfterDown }, {
      artifactKey: 'prm_existing_seed',
      rightsStatus: 'review_required',
      userEmail: 'existing@example.invalid',
    })
    assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(), [])
  } finally {
    database.close()
  }
})

test('decision sequence migration backfills existing append-only approvals', async () => {
  const { args, database } = await migrationHarness()
  try {
    await initialUp(args as never)
    for (const migrationUrl of CMS_FIRST_MIGRATION_URLS.slice(0, 2)) {
      for (const statement of migrationStatements(migrationUrl, 'up')) database.exec(statement)
    }
    database.exec(
      "INSERT INTO users (id, display_name, email) VALUES (1, 'Reviewer', 'reviewer@example.invalid')",
    )
    database.exec(`
      INSERT INTO prompt_artifacts (
        id, artifact_key, draft_workflow_state, prompt_language, prompt_text, _status
      ) VALUES (1, 'prm_existing_approval', 'needs_review', 'en', 'Existing Prompt', 'draft')
    `)
    database.exec(`
      INSERT INTO content_approvals (
        id, artifact_id, artifact_key, locale, content_revision, source_revision,
        rights_revision, rights_policy_version, decision, approved_by_id, approved_at,
        decision_fingerprint, idempotency_key, file_count
      ) VALUES (
        1, 1, 'prm_existing_approval', 'en', 'sha256:${'1'.repeat(64)}',
        'sha256:${'2'.repeat(64)}', 'sha256:${'3'.repeat(64)}', 'promptlab-rights-v1',
        'approved', 1, '2026-09-03T01:00:00.000Z', 'sha256:${'4'.repeat(64)}',
        'approval:existing:en:1', 1
      )
    `)

    for (const statement of migrationStatements(CMS_FIRST_MIGRATION_URLS[2], 'up')) {
      database.exec(statement)
    }
    const approval = database.prepare(`
      SELECT decision_sequence_id AS decisionSequence FROM content_approvals WHERE id = 1
    `).get() as { readonly decisionSequence: number }
    const sequence = database.prepare(`
      SELECT id, event_key AS eventKey, kind FROM publication_decision_sequences
    `).get() as { readonly eventKey: string; readonly id: number; readonly kind: string }
    assert.equal(approval.decisionSequence, sequence.id)
    assert.equal(sequence.eventKey, 'approval:approval:existing:en:1')
    assert.equal(sequence.kind, 'approval')
    assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(), [])
  } finally {
    database.close()
  }
})
