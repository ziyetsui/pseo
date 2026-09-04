import assert from 'node:assert/strict'
import test from 'node:test'

import { InMemoryContentApprovalRepository } from '../src/approval/inMemoryContentApprovalRepository.ts'
import type {
  ContentApprovalRepository,
  ContentApprovalValidator,
  PublicationDraftSelection,
} from '../src/domain/index.ts'
import { createContentApprovalEndpoint } from '../src/endpoints/createContentApproval.ts'
import { createPrepareContentApprovalEndpoint } from '../src/endpoints/prepareContentApproval.ts'

const CONTENT_REVISION = `sha256:${'a'.repeat(64)}`
const SOURCE_REVISION = `sha256:${'b'.repeat(64)}`
const RIGHTS_REVISION = `sha256:${'d'.repeat(64)}`
const POLICY_VERSION = 'rights-policy-2026-09'

class FixedValidator implements ContentApprovalValidator {
  calls: PublicationDraftSelection[] = []

  async validate(input: PublicationDraftSelection) {
    this.calls.push(input)
    return {
      contentRevision: CONTENT_REVISION,
      files: [{ content: '---\ntitle: One\n---\n', path: 'content/prompts/prm_one/en.md' }],
      rightsRevision: RIGHTS_REVISION,
      sourceRevision: SOURCE_REVISION,
    }
  }
}

class CountingRepository extends InMemoryContentApprovalRepository {
  creates = 0

  override async createApproved(input: Parameters<ContentApprovalRepository['createApproved']>[0]) {
    this.creates += 1
    return super.createApproved(input)
  }
}

interface RequestOptions {
  readonly body?: unknown
  readonly idempotencyKey?: string
  readonly payload?: unknown
  readonly user?: unknown
}

function transactionalPayload(): unknown {
  return {
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
  }
}

function payloadRequest(options: RequestOptions): never {
  const headers = new Headers()
  if (options.idempotencyKey) headers.set('Idempotency-Key', options.idempotencyKey)
  return {
    headers,
    json: async () => options.body,
    payload: options.payload ?? transactionalPayload(),
    routeParams: { artifactId: 'prm_one' },
    user: options.user,
  } as never
}

async function responseJson(response: unknown): Promise<Record<string, unknown>> {
  assert.ok(response instanceof Response)
  return await response.json() as Record<string, unknown>
}

test('prepare is reviewer/admin-only, has no Git base, and performs no audit write', async () => {
  const repository = new CountingRepository()
  const validator = new FixedValidator()
  const endpoint = createPrepareContentApprovalEndpoint({
    createRepository: () => repository,
    createValidator: () => validator,
    rightsPolicyVersion: POLICY_VERSION,
  })

  const forbidden = await endpoint.handler(payloadRequest({
    body: { locale: 'en' },
    user: { id: 'editor-1', roles: ['editor'] },
  }))
  assert.ok(forbidden instanceof Response)
  assert.equal(forbidden.status, 403)

  const response = await endpoint.handler(payloadRequest({
    body: { locale: 'en' },
    user: { id: 'reviewer-1', roles: ['reviewer'] },
  }))
  assert.ok(response instanceof Response)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  const json = await responseJson(response)
  const data = json.data as Record<string, unknown>
  assert.equal(data.artifactId, 'prm_one')
  assert.equal(data.locale, 'en')
  assert.equal(data.expectedContentRevision, CONTENT_REVISION)
  assert.equal(data.expectedDecisionSequence, 0)
  assert.equal(data.expectedSourceRevision, SOURCE_REVISION)
  assert.equal(data.expectedRightsPolicyVersion, POLICY_VERSION)
  assert.equal(data.expectedRightsRevision, RIGHTS_REVISION)
  assert.equal('expectedBaseSha' in data, false)
  assert.equal(repository.creates, 0)
  assert.deepEqual(validator.calls, [{ artifactId: 'prm_one', locales: ['en'] }])
})

test('approval endpoint appends an audit for a matching saved revision', async () => {
  const repository = new CountingRepository()
  const validator = new FixedValidator()
  const endpoint = createContentApprovalEndpoint({
    clock: { now: () => new Date('2026-09-03T10:00:00.000Z') },
    createRepository: () => repository,
    createValidator: () => validator,
    rightsPolicyVersion: POLICY_VERSION,
  })
  const requestOptions = {
    body: {
      expectedContentRevision: CONTENT_REVISION,
      expectedDecisionSequence: 0,
      expectedRightsPolicyVersion: POLICY_VERSION,
      expectedRightsRevision: RIGHTS_REVISION,
      expectedSourceRevision: SOURCE_REVISION,
      locale: 'en',
    },
    idempotencyKey: 'approval:prm_one:en:1',
    user: { id: 'reviewer-1', roles: ['reviewer'] },
  }
  const response = await endpoint.handler(payloadRequest(requestOptions))

  assert.ok(response instanceof Response)
  assert.equal(response.status, 201)
  const json = await responseJson(response)
  const data = json.data as Record<string, unknown>
  assert.equal(data.decision, 'approved')
  assert.equal(data.approvedBy, 'reviewer-1')
  assert.equal(data.approvedAt, '2026-09-03T10:00:00.000Z')
  assert.equal(data.rightsRevision, RIGHTS_REVISION)
  assert.ok(Number.isSafeInteger(data.decisionSequence))
  assert.equal(repository.creates, 1)

  const replay = await endpoint.handler(payloadRequest({
    ...requestOptions,
    body: {
      ...requestOptions.body,
      expectedDecisionSequence: Number(data.decisionSequence),
    },
  }))
  assert.ok(replay instanceof Response)
  assert.equal(replay.status, 201)
  const replayData = (await responseJson(replay)).data as Record<string, unknown>
  assert.equal(replayData.id, data.id)
  assert.equal(repository.creates, 1)
  assert.equal(validator.calls.length, 1)
})

test('approval endpoint fails closed when the adapter cannot provide an atomic transaction', async () => {
  const repository = new CountingRepository()
  const endpoint = createContentApprovalEndpoint({
    createRepository: () => repository,
    createValidator: () => new FixedValidator(),
    rightsPolicyVersion: POLICY_VERSION,
  })
  const response = await endpoint.handler(payloadRequest({
    body: {
      expectedContentRevision: CONTENT_REVISION,
      expectedDecisionSequence: 0,
      expectedRightsPolicyVersion: POLICY_VERSION,
      expectedRightsRevision: RIGHTS_REVISION,
      expectedSourceRevision: SOURCE_REVISION,
      locale: 'en',
    },
    idempotencyKey: 'approval:prm_one:en:no-transaction',
    payload: {},
    user: { id: 'reviewer-1', roles: ['reviewer'] },
  }))

  assert.ok(response instanceof Response)
  assert.equal(response.status, 503)
  assert.equal((await responseJson(response)).code, 'PUBLICATION_DECISION_CONSISTENCY_UNAVAILABLE')
  assert.equal(repository.creates, 0)
})

test('approval endpoint returns 409 on revision drift and does not append', async () => {
  const repository = new CountingRepository()
  const endpoint = createContentApprovalEndpoint({
    createRepository: () => repository,
    createValidator: () => new FixedValidator(),
    rightsPolicyVersion: POLICY_VERSION,
  })
  const response = await endpoint.handler(payloadRequest({
    body: {
      expectedContentRevision: `sha256:${'f'.repeat(64)}`,
      expectedDecisionSequence: 0,
      expectedRightsPolicyVersion: POLICY_VERSION,
      expectedRightsRevision: RIGHTS_REVISION,
      expectedSourceRevision: SOURCE_REVISION,
      locale: 'en',
    },
    idempotencyKey: 'approval:prm_one:en:stale',
    user: { id: 'admin-1', roles: ['admin'] },
  }))

  assert.ok(response instanceof Response)
  assert.equal(response.status, 409)
  assert.equal((await responseJson(response)).code, 'CONTENT_APPROVAL_REVISION_CONFLICT')
  assert.equal(repository.creates, 0)
})
