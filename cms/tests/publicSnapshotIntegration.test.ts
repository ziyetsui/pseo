import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { ContentApprovalService } from '../src/approval/contentApprovalService.ts'
import { InMemoryContentApprovalRepository } from '../src/approval/inMemoryContentApprovalRepository.ts'
import type { ContentApprovalRecord, ContentApprovalValidator } from '../src/domain/index.ts'
import { PayloadDraftContentValidator } from '../src/publication/payloadDraftContentValidator.ts'
import { buildFirstPromptSeedFixture } from '../src/seed/firstPrompt.ts'
import {
  PayloadPublicSnapshotSource,
  PublicSnapshotService,
  type PublicSnapshotPayloadApi,
} from '../src/snapshot/index.ts'

const CONSUMER_MODULE = '../../prompt-lab/scripts/sync-cms-snapshot.mjs'

type Document = Record<string, unknown>

class IntegratedPayload implements PublicSnapshotPayloadApi {
  readonly artifact: Document
  readonly variants: Document[]
  readonly sourceEvidence: Document[]
  approvalDocuments: Document[] = []
  withdrawalDocuments: Document[] = []
  readonly transactionOptions: unknown[] = []
  readonly rolledBack: Array<string | number> = []

  readonly db = {
    beginTransaction: async (options?: unknown) => {
      this.transactionOptions.push(options)
      return 'tx-integration'
    },
    rollbackTransaction: async (id: string | number) => {
      this.rolledBack.push(id)
    },
  }

  constructor() {
    const fixture = buildFirstPromptSeedFixture({
      reviewedAt: '2026-09-03T09:00:00.000Z',
      sourceUrl: 'https://github.com/ziyetsui/prompt-lab/issues/1',
    })
    const taxonomies: Document[] = fixture.taxonomies.map((item, index) => ({
      ...item.data,
      id: `taxonomy-${index + 1}`,
    }))
    const relationships = (axis: string) => taxonomies.filter((item) => item.axis === axis)
    this.artifact = {
      ...fixture.artifact.data,
      id: 'artifact-document-1',
      models: relationships('model'),
      useCases: relationships('use_case'),
      techniques: relationships('technique'),
      styles: relationships('style'),
      subjects: relationships('subject'),
    }
    this.variants = [{
      ...fixture.localeVariant.data,
      id: 'locale-document-1',
      updatedAt: '2026-09-03T09:00:00.000Z',
    }]
    this.sourceEvidence = fixture.sourceEvidence.map((item, index) => ({
      ...item.data,
      id: `source-document-${index + 1}`,
    }))
  }

  async find(args: Record<string, unknown>) {
    const collection = args.collection
    const docs = collection === 'prompt-artifacts'
      ? [this.artifact]
      : collection === 'locale-variants'
        ? this.variants
        : collection === 'source-evidence'
          ? this.sourceEvidence
          : collection === 'content-approvals'
            ? this.approvalDocuments
            : collection === 'content-withdrawals'
              ? this.withdrawalDocuments
              : []
    return { docs, hasNextPage: false, nextPage: null }
  }
}

function approvalDocument(record: ContentApprovalRecord): Document {
  return {
    ...record,
    artifact: 'artifact-document-1',
    artifactKey: record.artifactId,
  }
}

test('real draft validator approval audit Payload source and snapshot satisfy the mirror contract', async (t) => {
  const payload = new IntegratedPayload()
  const validator = new PayloadDraftContentValidator(payload)
  const repository = new InMemoryContentApprovalRepository()
  const service = new ContentApprovalService(repository, validator as unknown as ContentApprovalValidator, {
    clock: { now: () => new Date('2026-09-03T10:00:00.000Z') },
  })
  const artifactId = String(payload.artifact.artifactKey)
  const prepared = await service.prepare(artifactId, 'zh-CN')
  const approval = await service.approve({
    artifactId,
    expectedContentRevision: prepared.expectedContentRevision,
    expectedDecisionSequence: prepared.expectedDecisionSequence,
    expectedRightsPolicyVersion: prepared.expectedRightsPolicyVersion,
    expectedRightsRevision: prepared.expectedRightsRevision,
    expectedSourceRevision: prepared.expectedSourceRevision,
    idempotencyKey: 'approval:integration:zh-CN:1',
    locale: 'zh-CN',
  }, 'reviewer-1')
  payload.approvalDocuments = [approvalDocument(approval)]

  const snapshot = await new PublicSnapshotService(
    new PayloadPublicSnapshotSource(payload, 'postgres'),
  ).build()
  assert.equal(snapshot.manifest.counts.prompts, 1)
  assert.equal(snapshot.manifest.counts.taxonomies, 2)
  assert.deepEqual(payload.transactionOptions, [{
    accessMode: 'read only',
    isolationLevel: 'repeatable read',
  }])
  assert.deepEqual(payload.rolledBack, ['tx-integration'])

  const consumer = await import(CONSUMER_MODULE) as {
    syncValidatedSnapshot(args: { root: string; snapshot: unknown }): Promise<unknown>
    validateSnapshotEnvelope(value: unknown): unknown
    verifyMirrorDirectory(args: { root: string }): Promise<unknown>
  }
  const validated = consumer.validateSnapshotEnvelope(snapshot)
  const root = await mkdtemp(path.join(tmpdir(), 'promptlab-integration-'))
  t.after(async () => rm(root, { force: true, recursive: true }))
  await consumer.syncValidatedSnapshot({ root, snapshot: validated })
  await consumer.verifyMirrorDirectory({ root })
})

test('current draft drift aborts and leaves the last-known-good mirror untouched', async (t) => {
  const payload = new IntegratedPayload()
  const validator = new PayloadDraftContentValidator(payload)
  const repository = new InMemoryContentApprovalRepository()
  const service = new ContentApprovalService(repository, validator as unknown as ContentApprovalValidator, {
    clock: { now: () => new Date('2026-09-03T10:00:00.000Z') },
  })
  const artifactId = String(payload.artifact.artifactKey)
  const prepared = await service.prepare(artifactId, 'zh-CN')
  const approval = await service.approve({
    artifactId,
    expectedContentRevision: prepared.expectedContentRevision,
    expectedDecisionSequence: prepared.expectedDecisionSequence,
    expectedRightsPolicyVersion: prepared.expectedRightsPolicyVersion,
    expectedRightsRevision: prepared.expectedRightsRevision,
    expectedSourceRevision: prepared.expectedSourceRevision,
    idempotencyKey: 'approval:integration:drift:1',
    locale: 'zh-CN',
  }, 'reviewer-1')
  payload.approvalDocuments = [approvalDocument(approval)]
  const serviceUnderTest = new PublicSnapshotService(
    new PayloadPublicSnapshotSource(payload, 'postgres'),
  )
  const goodSnapshot = await serviceUnderTest.build()
  const consumer = await import(CONSUMER_MODULE) as {
    syncValidatedSnapshot(args: { root: string; snapshot: unknown }): Promise<unknown>
    validateSnapshotEnvelope(value: unknown): unknown
    verifyMirrorDirectory(args: { root: string }): Promise<unknown>
  }
  const root = await mkdtemp(path.join(tmpdir(), 'promptlab-lkg-'))
  t.after(async () => rm(root, { force: true, recursive: true }))
  await consumer.syncValidatedSnapshot({
    root,
    snapshot: consumer.validateSnapshotEnvelope(goodSnapshot),
  })
  const manifestBefore = await readFile(path.join(root, 'mirror-manifest.json'), 'utf8')
  payload.variants[0] = { ...payload.variants[0], title: '未经重新审核的标题变更' }

  await assert.rejects(
    serviceUnderTest.build(),
    (error: unknown) => (
      typeof error === 'object' && error !== null &&
      'code' in error && error.code === 'APPROVED_REVISION_UNAVAILABLE'
    ),
  )
  await consumer.verifyMirrorDirectory({ root })
  assert.equal(await readFile(path.join(root, 'mirror-manifest.json'), 'utf8'), manifestBefore)
})

test('one Payload withdrawal tombstone suppresses every locale of artifact-wide rights', async () => {
  const payload = new IntegratedPayload()
  const validator = new PayloadDraftContentValidator(payload)
  const repository = new InMemoryContentApprovalRepository()
  const service = new ContentApprovalService(repository, validator as unknown as ContentApprovalValidator, {
    clock: { now: () => new Date('2026-09-03T10:00:00.000Z') },
  })
  const artifactId = String(payload.artifact.artifactKey)
  const prepared = await service.prepare(artifactId, 'zh-CN')
  const approved = await service.approve({
    artifactId,
    expectedContentRevision: prepared.expectedContentRevision,
    expectedDecisionSequence: prepared.expectedDecisionSequence,
    expectedRightsPolicyVersion: prepared.expectedRightsPolicyVersion,
    expectedRightsRevision: prepared.expectedRightsRevision,
    expectedSourceRevision: prepared.expectedSourceRevision,
    idempotencyKey: 'approval:integration:artifact-wide:1',
    locale: 'zh-CN',
  }, 'reviewer-1')
  const base = approvalDocument(approved)
  payload.approvalDocuments = [
    { ...base, decisionSequence: 1, id: 'approval-zh', locale: 'zh-CN' },
    {
      ...base,
      decisionFingerprint: `sha256:${'a'.repeat(64)}`,
      decisionSequence: 2,
      id: 'approval-en',
      idempotencyKey: 'approval:integration:artifact-wide:en',
      locale: 'en',
    },
  ]
  payload.withdrawalDocuments = [{
    artifact: 'artifact-document-1',
    artifactKey: artifactId,
    caseId: 'case-artifact-wide-001',
    decision: 'takedown',
    decisionFingerprint: `sha256:${'b'.repeat(64)}`,
    decisionSequence: 3,
    id: 'withdrawal-artifact-wide',
    idempotencyKey: 'withdrawal:integration:artifact-wide:1',
    locale: 'zh-CN',
    rightsRevision: `sha256:${'c'.repeat(64)}`,
    syncDispatchMode: 'disabled',
    syncEventRevision: `sha256:${'d'.repeat(64)}`,
    syncEventType: 'public_snapshot_withdrawal',
    syncPriority: 'urgent',
    syncRequestedAt: '2026-09-03T11:00:00.000Z',
    withdrawnAt: '2026-09-03T11:00:00.000Z',
    withdrawnBy: 'reviewer-2',
  }]

  const snapshot = await new PublicSnapshotService(
    new PayloadPublicSnapshotSource(payload, 'postgres'),
  ).build()
  assert.equal(snapshot.manifest.counts.prompts, 0)
  assert.equal(snapshot.manifest.counts.taxonomies, 0)
})
