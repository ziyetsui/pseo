import assert from 'node:assert/strict'
import test from 'node:test'

import { canEditDrafts, canReadEditorial, canReview } from '../src/access/policy.ts'
import { createPromptProposalEndpoint } from '../src/endpoints/createPromptProposal.ts'

type RecordValue = Record<string, unknown>

class InMemoryPayload {
  readonly docs = new Map<string, RecordValue[]>()
  private nextId = 1

  readonly db = {
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
    beginTransaction: async () => 'tx-1',
    commitTransaction: async () => undefined,
    rollbackTransaction: async () => undefined,
  }

  async create(args: RecordValue): Promise<RecordValue> {
    const collection = String(args.collection)
    const data = args.data as RecordValue
    const document = { id: this.nextId++, ...structuredClone(data) }
    const documents = this.docs.get(collection) ?? []
    documents.push(document)
    this.docs.set(collection, documents)
    return document
  }

  async update(args: RecordValue): Promise<RecordValue> {
    const collection = String(args.collection)
    const documents = this.docs.get(collection) ?? []
    const document = documents.find((candidate) => String(candidate.id) === String(args.id))
    if (document === undefined) throw new Error('not found')
    Object.assign(document, structuredClone(args.data as RecordValue))
    return document
  }

  async find(args: RecordValue): Promise<{ docs: RecordValue[] }> {
    const collection = String(args.collection)
    const documents = this.docs.get(collection) ?? []
    const where = args.where as RecordValue | undefined
    if (where === undefined) return { docs: [...documents] }
    const [field, constraint] = Object.entries(where)[0] ?? []
    const expected = typeof constraint === 'object' && constraint !== null
      ? (constraint as RecordValue).equals
      : undefined
    return {
      docs: documents.filter((document) => field !== undefined && document[field] === expected),
    }
  }
}

function proposal(overrides: RecordValue = {}): RecordValue {
  return {
    schemaVersion: 1,
    operation: 'create_prompt',
    expectedState: 'absent',
    prompt: {
      artifactKey: 'prm_01testprompt',
      contentType: 'text',
      sourceLocale: 'zh-CN',
      text: '把以下目标拆成可以验收的执行步骤：[GOAL]',
    },
    locale: {
      locale: 'zh-CN',
      slug: 'test-action-plan',
      title: '测试行动计划 Prompt',
      summary: '用于验证 Codex 到 CMS 的草稿提案链路。',
    },
    source: {
      platform: 'x',
      url: 'https://x.com/example/status/1234567890',
      id: '1234567890',
      creatorHandle: 'example',
      publishedDate: '2026-09-03',
      observedAt: '2026-09-03T12:00:00.000Z',
    },
    ...overrides,
  }
}

function request(payload: unknown, body: unknown, options: {
  readonly idempotencyKey?: string
  readonly user?: unknown
} = {}): never {
  const headers = new Headers()
  if (options.idempotencyKey) headers.set('Idempotency-Key', options.idempotencyKey)
  return {
    headers,
    json: async () => body,
    payload,
    user: options.user,
  } as never
}

async function responseJson(response: unknown): Promise<RecordValue> {
  assert.ok(response instanceof Response)
  return await response.json() as RecordValue
}

test('authenticated agent proposer creates only draft, noindex, review-required Prompt records and an immutable audit', async () => {
  const payload = new InMemoryPayload()
  const endpoint = createPromptProposalEndpoint()
  const response = await endpoint.handler(request(payload, proposal(), {
    idempotencyKey: 'proposal:prm_01testprompt:zh-CN:1',
    user: { id: 'agent-1', roles: ['agent_proposer'] },
  }))

  assert.ok(response instanceof Response)
  assert.equal(response.status, 201)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  const result = (await responseJson(response)).data as RecordValue
  assert.equal(result.state, 'draft')
  assert.equal(result.rightsStatus, 'review_required')
  assert.equal(result.replayed, false)

  const [artifact] = payload.docs.get('prompt-artifacts') ?? []
  const [variant] = payload.docs.get('locale-variants') ?? []
  const [source] = payload.docs.get('source-evidence') ?? []
  const [audit] = payload.docs.get('agent-proposal-audits') ?? []
  assert.equal(artifact?._status, 'draft')
  assert.equal(artifact?.draftWorkflowState, 'draft')
  assert.deepEqual(artifact?.sourceEvidence, [source?.id])
  assert.equal(variant?._status, 'draft')
  assert.equal(variant?.indexable, false)
  assert.deepEqual(variant?.seo, { title: null, description: null, robots: 'noindex,nofollow' })
  assert.equal(source?._status, 'draft')
  assert.equal(source?.rightsStatus, 'review_required')
  assert.equal(audit?.actor, 'agent-1')
  assert.equal(audit?.result, 'draft_applied')
  assert.equal('promptText' in (audit ?? {}), false)
})

test('same Idempotency-Key and proposal replay the immutable audit without duplicate drafts', async () => {
  const payload = new InMemoryPayload()
  const endpoint = createPromptProposalEndpoint()
  const options = {
    idempotencyKey: 'proposal:prm_01testprompt:zh-CN:replay',
    user: { id: 'agent-1', roles: ['agent_proposer'] },
  }
  const first = await endpoint.handler(request(payload, proposal(), options))
  const second = await endpoint.handler(request(payload, proposal(), options))

  assert.ok(first instanceof Response)
  assert.ok(second instanceof Response)
  assert.equal(first.status, 201)
  assert.equal(second.status, 200)
  assert.equal(((await responseJson(second)).data as RecordValue).replayed, true)
  assert.equal(payload.docs.get('prompt-artifacts')?.length, 1)
  assert.equal(payload.docs.get('agent-proposal-audits')?.length, 1)
})

test('proposal preserves numeric PostgreSQL actor relationship ids', async () => {
  const payload = new InMemoryPayload()
  const create = payload.create.bind(payload)
  payload.create = async (args) => {
    if (args.collection === 'agent-proposal-audits') {
      assert.equal(typeof (args.data as RecordValue).actor, 'number')
    }
    return create(args)
  }
  const response = await createPromptProposalEndpoint().handler(request(payload, proposal(), {
    idempotencyKey: 'proposal:numeric-actor:00000001',
    user: { id: 17, roles: ['agent_proposer'] },
  }))
  assert.ok(response instanceof Response)
  assert.equal(response.status, 201)
  assert.equal(payload.docs.get('agent-proposal-audits')?.[0]?.actor, 17)
})

test('conflicting replay and an existing target fail closed', async () => {
  const payload = new InMemoryPayload()
  const endpoint = createPromptProposalEndpoint()
  const options = {
    idempotencyKey: 'proposal:prm_01testprompt:zh-CN:conflict',
    user: { id: 'editor-1', roles: ['editor'] },
  }
  await endpoint.handler(request(payload, proposal(), options))

  const changed = proposal({
    locale: {
      locale: 'zh-CN',
      slug: 'changed-slug',
      title: '被修改的标题',
      summary: null,
    },
  })
  const replay = await endpoint.handler(request(payload, changed, options))
  assert.ok(replay instanceof Response)
  assert.equal(replay.status, 409)
  assert.equal((await responseJson(replay)).code, 'PROMPT_PROPOSAL_CONFLICT')

  const differentKey = await endpoint.handler(request(payload, proposal(), {
    idempotencyKey: 'proposal:prm_01testprompt:zh-CN:different',
    user: options.user,
  }))
  assert.ok(differentKey instanceof Response)
  assert.equal(differentKey.status, 409)
})

test('proposal rejects publication fields, unsafe sources, secret-like text and insufficient roles before writes', async () => {
  const cases: Array<{ body: RecordValue; user: unknown; status: number }> = [
    {
      body: { ...proposal(), rightsStatus: 'cleared' },
      user: { id: 'editor-1', roles: ['editor'] },
      status: 422,
    },
    {
      body: proposal({
        source: {
          platform: 'x',
          url: 'https://example.com/status/1234567890',
          id: '1234567890',
          observedAt: '2026-09-03T12:00:00.000Z',
        },
      }),
      user: { id: 'editor-1', roles: ['editor'] },
      status: 422,
    },
    {
      body: proposal({
        prompt: {
          artifactKey: 'prm_01testprompt',
          contentType: 'text',
          sourceLocale: 'zh-CN',
          text: '-----BEGIN PRIVATE KEY-----',
        },
      }),
      user: { id: 'editor-1', roles: ['editor'] },
      status: 422,
    },
    {
      body: proposal(),
      user: { id: 'publisher-1', roles: ['publisher'] },
      status: 403,
    },
  ]

  for (const [index, item] of cases.entries()) {
    const payload = new InMemoryPayload()
    const response = await createPromptProposalEndpoint().handler(request(payload, item.body, {
      idempotencyKey: `proposal:rejected:${index}:000000000000`,
      user: item.user,
    }))
    assert.ok(response instanceof Response)
    assert.equal(response.status, item.status)
    assert.equal(payload.docs.size, 0)
  }
})

test('proposal requires authentication, idempotency and an atomic PostgreSQL transaction', async () => {
  const endpoint = createPromptProposalEndpoint()
  const unauthenticated = await endpoint.handler(request(new InMemoryPayload(), proposal(), {
    idempotencyKey: 'proposal:unauthenticated:000000',
  }))
  assert.ok(unauthenticated instanceof Response)
  assert.equal(unauthenticated.status, 401)

  const missingKey = await endpoint.handler(request(new InMemoryPayload(), proposal(), {
    user: { id: 'editor-1', roles: ['editor'] },
  }))
  assert.ok(missingKey instanceof Response)
  assert.equal(missingKey.status, 422)

  const noTransaction = {
    create: async () => { throw new Error('not used') },
    find: async () => ({ docs: [] }),
    update: async () => { throw new Error('not used') },
    db: { name: 'd1' },
  }
  const unavailable = await endpoint.handler(request(noTransaction, proposal(), {
    idempotencyKey: 'proposal:no-transaction:000000',
    user: { id: 'editor-1', roles: ['editor'] },
  }))
  assert.ok(unavailable instanceof Response)
  assert.equal(unavailable.status, 503)
  assert.equal((await responseJson(unavailable)).code, 'PUBLICATION_DECISION_CONSISTENCY_UNAVAILABLE')
})

test('agent_proposer API identity cannot use ordinary draft or review collection access', async () => {
  const args = { req: { user: { id: 'agent-1', roles: ['agent_proposer'] } } } as never
  assert.equal(await canEditDrafts(args), false)
  assert.equal(await canReadEditorial(args), false)
  assert.equal(await canReview(args), false)
})
