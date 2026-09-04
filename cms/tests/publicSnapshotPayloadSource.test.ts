import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PayloadPublicSnapshotSource,
  PublicSnapshotError,
  type PublicSnapshotPayloadApi,
} from '../src/snapshot/index.ts'

class FakePayload implements PublicSnapshotPayloadApi {
  beginCalls: unknown[] = []
  findCalls: Record<string, unknown>[] = []
  rollbackCalls: Array<number | string> = []
  transactionId: number | string | null = 'tx-public-snapshot'

  readonly db = {
    beginTransaction: async (options?: unknown) => {
      this.beginCalls.push(options)
      return this.transactionId
    },
    rollbackTransaction: async (id: number | string) => {
      this.rollbackCalls.push(id)
    },
  }

  async find(args: Record<string, unknown>): Promise<{
    docs: unknown[]
    hasNextPage: boolean
    nextPage: null
  }> {
    this.findCalls.push(args)
    return { docs: [], hasNextPage: false, nextPage: null }
  }
}

test('Postgres source threads one repeatable-read transaction through every snapshot query', async () => {
  const payload = new FakePayload()
  const source = new PayloadPublicSnapshotSource(payload, 'postgres')
  const [approvals, withdrawals] = await source.readConsistently((session) => Promise.all([
    session.listApprovals(),
    session.listWithdrawals(),
  ]))

  assert.deepEqual(approvals, [])
  assert.deepEqual(withdrawals, [])
  assert.deepEqual(payload.beginCalls, [{
    accessMode: 'read only',
    isolationLevel: 'repeatable read',
  }])
  assert.equal(payload.findCalls.length, 2)
  for (const call of payload.findCalls) {
    assert.equal((call.req as Record<string, unknown>)?.transactionID, 'tx-public-snapshot')
  }
  assert.deepEqual(payload.rollbackCalls, ['tx-public-snapshot'])
})

test('Payload source maps the immutable withdrawal/outbox record inside the same read', async () => {
  class WithdrawalPayload extends FakePayload {
    override async find(args: Record<string, unknown>): Promise<{
      docs: unknown[]
      hasNextPage: boolean
      nextPage: null
    }> {
      this.findCalls.push(args)
      if (args.collection !== 'content-withdrawals') {
        return { docs: [], hasNextPage: false, nextPage: null }
      }
      return {
        docs: [{
          artifactKey: 'prm_withdraw_01',
          caseId: 'case-001',
          decision: 'takedown',
          decisionFingerprint: `sha256:${'a'.repeat(64)}`,
          decisionSequence: 2,
          id: 'withdrawal-1',
          idempotencyKey: 'withdrawal:prm_withdraw_01:en:1',
          locale: 'en',
          rightsRevision: `sha256:${'b'.repeat(64)}`,
          syncDispatchMode: 'disabled',
          syncEventRevision: `sha256:${'a'.repeat(64)}`,
          syncEventType: 'public_snapshot_withdrawal',
          syncPriority: 'urgent',
          syncRequestedAt: '2026-09-03T10:00:00.000Z',
          withdrawnAt: '2026-09-03T10:00:00.000Z',
          withdrawnBy: 'reviewer-1',
        }],
        hasNextPage: false,
        nextPage: null,
      }
    }
  }
  const source = new PayloadPublicSnapshotSource(new WithdrawalPayload(), 'postgres')
  const records = await source.readConsistently((session) => session.listWithdrawals())
  assert.equal(records.length, 1)
  assert.equal(records[0]?.decision, 'takedown')
  assert.equal(records[0]?.syncPriority, 'urgent')
  assert.equal(records[0]?.syncDispatchMode, 'disabled')
  assert.equal(records[0]?.decisionSequence, 2)
})

test('D1 source fails closed before reading because its current adapter has no immutable read', async () => {
  const payload = new FakePayload()
  const source = new PayloadPublicSnapshotSource(payload, 'd1')
  await assert.rejects(
    source.readConsistently((session) => session.listApprovals()),
    (error) => error instanceof PublicSnapshotError &&
      error.code === 'SNAPSHOT_CONSISTENCY_UNAVAILABLE' &&
      error.httpStatus === 503,
  )
  assert.deepEqual(payload.beginCalls, [])
  assert.deepEqual(payload.findCalls, [])
  assert.deepEqual(payload.rollbackCalls, [])
})

test('a database adapter returning no transaction fails before any content read', async () => {
  const payload = new FakePayload()
  payload.transactionId = null
  const source = new PayloadPublicSnapshotSource(payload, 'postgres')
  await assert.rejects(
    source.readConsistently((session) => session.listApprovals()),
    (error) => error instanceof PublicSnapshotError && error.code === 'SNAPSHOT_CONSISTENCY_UNAVAILABLE',
  )
  assert.equal(payload.findCalls.length, 0)
})

test('read failures roll back the snapshot transaction and preserve the safe failure', async () => {
  const payload = new FakePayload()
  const source = new PayloadPublicSnapshotSource(payload, 'postgres')
  const failure = new PublicSnapshotError('TEST_FAILURE', 'Safe failure', 409)
  await assert.rejects(
    source.readConsistently(async () => { throw failure }),
    (error) => error === failure,
  )
  assert.deepEqual(payload.rollbackCalls, ['tx-public-snapshot'])
})
