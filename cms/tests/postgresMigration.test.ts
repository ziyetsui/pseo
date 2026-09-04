import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { cmsMigrationDirectory } from '../src/config/migrationDirectory.ts'

const SOURCE_DIRECTORY = fileURLToPath(new URL('../src/', import.meta.url))
const POSTGRES_BASELINE_NAME = '20260903_060851_initial_postgres_baseline'
const POSTGRES_BASELINE_URL = new URL(
  `../src/migrations-postgres/${POSTGRES_BASELINE_NAME}.ts`,
  import.meta.url,
)
const POSTGRES_INDEX_URL = new URL('../src/migrations-postgres/index.ts', import.meta.url)
const POSTGRES_SNAPSHOT_URL = new URL(
  `../src/migrations-postgres/${POSTGRES_BASELINE_NAME}.json`,
  import.meta.url,
)

interface DrizzleSnapshotTable {
  readonly columns: Readonly<Record<string, { readonly notNull?: boolean }>>
  readonly foreignKeys: Readonly<Record<string, unknown>>
  readonly indexes: Readonly<Record<string, { readonly isUnique?: boolean }>>
}

interface DrizzleSnapshot {
  readonly dialect: string
  readonly tables: Readonly<Record<string, DrizzleSnapshotTable>>
}

test('database adapters use separate absolute migration directories', () => {
  const d1 = cmsMigrationDirectory(SOURCE_DIRECTORY, 'd1')
  const postgres = cmsMigrationDirectory(SOURCE_DIRECTORY, 'postgres')

  assert.equal(d1, fileURLToPath(new URL('../src/migrations', import.meta.url)))
  assert.equal(
    postgres,
    fileURLToPath(new URL('../src/migrations-postgres', import.meta.url)),
  )
  assert.notEqual(d1, postgres)
})

test('Postgres baseline is dialect-native and registered independently from D1', () => {
  const index = readFileSync(POSTGRES_INDEX_URL, 'utf8')
  const source = readFileSync(POSTGRES_BASELINE_URL, 'utf8')

  assert.match(index, new RegExp(`name: '${POSTGRES_BASELINE_NAME}'`, 'u'))
  assert.match(index, new RegExp(`${POSTGRES_BASELINE_NAME}\\.up`, 'u'))
  assert.match(index, new RegExp(`${POSTGRES_BASELINE_NAME}\\.down`, 'u'))
  assert.doesNotMatch(index, /cloudflare_d1/u)
  assert.match(source, /from '@payloadcms\/db-postgres'/u)
  assert.match(source, /await db\.execute\(sql`/u)
  assert.doesNotMatch(source, /db\.run\(/u)
})

test('Postgres baseline snapshot contains all current publication decision schema', () => {
  const snapshot = JSON.parse(readFileSync(POSTGRES_SNAPSHOT_URL, 'utf8')) as DrizzleSnapshot
  assert.equal(snapshot.dialect, 'postgresql')

  for (const tableName of [
    'public.users',
    'public.prompt_artifacts',
    'public.locale_variants',
    'public.taxonomies',
    'public.source_evidence',
    'public.publication_decision_sequences',
    'public.content_approvals',
    'public.content_withdrawals',
    'public.publication_requests',
    'public.payload_migrations',
  ]) {
    assert.ok(snapshot.tables[tableName], `${tableName} must exist in the Postgres baseline`)
  }

  const approvals = snapshot.tables['public.content_approvals']!
  const withdrawals = snapshot.tables['public.content_withdrawals']!
  const decisions = snapshot.tables['public.publication_decision_sequences']!

  assert.equal(approvals.columns.decision_sequence_id?.notNull, true)
  assert.equal(withdrawals.columns.decision_sequence_id?.notNull, true)
  assert.equal(withdrawals.columns.sync_dispatch_mode?.notNull, true)
  assert.equal(decisions.columns.event_key?.notNull, true)
  assert.equal(approvals.indexes.content_approvals_decision_sequence_idx?.isUnique, true)
  assert.equal(withdrawals.indexes.content_withdrawals_decision_sequence_idx?.isUnique, true)
  assert.ok(
    approvals.foreignKeys
      .content_approvals_decision_sequence_id_publication_decision_sequences_id_fk,
  )
  assert.ok(
    withdrawals.foreignKeys
      .content_withdrawals_decision_sequence_id_publication_decision_sequences_id_fk,
  )
})
