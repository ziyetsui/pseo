import { createHash } from 'node:crypto'

import type {
  ContentApprovalRecord,
  ContentWithdrawalRecord,
  InternalBetaLocale,
  PublicationFileMetadata,
} from '../domain/index.ts'
import { PublicationContentValidationError } from '../domain/index.ts'
import { PayloadDraftContentValidator } from '../publication/payloadDraftContentValidator.ts'
import { mapContentWithdrawalRecord } from '../withdrawal/payloadContentWithdrawalRepository.ts'
import {
  PUBLIC_SNAPSHOT_MAX_APPROVALS,
  PublicSnapshotError,
  type PublicRightsMetadata,
  type PublicSnapshotReadSession,
  type PublicSnapshotSource,
  type PublicSnapshotValidatedApproval,
} from './types.ts'

interface PayloadFindResult {
  readonly docs: unknown[]
  readonly hasNextPage?: boolean
  readonly nextPage?: number | null
}

interface SnapshotPayloadLocalApi {
  find(args: Record<string, unknown>): Promise<{ docs: unknown[] }>
}

export interface PublicSnapshotPayloadApi extends SnapshotPayloadLocalApi {
  readonly db: {
    beginTransaction(options?: unknown): Promise<number | string | null>
    rollbackTransaction(id: number | string): Promise<void>
  }
  find(args: Record<string, unknown>): Promise<PayloadFindResult>
}

type RecordValue = Record<string, unknown>

function object(value: unknown): RecordValue {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new PublicSnapshotError(
      'MALFORMED_CMS_RECORD',
      'CMS returned a malformed public snapshot record',
      500,
    )
  }
  return value as RecordValue
}

function requiredString(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new PublicSnapshotError(
      'MALFORMED_CMS_RECORD',
      'CMS returned a malformed public snapshot record',
      500,
    )
  }
  return value
}

function optionalString(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  return requiredString(value)
}

function riskAcceptanceRevision(source: RecordValue): `sha256:${string}` {
  const canonical = JSON.stringify({
    riskAcceptedAt: requiredString(source.riskAcceptedAt),
    riskAcceptedBy: requiredString(source.riskAcceptedBy),
  })
  return `sha256:${createHash('sha256').update(canonical, 'utf8').digest('hex')}`
}

function relationId(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  const relation = object(value)
  if (typeof relation.id === 'string' || typeof relation.id === 'number') return String(relation.id)
  throw new PublicSnapshotError(
    'MALFORMED_CMS_RECORD',
    'CMS returned a malformed public snapshot record',
    500,
  )
}

function decisionSequence(value: unknown): number {
  const numeric = Number(relationId(value))
  if (!Number.isSafeInteger(numeric) || numeric < 1) {
    throw new PublicSnapshotError(
      'MALFORMED_CMS_RECORD',
      'CMS returned a malformed publication decision sequence',
      500,
    )
  }
  return numeric
}

function mapFileMetadata(value: unknown): readonly PublicationFileMetadata[] {
  if (!Array.isArray(value)) {
    throw new PublicSnapshotError(
      'MALFORMED_CMS_RECORD',
      'CMS returned malformed approval file metadata',
      500,
    )
  }
  return value.map((candidate) => {
    const file = object(candidate)
    if (!Number.isSafeInteger(file.byteLength) || Number(file.byteLength) < 1) {
      throw new PublicSnapshotError(
        'MALFORMED_CMS_RECORD',
        'CMS returned malformed approval file metadata',
        500,
      )
    }
    return {
      byteLength: Number(file.byteLength),
      path: requiredString(file.path),
      sha256: requiredString(file.sha256),
    }
  })
}

function mapApproval(value: unknown): ContentApprovalRecord {
  const record = object(value)
  const locale = record.locale
  if (locale !== 'en' && locale !== 'zh-CN') {
    throw new PublicSnapshotError(
      'MALFORMED_CMS_RECORD',
      'CMS returned a malformed approval locale',
      500,
    )
  }
  if (record.decision !== 'approved') {
    throw new PublicSnapshotError(
      'MALFORMED_CMS_RECORD',
      'CMS returned a malformed approval decision',
      500,
    )
  }
  const files = mapFileMetadata(record.files)
  const fileCount = Number(record.fileCount)
  if (!Number.isSafeInteger(fileCount) || fileCount !== files.length) {
    throw new PublicSnapshotError(
      'MALFORMED_CMS_RECORD',
      'CMS returned malformed approval file metadata',
      500,
    )
  }
  return {
    approvedAt: requiredString(record.approvedAt),
    approvedBy: relationId(record.approvedBy),
    artifactId: requiredString(record.artifactKey),
    contentRevision: requiredString(record.contentRevision),
    decision: 'approved',
    decisionFingerprint: requiredString(record.decisionFingerprint),
    decisionSequence: decisionSequence(record.decisionSequence),
    fileCount,
    files,
    id: relationId(record.id),
    idempotencyKey: requiredString(record.idempotencyKey),
    locale: locale as InternalBetaLocale,
    rightsPolicyVersion: requiredString(record.rightsPolicyVersion),
    rightsRevision: requiredString(record.rightsRevision),
    sourceRevision: requiredString(record.sourceRevision),
  }
}

function mapWithdrawal(value: unknown): ContentWithdrawalRecord {
  try {
    return mapContentWithdrawalRecord(value)
  } catch {
    throw new PublicSnapshotError(
      'MALFORMED_CMS_RECORD',
      'CMS returned a malformed withdrawal audit record',
      500,
    )
  }
}

class TransactionalPayloadSnapshotSession implements PublicSnapshotReadSession {
  private readonly payload: SnapshotPayloadLocalApi
  private readonly validator: PayloadDraftContentValidator

  constructor(payload: SnapshotPayloadLocalApi) {
    this.payload = payload
    this.validator = new PayloadDraftContentValidator(
      payload as ConstructorParameters<typeof PayloadDraftContentValidator>[0],
    )
  }

  async listApprovals(): Promise<readonly ContentApprovalRecord[]> {
    const approvals: ContentApprovalRecord[] = []
    let page = 1
    while (true) {
      const result = await this.payload.find({
        collection: 'content-approvals',
        depth: 0,
        limit: 100,
        overrideAccess: true,
        page,
        pagination: true,
        sort: ['artifactKey', 'locale', '-approvedAt', '-id'],
        where: { decision: { equals: 'approved' } },
      }) as PayloadFindResult
      approvals.push(...result.docs.map(mapApproval))
      if (approvals.length > PUBLIC_SNAPSHOT_MAX_APPROVALS) {
        throw new PublicSnapshotError(
          'TOO_MANY_APPROVALS',
          'The public snapshot approval limit was exceeded',
        )
      }
      if (result.hasNextPage !== true) break
      if (!Number.isSafeInteger(result.nextPage) || Number(result.nextPage) <= page) {
        throw new PublicSnapshotError(
          'INVALID_CMS_PAGINATION',
          'CMS could not provide a closed approval page set',
          503,
        )
      }
      page = Number(result.nextPage)
    }
    return approvals
  }

  async listWithdrawals(): Promise<readonly ContentWithdrawalRecord[]> {
    const withdrawals: ContentWithdrawalRecord[] = []
    let page = 1
    while (true) {
      const result = await this.payload.find({
        collection: 'content-withdrawals',
        depth: 0,
        limit: 100,
        overrideAccess: true,
        page,
        pagination: true,
        sort: ['artifactKey', 'locale', '-withdrawnAt', '-id'],
      }) as PayloadFindResult
      withdrawals.push(...result.docs.map(mapWithdrawal))
      if (withdrawals.length > PUBLIC_SNAPSHOT_MAX_APPROVALS) {
        throw new PublicSnapshotError(
          'TOO_MANY_WITHDRAWALS',
          'The public snapshot withdrawal limit was exceeded',
        )
      }
      if (result.hasNextPage !== true) break
      if (!Number.isSafeInteger(result.nextPage) || Number(result.nextPage) <= page) {
        throw new PublicSnapshotError(
          'INVALID_CMS_PAGINATION',
          'CMS could not provide a closed withdrawal page set',
          503,
        )
      }
      page = Number(result.nextPage)
    }
    return withdrawals
  }

  async validateApproval(approval: ContentApprovalRecord): Promise<PublicSnapshotValidatedApproval> {
    try {
      const validation = await this.validator.validate({
        artifactId: approval.artifactId,
        locales: [approval.locale],
      })
      if (typeof validation.rightsRevision !== 'string') {
        throw new PublicSnapshotError(
          'RIGHTS_REVISION_MISSING',
          'Current CMS validation did not produce an independent rights revision',
          409,
        )
      }
      return {
        contentRevision: validation.contentRevision,
        files: validation.files,
        rights: await this.readRights(approval.artifactId, approval.locale),
        rightsRevision: validation.rightsRevision,
        sourceRevision: validation.sourceRevision,
      }
    } catch (error: unknown) {
      if (error instanceof PublicSnapshotError) throw error
      if (error instanceof PublicationContentValidationError) {
        throw new PublicSnapshotError(
          'APPROVED_REVISION_UNAVAILABLE',
          'Current CMS content no longer matches an immutable approved revision',
          409,
        )
      }
      throw new PublicSnapshotError(
        'CMS_VALIDATION_FAILED',
        'CMS could not safely validate an approved public snapshot record',
        500,
      )
    }
  }

  private async readRights(
    artifactId: string,
    locale: InternalBetaLocale,
  ): Promise<PublicRightsMetadata> {
    const artifacts = await this.payload.find({
      collection: 'prompt-artifacts',
      depth: 0,
      draft: true,
      limit: 2,
      overrideAccess: true,
      where: { artifactKey: { equals: artifactId } },
    })
    if (artifacts.docs.length !== 1) {
      throw new PublicSnapshotError(
        'ARTIFACT_CARDINALITY',
        'Approved content no longer resolves to exactly one CMS artifact',
        409,
      )
    }
    const artifactDocumentId = object(artifacts.docs[0]).id
    if (typeof artifactDocumentId !== 'string' && typeof artifactDocumentId !== 'number') {
      throw new PublicSnapshotError(
        'MALFORMED_CMS_RECORD',
        'CMS returned a malformed public snapshot record',
        500,
      )
    }
    const sources = await this.payload.find({
      collection: 'source-evidence',
      depth: 0,
      draft: true,
      limit: 100,
      overrideAccess: true,
      where: { artifact: { equals: artifactDocumentId } },
    })
    const primary = sources.docs.map(object).filter((candidate) => (
      candidate.recordType === 'source' && candidate.isPrimarySource === true
    ))
    if (primary.length !== 1) {
      throw new PublicSnapshotError(
        'PRIMARY_SOURCE_CARDINALITY',
        'Approved content no longer has exactly one primary source',
        409,
      )
    }
    const source = primary[0]
    if (!source) {
      throw new PublicSnapshotError(
        'PRIMARY_SOURCE_CARDINALITY',
        'Approved content no longer has exactly one primary source',
        409,
      )
    }
    if (source.rightsStatus === 'cleared') {
      return {
        basis: requiredString(source.basis),
        evidenceUrl: requiredString(source.evidenceUrl),
        licenseReference: requiredString(source.licenseReference),
        reviewedAt: requiredString(source.reviewedAt),
        sourceUrl: requiredString(source.sourceUrl),
        status: 'cleared',
      }
    }
    if (source.rightsStatus === 'community_attributed') {
      return {
        authorName: requiredString(source.authorName),
        authorUrl: optionalString(source.authorUrl),
        notice: locale === 'zh-CN'
          ? '作者保留权利；该 Prompt 不适用仓库的开放内容许可证。'
          : 'The author retains rights; this Prompt is not offered under the repository content license.',
        originalPostUrl: requiredString(source.originalPostUrl),
        policyVersion: requiredString(source.policyVersion),
        reviewedAt: requiredString(source.reviewedAt),
        riskAcceptanceRevision: riskAcceptanceRevision(source),
        sourceUrl: requiredString(source.sourceUrl),
        status: 'community_attributed',
        takedownUrl: requiredString(source.takedownUrl),
      }
    }
    throw new PublicSnapshotError(
      'APPROVED_RIGHTS_NOT_PUBLIC',
      'An approved record is not public and has no newer durable withdrawal',
      409,
    )
  }
}

export class PayloadPublicSnapshotSource implements PublicSnapshotSource {
  private readonly payload: PublicSnapshotPayloadApi
  private readonly databaseAdapter: 'd1' | 'postgres'

  constructor(
    payload: PublicSnapshotPayloadApi,
    databaseAdapter: 'd1' | 'postgres',
  ) {
    this.payload = payload
    this.databaseAdapter = databaseAdapter
  }

  async readConsistently<T>(
    read: (session: PublicSnapshotReadSession) => Promise<T>,
  ): Promise<T> {
    if (this.databaseAdapter !== 'postgres') {
      throw new PublicSnapshotError(
        'SNAPSHOT_CONSISTENCY_UNAVAILABLE',
        'This CMS database adapter cannot provide an immutable public snapshot read',
        503,
      )
    }

    let transactionId: number | string | null
    try {
      transactionId = await this.payload.db.beginTransaction({
        accessMode: 'read only',
        isolationLevel: 'repeatable read',
      })
    } catch {
      throw new PublicSnapshotError(
        'SNAPSHOT_CONSISTENCY_UNAVAILABLE',
        'CMS could not start an immutable public snapshot read',
        503,
      )
    }
    if (transactionId === null) {
      throw new PublicSnapshotError(
        'SNAPSHOT_CONSISTENCY_UNAVAILABLE',
        'CMS could not start an immutable public snapshot read',
        503,
      )
    }

    const request = { payload: this.payload, transactionID: transactionId }
    const transactionalPayload: SnapshotPayloadLocalApi = {
      find: (args) => this.payload.find({ ...args, req: request }),
    }
    let completed = false
    try {
      const result = await read(new TransactionalPayloadSnapshotSession(transactionalPayload))
      completed = true
      return result
    } finally {
      try {
        await this.payload.db.rollbackTransaction(transactionId)
      } catch {
        if (completed) {
          throw new PublicSnapshotError(
            'SNAPSHOT_CONSISTENCY_CLEANUP_FAILED',
            'CMS could not close the immutable public snapshot read',
            503,
          )
        }
      }
    }
  }
}
