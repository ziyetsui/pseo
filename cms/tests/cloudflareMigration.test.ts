import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import { pathToFileURL } from 'node:url'

import {
  down,
  up,
} from '../src/migrations/20260902_225800_initial_cloudflare_d1.ts'

interface SqliteDialect {
  sqlToQuery(query: unknown): { readonly sql: string }
}

interface SqliteDialectModule {
  readonly SQLiteSyncDialect: new () => SqliteDialect
}

test('initial D1 migration drops populated relationship tables child-first', async () => {
  const require = createRequire(import.meta.url)
  const requireFromAdapter = createRequire(require.resolve('@payloadcms/db-d1-sqlite'))
  const dialectUrl = pathToFileURL(requireFromAdapter.resolve('drizzle-orm/sqlite-core')).href
  const { SQLiteSyncDialect } = await import(dialectUrl) as SqliteDialectModule
  const dialect = new SQLiteSyncDialect()
  const database = new DatabaseSync(':memory:')
  database.exec('PRAGMA foreign_keys=ON')

  const migrationArgs = {
    db: {
      run: async (query: unknown): Promise<void> => {
        database.exec(dialect.sqlToQuery(query).sql)
      },
    },
    payload: {},
    req: {},
  }

  await up(migrationArgs as never)
  database.exec(
    "INSERT INTO users (id, display_name, email) VALUES (1, 'Beta Reviewer', 'reviewer@example.invalid')",
  )
  database.exec("INSERT INTO prompt_artifacts (id, artifact_key) VALUES (1, 'prm_smoke')")
  const sha = '0'.repeat(40)
  const revision = `sha256:${'0'.repeat(64)}`
  database.prepare(`
    INSERT INTO publication_requests (
      id, artifact_id, artifact_key, expected_base_sha, expected_content_revision,
      expected_source_revision, validated_content_revision, validated_source_revision,
      commit_message, idempotency_key, request_fingerprint, requested_by_id, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    1,
    1,
    'prm_smoke',
    sha,
    revision,
    revision,
    revision,
    revision,
    'smoke',
    'smoke-key',
    'smoke-fingerprint',
    1,
    'validated',
  )

  await down(migrationArgs as never)

  const remaining = database.prepare(
    "SELECT count(*) AS count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
  ).get() as { readonly count: number }
  assert.equal(remaining.count, 0)
})
