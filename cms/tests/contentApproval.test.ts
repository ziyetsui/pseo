import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'

import {
  ContentApprovalIdempotencyConflictError,
  ContentApprovalRevisionConflictError,
  type ContentApprovalClock,
  type ContentApprovalInput,
  type ContentApprovalValidationResult,
  type ContentApprovalValidator,
  type PublicationDraftSelection,
} from '../src/domain/index.ts'
import { ContentApprovalService } from '../src/approval/contentApprovalService.ts'
import { InMemoryContentApprovalRepository } from '../src/approval/inMemoryContentApprovalRepository.ts'

const CONTENT_REVISION = `sha256:${'a'.repeat(64)}`
const SOURCE_REVISION = `sha256:${'b'.repeat(64)}`
const RIGHTS_REVISION = `sha256:${'d'.repeat(64)}`
const POLICY_VERSION = 'rights-policy-2026-09'

class FixedValidator implements ContentApprovalValidator {
  calls: PublicationDraftSelection[] = []
  private readonly result: ContentApprovalValidationResult

  constructor(result?: ContentApprovalValidationResult) {
    this.result = result ?? {
      contentRevision: CONTENT_REVISION,
      files: [
        { content: '{"axis":"model"}\n', path: 'content/taxonomies/model/model-one/en.json' },
        { content: '---\ntitle: One\n---\n', path: 'content/prompts/prm_one/en.md' },
      ],
      rightsRevision: RIGHTS_REVISION,
      sourceRevision: SOURCE_REVISION,
    }
  }

  async validate(input: PublicationDraftSelection): Promise<ContentApprovalValidationResult> {
    this.calls.push(input)
    return this.result
  }
}

const clock: ContentApprovalClock = {
  now: () => new Date('2026-09-03T10:00:00.000Z'),
}

function request(overrides: Partial<ContentApprovalInput> = {}): ContentApprovalInput {
  return {
    artifactId: 'prm_one',
    expectedContentRevision: CONTENT_REVISION,
    expectedDecisionSequence: 0,
    expectedRightsPolicyVersion: POLICY_VERSION,
    expectedRightsRevision: RIGHTS_REVISION,
    expectedSourceRevision: SOURCE_REVISION,
    idempotencyKey: 'approval:prm_one:en:1',
    locale: 'en',
    ...overrides,
  }
}

test('prepare validates one locale and returns deterministic revision metadata without content', async () => {
  const validator = new FixedValidator()
  const service = new ContentApprovalService(
    new InMemoryContentApprovalRepository(),
    validator,
    { rightsPolicyVersion: POLICY_VERSION },
  )

  const prepared = await service.prepare('prm_one', 'en')

  assert.deepEqual(validator.calls, [{ artifactId: 'prm_one', locales: ['en'] }])
  assert.equal(prepared.expectedContentRevision, CONTENT_REVISION)
  assert.equal(prepared.expectedDecisionSequence, 0)
  assert.equal(prepared.expectedSourceRevision, SOURCE_REVISION)
  assert.equal(prepared.expectedRightsPolicyVersion, POLICY_VERSION)
  assert.equal(prepared.expectedRightsRevision, RIGHTS_REVISION)
  assert.equal(prepared.fileCount, 2)
  assert.deepEqual(prepared.files, [
    {
      byteLength: Buffer.byteLength('---\ntitle: One\n---\n'),
      path: 'content/prompts/prm_one/en.md',
      sha256: createHash('sha256').update('---\ntitle: One\n---\n').digest('hex'),
    },
    {
      byteLength: Buffer.byteLength('{"axis":"model"}\n'),
      path: 'content/taxonomies/model/model-one/en.json',
      sha256: createHash('sha256').update('{"axis":"model"}\n').digest('hex'),
    },
  ])
  assert.equal(JSON.stringify(prepared).includes('title: One'), false)
  assert.equal('expectedBaseSha' in prepared, false)
})

test('approve appends one revision-bound audit and exact retry is idempotent', async () => {
  const repository = new InMemoryContentApprovalRepository()
  const validator = new FixedValidator()
  const service = new ContentApprovalService(repository, validator, { clock, rightsPolicyVersion: POLICY_VERSION })

  const first = await service.approve(request(), 'reviewer-1')
  const repeated = await service.approve(request({
    expectedDecisionSequence: first.decisionSequence,
  }), 'reviewer-1')

  assert.equal(first.id, repeated.id)
  assert.equal(first.approvedAt, '2026-09-03T10:00:00.000Z')
  assert.equal(first.approvedBy, 'reviewer-1')
  assert.equal(first.artifactId, 'prm_one')
  assert.equal(first.locale, 'en')
  assert.equal(first.contentRevision, CONTENT_REVISION)
  assert.equal(first.sourceRevision, SOURCE_REVISION)
  assert.equal(first.rightsPolicyVersion, POLICY_VERSION)
  assert.equal(first.rightsRevision, RIGHTS_REVISION)
  assert.ok(Number.isSafeInteger(first.decisionSequence))
  assert.ok(first.decisionSequence > 0)
  assert.match(first.decisionFingerprint, /^sha256:[a-f0-9]{64}$/u)
  assert.equal(validator.calls.length, 1)
})

test('an idempotency key reused for another decision fingerprint conflicts before validation', async () => {
  const validator = new FixedValidator()
  const service = new ContentApprovalService(
    new InMemoryContentApprovalRepository(),
    validator,
    { clock, rightsPolicyVersion: POLICY_VERSION },
  )
  await service.approve(request(), 'reviewer-1')

  await assert.rejects(
    service.approve(request({ artifactId: 'prm_two' }), 'reviewer-1'),
    ContentApprovalIdempotencyConflictError,
  )
  assert.equal(validator.calls.length, 1)
})

test('rights or policy drift returns a conflict without an audit append', async () => {
  const repository = new InMemoryContentApprovalRepository()
  const validator = new FixedValidator({
    contentRevision: CONTENT_REVISION,
    files: [{ content: 'one', path: 'content/prompts/prm_one/en.md' }],
    rightsRevision: `sha256:${'c'.repeat(64)}`,
    sourceRevision: SOURCE_REVISION,
  })
  const service = new ContentApprovalService(repository, validator, { clock, rightsPolicyVersion: POLICY_VERSION })

  await assert.rejects(service.approve(request(), 'reviewer-1'), ContentApprovalRevisionConflictError)
  assert.equal(await repository.findByIdempotencyKey(request().idempotencyKey), null)

  await assert.rejects(
    service.approve(request({
      expectedRightsPolicyVersion: 'rights-policy-older',
      idempotencyKey: 'approval:prm_one:en:2',
    }), 'reviewer-1'),
    ContentApprovalRevisionConflictError,
  )
  assert.equal(validator.calls.length, 1)
})

test('approval fails closed when the validator omits the independent rights revision', async () => {
  const validator = {
    async validate() {
      return {
        contentRevision: CONTENT_REVISION,
        files: [{ content: 'one', path: 'content/prompts/prm_one/en.md' }],
        sourceRevision: SOURCE_REVISION,
      }
    },
  } as unknown as ContentApprovalValidator
  const service = new ContentApprovalService(
    new InMemoryContentApprovalRepository(),
    validator,
    { rightsPolicyVersion: POLICY_VERSION },
  )

  await assert.rejects(service.prepare('prm_one', 'en'), (error: unknown) => {
    assert.equal((error as { code?: unknown }).code, 'CONTENT_CONTRACT_INVALID')
    assert.equal((error as { issues?: Array<{ code?: unknown }> }).issues?.[0]?.code, 'RIGHTS_REVISION_MISSING')
    return true
  })
})
