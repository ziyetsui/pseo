import type {
  GitPublisherReceipt,
  PendingPublicationRequest,
  PublicationRequestRecord,
  PublicationRequestRepository,
} from '../domain/index.ts'

function initialRecord(id: string, input: PendingPublicationRequest): PublicationRequestRecord {
  return {
    ...input,
    id,
    branch: null,
    checks: [],
    commitSha: null,
    errorCode: null,
    errorDetail: null,
    plannedBranch: null,
    provider: null,
    pullRequestNumber: null,
    pullRequestUrl: null,
    status: 'pending',
  }
}

export class InMemoryPublicationRequestRepository implements PublicationRequestRepository {
  private sequence = 0
  private readonly records = new Map<string, PublicationRequestRecord>()

  async findByIdempotencyKey(key: string): Promise<PublicationRequestRecord | null> {
    return [...this.records.values()].find((record) => record.idempotencyKey === key) ?? null
  }

  async createPending(input: PendingPublicationRequest): Promise<PublicationRequestRecord> {
    this.sequence += 1
    const record = initialRecord(`pubreq_${String(this.sequence).padStart(4, '0')}`, input)
    this.records.set(record.id, record)
    return record
  }

  async applyPublisherReceipt(id: string, receipt: GitPublisherReceipt): Promise<PublicationRequestRecord> {
    return this.replace(id, {
      branch: receipt.branch,
      checks: receipt.checks,
      commitSha: receipt.commitSha,
      errorCode: null,
      errorDetail: null,
      plannedBranch: receipt.plannedBranch,
      provider: receipt.provider,
      pullRequestNumber: receipt.pullRequestNumber,
      pullRequestUrl: receipt.pullRequestUrl,
      status: receipt.status,
    })
  }

  async markFailed(id: string, code: string, detail: string): Promise<PublicationRequestRecord> {
    return this.replace(id, { errorCode: code, errorDetail: detail, status: 'failed' })
  }

  async markConflicted(id: string, code: string, detail: string): Promise<PublicationRequestRecord> {
    return this.replace(id, { errorCode: code, errorDetail: detail, status: 'conflicted' })
  }

  private replace(id: string, patch: Partial<PublicationRequestRecord>): PublicationRequestRecord {
    const current = this.records.get(id)
    if (!current) throw new Error(`Unknown publication request: ${id}`)
    const updated = { ...current, ...patch }
    this.records.set(id, updated)
    return updated
  }
}
