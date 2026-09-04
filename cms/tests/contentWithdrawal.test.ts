import assert from 'node:assert/strict'
import test from 'node:test'

import { ContentWithdrawals } from '../src/collections/ContentWithdrawals.ts'
import type {
  ContentWithdrawalRepository,
  ContentWithdrawalInput,
  ContentWithdrawalRightsReader,
  CurrentWithdrawalRightsState,
} from '../src/domain/index.ts'
import {
  ContentWithdrawalIdempotencyConflictError,
  ContentWithdrawalRevisionConflictError,
} from '../src/domain/index.ts'
import {
  createContentWithdrawalEndpoint,
  createPrepareContentWithdrawalEndpoint,
} from '../src/endpoints/createContentWithdrawal.ts'
import {
  ContentWithdrawalService,
  InMemoryContentWithdrawalRepository,
  PayloadContentWithdrawalRightsReader,
} from '../src/withdrawal/index.ts'

const RIGHTS_REVISION = `sha256:${'a'.repeat(64)}` as const

class FixedRightsReader implements ContentWithdrawalRightsReader {
  state: CurrentWithdrawalRightsState = {
    caseId: 'case-001',
    decision: 'takedown',
    rightsRevision: RIGHTS_REVISION,
  }

  async readCurrentRights(): Promise<CurrentWithdrawalRightsState> {
    return this.state
  }
}

class CountingRepository extends InMemoryContentWithdrawalRepository {
  creates = 0

  override async createWithdrawal(input: Parameters<ContentWithdrawalRepository['createWithdrawal']>[0]) {
    this.creates += 1
    return super.createWithdrawal(input)
  }
}

function input(overrides: Partial<ContentWithdrawalInput> = {}): ContentWithdrawalInput {
  return {
    artifactId: 'prm_withdraw_01',
    caseId: 'case-001',
    decision: 'takedown',
    expectedDecisionSequence: 0,
    expectedRightsRevision: RIGHTS_REVISION,
    idempotencyKey: 'withdrawal:prm_withdraw_01:en:1',
    locale: 'en',
    ...overrides,
  }
}

test('withdrawal service appends one immutable tombstone with explicitly disabled dispatch', async () => {
  const repository = new CountingRepository()
  const service = new ContentWithdrawalService(repository, new FixedRightsReader(), {
    clock: { now: () => new Date('2026-09-03T10:00:00.000Z') },
  })
  const prepared = await service.prepare('prm_withdraw_01', 'en', 'takedown', 'case-001')
  assert.equal(prepared.expectedRightsRevision, RIGHTS_REVISION)
  assert.equal(prepared.expectedDecisionSequence, 0)

  const record = await service.withdraw(input(), 'reviewer-1')
  assert.equal(repository.creates, 1)
  assert.equal(record.decision, 'takedown')
  assert.equal(record.withdrawnAt, '2026-09-03T10:00:00.000Z')
  assert.equal(record.syncRequestedAt, record.withdrawnAt)
  assert.ok(Number.isSafeInteger(record.decisionSequence))
  assert.ok(record.decisionSequence > 0)
  assert.equal(record.syncDispatchMode, 'disabled')
  assert.equal(record.syncEventType, 'public_snapshot_withdrawal')
  assert.equal(record.syncPriority, 'urgent')
  assert.match(record.syncEventRevision, /^sha256:[a-f0-9]{64}$/u)
  assert.notEqual(record.syncEventRevision, record.decisionFingerprint)
  assert.match(record.decisionFingerprint, /^sha256:[a-f0-9]{64}$/u)

  const replay = await service.withdraw(input({
    expectedDecisionSequence: record.decisionSequence,
  }), 'reviewer-1')
  assert.deepEqual(replay, record)
  assert.equal(repository.creates, 1)
})

test('withdrawal is revision-bound and idempotency cannot be reused across decisions', async () => {
  const repository = new CountingRepository()
  const reader = new FixedRightsReader()
  const service = new ContentWithdrawalService(repository, reader)

  await assert.rejects(
    service.withdraw(input({ expectedRightsRevision: `sha256:${'b'.repeat(64)}` }), 'reviewer-1'),
    ContentWithdrawalRevisionConflictError,
  )
  assert.equal(repository.creates, 0)

  await service.withdraw(input(), 'reviewer-1')
  await assert.rejects(
    service.withdraw(input({ caseId: 'case-002' }), 'reviewer-1'),
    ContentWithdrawalIdempotencyConflictError,
  )
  assert.equal(repository.creates, 1)
})

async function accessResult(
  access: NonNullable<typeof ContentWithdrawals.access>['create'] | undefined,
  user: unknown,
) {
  if (typeof access !== 'function') throw new Error('Expected collection access function')
  return access({ req: { user } } as never)
}

test('ContentWithdrawals is append-only and reviewer-readable', async () => {
  assert.equal(await accessResult(ContentWithdrawals.access?.create, { roles: ['admin'] }), false)
  assert.equal(await accessResult(ContentWithdrawals.access?.update, { roles: ['admin'] }), false)
  assert.equal(await accessResult(ContentWithdrawals.access?.delete, { roles: ['admin'] }), false)
  assert.equal(await accessResult(ContentWithdrawals.access?.read, { roles: ['editor'] }), false)
  assert.equal(await accessResult(ContentWithdrawals.access?.read, { roles: ['reviewer'] }), true)
})

function endpointRequest(options: {
  readonly body: unknown
  readonly idempotencyKey?: string
  readonly payload?: unknown
  readonly user: unknown
}): never {
  const headers = new Headers()
  if (options.idempotencyKey) headers.set('Idempotency-Key', options.idempotencyKey)
  return {
    headers,
    json: async () => options.body,
    payload: options.payload ?? {
      create: async () => { throw new Error('not used') },
      db: {
        beginTransaction: async () => 'tx-1',
        commitTransaction: async () => undefined,
        name: 'postgres',
        pool: {
          options: { max: 5 },
          connect: async () => ({
            query: async (text: string) => ({
              rows: [{
                ...(text.includes('unlock')
                  ? { pg_advisory_unlock: true }
                  : { pg_try_advisory_lock: true }),
              }],
            }),
            release: () => undefined,
          }),
        },
        rollbackTransaction: async () => undefined,
      },
      find: async () => ({ docs: [] }),
      update: async () => { throw new Error('not used') },
    },
    routeParams: { artifactId: 'prm_withdraw_01' },
    user: options.user,
  } as never
}

test('withdrawal endpoints are reviewer-controlled and expose revision prepare/append', async () => {
  const repository = new CountingRepository()
  const reader = new FixedRightsReader()
  const options = {
    clock: { now: () => new Date('2026-09-03T10:00:00.000Z') },
    createRepository: () => repository,
    createRightsReader: () => reader,
  }
  const prepareEndpoint = createPrepareContentWithdrawalEndpoint(options)
  const forbidden = await prepareEndpoint.handler(endpointRequest({
    body: { caseId: 'case-001', decision: 'takedown', locale: 'en' },
    user: { id: 'editor-1', roles: ['editor'] },
  }))
  assert.ok(forbidden instanceof Response)
  assert.equal(forbidden.status, 403)

  const prepared = await prepareEndpoint.handler(endpointRequest({
    body: { caseId: 'case-001', decision: 'takedown', locale: 'en' },
    user: { id: 'reviewer-1', roles: ['reviewer'] },
  }))
  assert.ok(prepared instanceof Response)
  assert.equal(prepared.status, 200)
  const preparedBody = await prepared.json() as {
    data: { expectedDecisionSequence: number; expectedRightsRevision: string }
  }
  assert.equal(preparedBody.data.expectedDecisionSequence, 0)
  assert.equal(preparedBody.data.expectedRightsRevision, RIGHTS_REVISION)

  const endpoint = createContentWithdrawalEndpoint(options)
  const created = await endpoint.handler(endpointRequest({
    body: {
      caseId: 'case-001',
      decision: 'takedown',
      expectedDecisionSequence: preparedBody.data.expectedDecisionSequence,
      expectedRightsRevision: RIGHTS_REVISION,
      locale: 'en',
    },
    idempotencyKey: 'withdrawal:prm_withdraw_01:en:1',
    user: { id: 'reviewer-1', roles: ['reviewer'] },
  }))
  assert.ok(created instanceof Response)
  assert.equal(created.status, 201)
  const createdBody = await created.json() as { data: Record<string, unknown> }
  assert.equal(createdBody.data.withdrawnBy, 'reviewer-1')
  assert.equal(createdBody.data.syncPriority, 'urgent')
  assert.equal(createdBody.data.syncDispatchMode, 'disabled')
})

test('withdrawal endpoint fails closed when the adapter cannot provide an atomic transaction', async () => {
  const repository = new CountingRepository()
  const endpoint = createContentWithdrawalEndpoint({
    createRepository: () => repository,
    createRightsReader: () => new FixedRightsReader(),
  })
  const response = await endpoint.handler(endpointRequest({
    body: {
      caseId: 'case-001',
      decision: 'takedown',
      expectedDecisionSequence: 0,
      expectedRightsRevision: RIGHTS_REVISION,
      locale: 'en',
    },
    idempotencyKey: 'withdrawal:prm_withdraw_01:en:no-transaction',
    payload: {},
    user: { id: 'reviewer-1', roles: ['reviewer'] },
  }))
  assert.ok(response instanceof Response)
  assert.equal(response.status, 503)
  assert.equal(
    (await response.json() as { code: string }).code,
    'PUBLICATION_DECISION_CONSISTENCY_UNAVAILABLE',
  )
  assert.equal(repository.creates, 0)
})

test('Payload rights reader binds a takedown tombstone to the current audited rights fields', async () => {
  const calls: Record<string, unknown>[] = []
  const reader = new PayloadContentWithdrawalRightsReader({
    create: async () => { throw new Error('not used') },
    find: async (args) => {
      calls.push(args)
      if (args.collection === 'prompt-artifacts') return { docs: [{ id: 'artifact-doc-1' }] }
      return {
        docs: [{
          id: 'source-doc-1',
          isPrimarySource: true,
          recordType: 'source',
          rightsStatus: 'takedown',
          sourceUrl: 'https://example.com/source',
          takedownCaseId: 'case-001',
          takedownHandledAt: '2026-09-03T09:00:00.000Z',
          takedownHandledBy: 'reviewer-1',
          takedownScope: 'prm_withdraw_01/en',
        }],
      }
    },
  })
  const state = await reader.readCurrentRights('prm_withdraw_01', 'en')
  assert.equal(state.decision, 'takedown')
  assert.equal(state.caseId, 'case-001')
  assert.match(state.rightsRevision, /^sha256:[a-f0-9]{64}$/u)
  assert.deepEqual(calls.map((call) => call.collection), ['prompt-artifacts', 'source-evidence'])
})

test('Payload rights reader accepts the restricted rights contract without invented review fields', async () => {
  const reader = new PayloadContentWithdrawalRightsReader({
    create: async () => { throw new Error('not used') },
    find: async (args) => args.collection === 'prompt-artifacts'
      ? { docs: [{ id: 'artifact-doc-1' }] }
      : {
          docs: [{
            basis: 'Public reuse is restricted by the recorded rights decision.',
            id: 'source-doc-1',
            isPrimarySource: true,
            recordType: 'source',
            rightsStatus: 'restricted',
            sourceUrl: 'https://example.com/source',
          }],
        },
  })
  const state = await reader.readCurrentRights('prm_withdraw_01', 'en')
  assert.equal(state.decision, 'restricted')
  assert.equal(state.caseId, null)
  assert.match(state.rightsRevision, /^sha256:[a-f0-9]{64}$/u)
})
