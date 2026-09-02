import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PublicationBaseRevisionConflictError,
  PublicationContentRevisionConflictError,
  PublicationIdempotencyConflictError,
  PublicationRequestInputError,
  type NormalizedPublicationRequestInput,
  type PublicationContentValidationResult,
  type PublicationContentValidator,
  type GitPublisher,
  type GitPublisherReceipt,
} from '../src/domain/index.ts'
import { InMemoryPublicationRequestRepository } from '../src/publication/inMemoryPublicationRequestRepository.ts'
import { MockGitPublisher } from '../src/publication/mockGitPublisher.ts'
import {
  normalizePublicationRequest,
  PublicationRequestService,
} from '../src/publication/publicationRequestService.ts'

const BASE_SHA = '0000000000000000000000000000000000000000'
const CONTENT_REVISION = `sha256:${'2'.repeat(64)}`
const SOURCE_REVISION = `sha256:${'1'.repeat(64)}`

const request = {
  artifactId: 'prm_01jabcdef',
  commitMessage: 'content: submit country stamp prompt',
  expectedBaseSha: BASE_SHA,
  expectedContentRevision: CONTENT_REVISION,
  expectedSourceRevision: SOURCE_REVISION,
  idempotencyKey: 'request:country-stamp:1',
  locales: ['zh-CN', 'en', 'en'],
} as const

class CountingPublisher implements GitPublisher {
  calls = 0
  private readonly delegate: GitPublisher

  constructor(delegate: GitPublisher) {
    this.delegate = delegate
  }

  async requestPublication(
    input: Parameters<GitPublisher['requestPublication']>[0],
  ): Promise<GitPublisherReceipt> {
    this.calls += 1
    return this.delegate.requestPublication(input)
  }
}

class FixedContentValidator implements PublicationContentValidator {
  calls = 0
  private readonly result: PublicationContentValidationResult

  constructor(result: PublicationContentValidationResult = {
    contentRevision: CONTENT_REVISION,
    sourceRevision: SOURCE_REVISION,
  }) {
    this.result = result
  }

  async validate(_input: NormalizedPublicationRequestInput): Promise<PublicationContentValidationResult> {
    this.calls += 1
    return this.result
  }
}

test('missing expected content revision fails with a typed input error', () => {
  const incomplete = { ...request } as Record<string, unknown>
  delete incomplete.expectedContentRevision
  assert.throws(
    () => normalizePublicationRequest(incomplete as unknown as typeof request),
    PublicationRequestInputError,
  )
})

test('safe mock accepts a request without creating a commit, PR or release', async () => {
  const repository = new InMemoryPublicationRequestRepository()
  const publisher = new CountingPublisher(new MockGitPublisher({ expectedBaseSha: BASE_SHA }))
  const validator = new FixedContentValidator()
  const service = new PublicationRequestService(repository, publisher, validator)

  const first = await service.create(request, 'user_1')
  assert.equal(first.status, 'mock_accepted')
  assert.equal(first.provider, 'mock')
  assert.match(first.plannedBranch ?? '', /^content\/prm_01jabcdef-pubreq_0001$/u)
  assert.equal(first.branch, null)
  assert.equal(first.commitSha, null)
  assert.equal(first.pullRequestNumber, null)
  assert.equal(first.pullRequestUrl, null)
  assert.equal(first.validatedContentRevision, CONTENT_REVISION)
  assert.equal(first.validatedSourceRevision, SOURCE_REVISION)
  assert.deepEqual(first.locales, ['en', 'zh-CN'])

  const repeated = await service.create(request, 'user_1')
  assert.equal(repeated.id, first.id)
  assert.equal(publisher.calls, 1)
  assert.equal(validator.calls, 1)
})

test('an idempotency key cannot be reused for different content', async () => {
  const repository = new InMemoryPublicationRequestRepository()
  const service = new PublicationRequestService(
    repository,
    new MockGitPublisher({ expectedBaseSha: BASE_SHA }),
    new FixedContentValidator(),
  )
  await service.create(request, 'user_1')

  await assert.rejects(
    service.create({ ...request, commitMessage: 'content: a different change' }, 'user_1'),
    PublicationIdempotencyConflictError,
  )
})

test('expected base SHA mismatch is persisted as conflicted and never accepted', async () => {
  const repository = new InMemoryPublicationRequestRepository()
  const service = new PublicationRequestService(
    repository,
    new MockGitPublisher({ expectedBaseSha: BASE_SHA }),
    new FixedContentValidator(),
  )
  const conflicting = {
    ...request,
    expectedBaseSha: '1111111111111111111111111111111111111111',
    idempotencyKey: 'request:country-stamp:conflict',
  }

  await assert.rejects(service.create(conflicting, 'user_1'), PublicationBaseRevisionConflictError)
  const persisted = await repository.findByIdempotencyKey(conflicting.idempotencyKey)
  assert.equal(persisted?.status, 'conflicted')
  assert.equal(persisted?.commitSha, null)
  assert.equal(persisted?.pullRequestUrl, null)
})

test('stale expected content revision is persisted as conflicted before Git', async () => {
  const repository = new InMemoryPublicationRequestRepository()
  const publisher = new CountingPublisher(new MockGitPublisher({ expectedBaseSha: BASE_SHA }))
  const service = new PublicationRequestService(
    repository,
    publisher,
    new FixedContentValidator({
      contentRevision: `sha256:${'3'.repeat(64)}`,
      sourceRevision: SOURCE_REVISION,
    }),
  )
  const stale = { ...request, idempotencyKey: 'request:country-stamp:stale' }

  await assert.rejects(service.create(stale, 'user_1'), PublicationContentRevisionConflictError)
  const persisted = await repository.findByIdempotencyKey(stale.idempotencyKey)
  assert.equal(persisted?.status, 'conflicted')
  assert.equal(persisted?.errorCode, 'CONTENT_REVISION_CONFLICT')
  assert.equal(publisher.calls, 0)
})

test('stale expected source revision is persisted as conflicted before Git', async () => {
  const repository = new InMemoryPublicationRequestRepository()
  const publisher = new CountingPublisher(new MockGitPublisher({ expectedBaseSha: BASE_SHA }))
  const service = new PublicationRequestService(
    repository,
    publisher,
    new FixedContentValidator({
      contentRevision: CONTENT_REVISION,
      sourceRevision: `sha256:${'4'.repeat(64)}`,
    }),
  )
  const stale = { ...request, idempotencyKey: 'request:country-stamp:stale-source' }

  await assert.rejects(service.create(stale, 'user_1'), PublicationContentRevisionConflictError)
  const persisted = await repository.findByIdempotencyKey(stale.idempotencyKey)
  assert.equal(persisted?.status, 'conflicted')
  assert.equal(persisted?.errorCode, 'CONTENT_REVISION_CONFLICT')
  assert.equal(publisher.calls, 0)
})
