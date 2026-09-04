import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationUrl = new URL(
  '../src/migrations-postgres/20260903_143750_agent_proposal_api.ts',
  import.meta.url,
)

test('agent proposal migration adds the scoped role, API-key fields and immutable audit schema', async () => {
  const source = await readFile(migrationUrl, 'utf8')
  assert.match(source, /ADD VALUE 'agent_proposer' BEFORE 'editor'/u)
  assert.match(source, /CREATE TABLE "agent_proposal_audits"/u)
  assert.match(source, /ADD COLUMN "enable_a_p_i_key" boolean/u)
  assert.match(source, /CREATE UNIQUE INDEX "agent_proposal_audits_idempotency_key_idx"/u)
})

test('agent proposal rollback removes referencing locks first and refuses to orphan a service identity', async () => {
  const source = await readFile(migrationUrl, 'utf8')
  const down = source.slice(source.indexOf('export async function down'))
  assert.match(down, /cannot roll back agent proposal API while agent_proposer users exist/u)
  assert.ok(
    down.indexOf('DROP CONSTRAINT "payload_locked_documents_rels_agent_proposal_audits_fk"') <
      down.indexOf('DROP TABLE "agent_proposal_audits"'),
  )
})

test('agent proposal migration is registered after the PostgreSQL baseline', async () => {
  const source = await readFile(new URL('../src/migrations-postgres/index.ts', import.meta.url), 'utf8')
  assert.ok(
    source.indexOf('20260903_060851_initial_postgres_baseline') <
      source.indexOf('20260903_143750_agent_proposal_api'),
  )
})
