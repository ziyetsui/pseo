import {
  PUBLICATION_REQUEST_STATUSES,
  type GitPublisherReceipt,
  type InternalBetaLocale,
  type PendingPublicationRequest,
  type PublicationCheck,
  type PublicationRequestRecord,
  type PublicationRequestRepository,
  type PublicationRequestStatus,
} from '../domain/index.ts'

interface PayloadLocalApi {
  create(args: Record<string, unknown>): Promise<unknown>
  find(args: Record<string, unknown>): Promise<{ docs: unknown[] }>
  update(args: Record<string, unknown>): Promise<unknown>
}

interface PayloadRepositoryOptions {
  readonly artifactDocumentId: string | number
  readonly payload: PayloadLocalApi
}

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Payload publication request record is malformed')
  }
  return value as Record<string, unknown>
}

function string(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new Error(`Payload publication request ${field} is malformed`)
  return value
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function relationId(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'string' || typeof id === 'number') return String(id)
  }
  throw new Error('Payload publication request requestedBy is malformed')
}

function locales(value: unknown): readonly InternalBetaLocale[] {
  if (!Array.isArray(value)) throw new Error('Payload publication request locales are malformed')
  return value.map((entry) => {
    const locale = object(entry).locale
    if (locale !== 'en' && locale !== 'zh-CN') {
      throw new Error('Payload publication request locale is malformed')
    }
    return locale
  })
}

function checks(value: unknown): readonly PublicationCheck[] {
  if (!Array.isArray(value)) return []
  return value.map((entry) => {
    const row = object(entry)
    const status = row.status
    if (status !== 'pending' && status !== 'passed' && status !== 'failed') {
      throw new Error('Payload publication request check status is malformed')
    }
    return { name: string(row.name, 'check name'), status }
  })
}

function status(value: unknown): PublicationRequestStatus {
  if (typeof value !== 'string' || !(PUBLICATION_REQUEST_STATUSES as readonly string[]).includes(value)) {
    throw new Error('Payload publication request status is malformed')
  }
  return value as PublicationRequestStatus
}

function mapRecord(value: unknown): PublicationRequestRecord {
  const record = object(value)
  const rawId = record.id
  if (typeof rawId !== 'string' && typeof rawId !== 'number') {
    throw new Error('Payload publication request id is malformed')
  }
  const provider = record.provider === 'mock' || record.provider === 'github' ? record.provider : null
  return {
    id: String(rawId),
    artifactId: string(record.artifactKey, 'artifactKey'),
    locales: locales(record.locales),
    expectedBaseSha: string(record.expectedBaseSha, 'expectedBaseSha'),
    expectedContentRevision: string(record.expectedContentRevision, 'expectedContentRevision'),
    expectedSourceRevision: string(record.expectedSourceRevision, 'expectedSourceRevision'),
    validatedContentRevision: string(record.validatedContentRevision, 'validatedContentRevision'),
    validatedSourceRevision: string(record.validatedSourceRevision, 'validatedSourceRevision'),
    commitMessage: string(record.commitMessage, 'commitMessage'),
    idempotencyKey: string(record.idempotencyKey, 'idempotencyKey'),
    requestFingerprint: string(record.requestFingerprint, 'requestFingerprint'),
    requestedBy: relationId(record.requestedBy),
    status: status(record.status),
    provider,
    plannedBranch: nullableString(record.plannedBranch),
    branch: nullableString(record.branch),
    commitSha: nullableString(record.commitSha),
    pullRequestNumber: typeof record.pullRequestNumber === 'number' ? record.pullRequestNumber : null,
    pullRequestUrl: nullableString(record.pullRequestUrl),
    checks: checks(record.checks),
    errorCode: nullableString(record.errorCode),
    errorDetail: nullableString(record.errorDetail),
  }
}

export class PayloadPublicationRequestRepository implements PublicationRequestRepository {
  private readonly options: PayloadRepositoryOptions

  constructor(options: PayloadRepositoryOptions) {
    this.options = options
  }

  async findByIdempotencyKey(key: string): Promise<PublicationRequestRecord | null> {
    const result = await this.options.payload.find({
      collection: 'publication-requests',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { idempotencyKey: { equals: key } },
    })
    const first = result.docs[0]
    return first === undefined ? null : mapRecord(first)
  }

  async createPending(input: PendingPublicationRequest): Promise<PublicationRequestRecord> {
    const created = await this.options.payload.create({
      collection: 'publication-requests',
      data: {
        artifact: this.options.artifactDocumentId,
        artifactKey: input.artifactId,
        locales: input.locales.map((locale) => ({ locale })),
        expectedBaseSha: input.expectedBaseSha,
        expectedContentRevision: input.expectedContentRevision,
        expectedSourceRevision: input.expectedSourceRevision,
        validatedContentRevision: input.validatedContentRevision,
        validatedSourceRevision: input.validatedSourceRevision,
        commitMessage: input.commitMessage,
        idempotencyKey: input.idempotencyKey,
        requestFingerprint: input.requestFingerprint,
        requestedBy: input.requestedBy,
        status: 'pending',
        checks: [],
      },
      overrideAccess: true,
    })
    return mapRecord(created)
  }

  async applyPublisherReceipt(id: string, receipt: GitPublisherReceipt): Promise<PublicationRequestRecord> {
    return this.update(id, {
      status: receipt.status,
      provider: receipt.provider,
      plannedBranch: receipt.plannedBranch,
      branch: receipt.branch,
      commitSha: receipt.commitSha,
      pullRequestNumber: receipt.pullRequestNumber,
      pullRequestUrl: receipt.pullRequestUrl,
      checks: receipt.checks,
      errorCode: null,
      errorDetail: null,
    })
  }

  async markFailed(id: string, code: string, detail: string): Promise<PublicationRequestRecord> {
    return this.update(id, { status: 'failed', errorCode: code, errorDetail: detail })
  }

  async markConflicted(id: string, code: string, detail: string): Promise<PublicationRequestRecord> {
    return this.update(id, { status: 'conflicted', errorCode: code, errorDetail: detail })
  }

  private async update(id: string, data: Record<string, unknown>): Promise<PublicationRequestRecord> {
    const updated = await this.options.payload.update({
      collection: 'publication-requests',
      id,
      data,
      overrideAccess: true,
    })
    return mapRecord(updated)
  }
}

export type { PayloadLocalApi }
