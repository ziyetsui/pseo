import assert from 'node:assert/strict'
import test from 'node:test'

import { ContentApprovalService } from '../src/approval/index.ts'
import {
  PublicationDecisionTransactionError,
  runSerializablePayloadDecision,
  type PublicationDecisionTransactionalPayload,
} from '../src/decision/index.ts'
import {
  ContentApprovalRevisionConflictError,
  type ApprovedContentRevision,
  type ApprovedContentWithdrawal,
  type ContentApprovalRecord,
  type ContentApprovalRepository,
  type ContentApprovalValidationResult,
  type ContentApprovalValidator,
  type ContentWithdrawalRecord,
  type ContentWithdrawalRepository,
  type ContentWithdrawalRightsReader,
  type PublicationDraftSelection,
} from '../src/domain/index.ts'
import { ContentWithdrawalService } from '../src/withdrawal/index.ts'

type Call = { readonly args?: Record<string, unknown>; readonly name: string }

function fakePostgresPayload(calls: Call[]): PublicationDecisionTransactionalPayload {
  let transaction = 0
  return {
    create: async (args) => {
      calls.push({ args, name: 'create' })
      return { id: 1 }
    },
    db: {
      beginTransaction: async (options) => {
        calls.push({ args: { options }, name: 'begin' })
        transaction += 1
        return `tx-${transaction}`
      },
      commitTransaction: async (id) => {
        calls.push({ args: { id }, name: 'commit' })
      },
      name: 'postgres',
      pool: {
        options: { max: 5 },
        connect: async () => ({
          query: async (text, values) => {
            calls.push({ args: { text, values }, name: text.includes('unlock') ? 'unlock' : 'lock' })
            return text.includes('unlock')
              ? { rows: [{ pg_advisory_unlock: true }] }
              : { rows: [{ pg_try_advisory_lock: true }] }
          },
          release: (destroy) => calls.push({ args: { destroy }, name: 'release' }),
        }),
      },
      rollbackTransaction: async (id) => {
        calls.push({ args: { id }, name: 'rollback' })
      },
    },
    find: async (args) => {
      calls.push({ args, name: 'find' })
      return { docs: [] }
    },
    update: async (args) => {
      calls.push({ args, name: 'update' })
      return { id: 1 }
    },
  }
}

test('one serializable decision transaction threads the same Payload req through every local operation', async () => {
  const calls: Call[] = []
  const payload = fakePostgresPayload(calls)
  const result = await runSerializablePayloadDecision(
    payload,
    'prm_atomic_01',
    async (transactional) => {
      await transactional.find({ collection: 'prompt-artifacts' })
      await transactional.create({ collection: 'publication-decision-sequences' })
      await transactional.update({ collection: 'content-approvals' })
      return 'committed'
    },
    async (committedPayload, value) => {
      assert.equal(committedPayload, payload)
      assert.equal(value, 'committed')
      calls.push({ name: 'verify' })
      return true
    },
  )

  assert.equal(result, 'committed')
  assert.deepEqual(calls.map((call) => call.name), [
    'lock', 'begin', 'find', 'create', 'update', 'commit', 'verify', 'unlock', 'release',
  ])
  assert.deepEqual(calls[1]?.args?.options, {
    accessMode: 'read write',
    isolationLevel: 'serializable',
  })
  const requests = calls.slice(2, 5).map((call) => call.args?.req)
  assert.equal(requests[0], requests[1])
  assert.equal(requests[1], requests[2])
  assert.deepEqual(requests[0], { payload, transactionID: 'tx-1' })
})

test('decision transaction rolls back and does not verify when the operation fails', async () => {
  const calls: Call[] = []
  const payload = fakePostgresPayload(calls)
  const failure = new Error('domain failure')

  await assert.rejects(
    runSerializablePayloadDecision(
      payload,
      'prm_atomic_01',
      async (transactional) => {
        await transactional.create({ collection: 'publication-decision-sequences' })
        throw failure
      },
      async () => {
        calls.push({ name: 'verify' })
        return true
      },
    ),
    (error: unknown) => error === failure,
  )
  assert.deepEqual(calls.map((call) => call.name), [
    'lock', 'begin', 'create', 'rollback', 'unlock', 'release',
  ])
})

test('decision transaction fails closed when atomicity or committed-audit verification is unavailable', async () => {
  const unavailablePayload = {
    ...fakePostgresPayload([]),
    db: { ...fakePostgresPayload([]).db, name: 'd1' },
  } as PublicationDecisionTransactionalPayload
  await assert.rejects(
    runSerializablePayloadDecision(unavailablePayload, 'prm_atomic_01', async () => 'no', async () => true),
    (error: unknown) => error instanceof PublicationDecisionTransactionError &&
      error.code === 'PUBLICATION_DECISION_CONSISTENCY_UNAVAILABLE',
  )

  const calls: Call[] = []
  await assert.rejects(
    runSerializablePayloadDecision(
      fakePostgresPayload(calls),
      'prm_atomic_01',
      async () => 'possibly-committed',
      async () => false,
    ),
    (error: unknown) => error instanceof PublicationDecisionTransactionError &&
      error.code === 'PUBLICATION_DECISION_COMMIT_UNVERIFIED',
  )
  assert.deepEqual(calls.map((call) => call.name), [
    'lock', 'begin', 'commit', 'unlock', 'release',
  ])
})

interface SharedDecisionLedger {
  approvals: Map<string, ContentApprovalRecord>
  sequence: number
  withdrawals: Map<string, ContentWithdrawalRecord>
}

class SharedApprovalRepository implements ContentApprovalRepository {
  private readonly ledger: SharedDecisionLedger

  constructor(ledger: SharedDecisionLedger) {
    this.ledger = ledger
  }

  async createApproved(input: ApprovedContentRevision): Promise<ContentApprovalRecord> {
    this.ledger.sequence += 1
    const record: ContentApprovalRecord = {
      ...input,
      decisionSequence: this.ledger.sequence,
      id: `approval-${this.ledger.sequence}`,
    }
    this.ledger.approvals.set(input.idempotencyKey, record)
    return record
  }

  async findByIdempotencyKey(key: string): Promise<ContentApprovalRecord | null> {
    return this.ledger.approvals.get(key) ?? null
  }

  async latestDecisionSequence(): Promise<number> {
    return this.ledger.sequence
  }
}

class SharedWithdrawalRepository implements ContentWithdrawalRepository {
  private readonly ledger: SharedDecisionLedger

  constructor(ledger: SharedDecisionLedger) {
    this.ledger = ledger
  }

  async createWithdrawal(input: ApprovedContentWithdrawal): Promise<ContentWithdrawalRecord> {
    this.ledger.sequence += 1
    const record: ContentWithdrawalRecord = {
      ...input,
      decisionSequence: this.ledger.sequence,
      id: `withdrawal-${this.ledger.sequence}`,
    }
    this.ledger.withdrawals.set(input.idempotencyKey, record)
    return record
  }

  async findByIdempotencyKey(key: string): Promise<ContentWithdrawalRecord | null> {
    return this.ledger.withdrawals.get(key) ?? null
  }

  async latestDecisionSequence(): Promise<number> {
    return this.ledger.sequence
  }
}

class CountingValidator implements ContentApprovalValidator {
  calls: PublicationDraftSelection[] = []

  async validate(input: PublicationDraftSelection): Promise<ContentApprovalValidationResult> {
    this.calls.push(input)
    return {
      contentRevision: `sha256:${'a'.repeat(64)}`,
      files: [{ content: 'approved\n', path: 'content/prompts/prm_atomic_01/en.md' }],
      rightsRevision: `sha256:${'b'.repeat(64)}`,
      sourceRevision: `sha256:${'c'.repeat(64)}`,
    }
  }
}

class ArtifactMutexPool {
  readonly options = { max: 5 }
  private held = false
  private connections = 0
  readonly firstLockAttempted: Promise<void>
  private markFirstLockAttempted!: () => void
  private releaseFirstLock!: () => void
  private readonly firstLockGate: Promise<void>

  constructor() {
    this.firstLockAttempted = new Promise((resolve) => { this.markFirstLockAttempted = resolve })
    this.firstLockGate = new Promise((resolve) => { this.releaseFirstLock = resolve })
  }

  allowFirstRequestToLock(): void {
    this.releaseFirstLock()
  }

  async connect() {
    this.connections += 1
    const connection = this.connections
    return {
      query: async (text: string) => {
        if (text.includes('pg_advisory_unlock')) {
          this.held = false
          return { rows: [{ pg_advisory_unlock: true }] }
        }
        if (connection === 1) {
          this.markFirstLockAttempted()
          await this.firstLockGate
        }
        if (this.held) return { rows: [{ pg_try_advisory_lock: false }] }
        this.held = true
        return { rows: [{ pg_try_advisory_lock: true }] }
      },
      release: () => undefined,
    }
  }
}

test('approval prepared and validated before takedown cannot reserve a later sequence or republish', async () => {
  const ledger: SharedDecisionLedger = {
    approvals: new Map(),
    sequence: 0,
    withdrawals: new Map(),
  }
  const validator = new CountingValidator()
  const approvalRepository = new SharedApprovalRepository(ledger)
  const withdrawalRepository = new SharedWithdrawalRepository(ledger)
  const approvalService = new ContentApprovalService(approvalRepository, validator)
  const rightsReader: ContentWithdrawalRightsReader = {
    readCurrentRights: async () => ({
      caseId: 'case-atomic-01',
      decision: 'takedown',
      rightsRevision: `sha256:${'d'.repeat(64)}`,
    }),
  }
  const withdrawalService = new ContentWithdrawalService(withdrawalRepository, rightsReader)
  const artifactId = 'prm_atomic_01'
  const approvalPrepared = await approvalService.prepare(artifactId, 'en')
  const withdrawalPrepared = await withdrawalService.prepare(
    artifactId,
    'en',
    'takedown',
    'case-atomic-01',
  )
  assert.equal(validator.calls.length, 1)
  assert.equal(approvalPrepared.expectedDecisionSequence, 0)
  assert.equal(withdrawalPrepared.expectedDecisionSequence, 0)

  const pool = new ArtifactMutexPool()
  let transaction = 0
  let rollbacks = 0
  const payload = {
    ...fakePostgresPayload([]),
    db: {
      beginTransaction: async () => `tx-${++transaction}`,
      commitTransaction: async () => undefined,
      name: 'postgres',
      pool,
      rollbackTransaction: async () => { rollbacks += 1 },
    },
  } as PublicationDecisionTransactionalPayload

  const staleApproval = runSerializablePayloadDecision(
    payload,
    artifactId,
    async () => approvalService.approve({
      artifactId,
      expectedContentRevision: approvalPrepared.expectedContentRevision,
      expectedDecisionSequence: approvalPrepared.expectedDecisionSequence,
      expectedRightsPolicyVersion: approvalPrepared.expectedRightsPolicyVersion,
      expectedRightsRevision: approvalPrepared.expectedRightsRevision,
      expectedSourceRevision: approvalPrepared.expectedSourceRevision,
      idempotencyKey: 'approval:atomic:en:1',
      locale: 'en',
    }, 'reviewer-approval'),
    async () => true,
  )
  await pool.firstLockAttempted

  const withdrawal = await runSerializablePayloadDecision(
    payload,
    artifactId,
    async () => withdrawalService.withdraw({
      artifactId,
      caseId: withdrawalPrepared.caseId,
      decision: withdrawalPrepared.decision,
      expectedDecisionSequence: withdrawalPrepared.expectedDecisionSequence,
      expectedRightsRevision: withdrawalPrepared.expectedRightsRevision,
      idempotencyKey: 'withdrawal:atomic:en:1',
      locale: 'en',
    }, 'reviewer-withdrawal'),
    async (_committedPayload, expected) => (
      ledger.withdrawals.get(expected.idempotencyKey)?.id === expected.id
    ),
  )
  assert.equal(withdrawal.decisionSequence, 1)
  pool.allowFirstRequestToLock()

  await assert.rejects(staleApproval, ContentApprovalRevisionConflictError)
  assert.equal(ledger.sequence, 1)
  assert.equal(ledger.approvals.size, 0)
  assert.equal(ledger.withdrawals.size, 1)
  assert.equal(validator.calls.length, 1, 'stale approval must fail before decision revalidation')
  assert.equal(rollbacks, 1)
})
