export type ApproveContentFetch = (url: string, init?: RequestInit) => Promise<Response>

export interface ApproveContentResult {
  readonly approvalId: string
  readonly approvedAt: string
  readonly contentRevision: string
  readonly decisionSequence: number
  readonly fileCount: number
  readonly locale: 'en' | 'zh-CN'
  readonly rightsPolicyVersion: string
  readonly rightsRevision: string
  readonly sourceRevision: string
  readonly status: 'approved'
}

export interface ApproveSavedRevisionOptions {
  readonly apiBase: string
  readonly artifactId: string
  readonly fetcher?: ApproveContentFetch
  readonly idempotencyKey: string
  readonly locale: 'en' | 'zh-CN'
}

export interface ApproveContentAvailability {
  readonly artifactId: string | null
  readonly busy: boolean
  readonly documentId: number | string | null | undefined
  readonly formInitializing: boolean
  readonly formModified: boolean
  readonly formProcessing: boolean
  readonly hasResult: boolean
  readonly locale: 'en' | 'zh-CN' | null
}

type UnknownRecord = Record<string, unknown>

export function canApproveSavedRevision(options: ApproveContentAvailability): boolean {
  return options.documentId !== null &&
    options.documentId !== undefined &&
    !options.formInitializing &&
    !options.formModified &&
    !options.formProcessing &&
    !options.busy &&
    !options.hasResult &&
    options.artifactId !== null &&
    options.locale !== null
}

function record(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as UnknownRecord
    : null
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Content approval response has an invalid ${field}`)
  }
  return value
}

function revision(value: unknown, field: string): string {
  const result = requiredString(value, field)
  if (!/^sha256:[a-f0-9]{64}$/u.test(result)) {
    throw new Error(`Content approval response has an invalid ${field}`)
  }
  return result
}

async function responseBody(response: Response): Promise<UnknownRecord> {
  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new Error(`Content approval API returned HTTP ${response.status}`)
  }
  const result = record(body)
  if (!result) throw new Error('Content approval API returned a malformed response')
  if (!response.ok) {
    const detail = typeof result.detail === 'string' && result.detail.length <= 500
      ? result.detail
      : `Content approval API returned HTTP ${response.status}`
    throw new Error(detail)
  }
  return result
}

function preparedData(body: UnknownRecord, artifactId: string, locale: string) {
  const data = record(body.data)
  if (!data || data.artifactId !== artifactId || data.locale !== locale) {
    throw new Error('Content approval prepare response does not match the saved revision')
  }
  if (!Number.isSafeInteger(data.fileCount) || Number(data.fileCount) < 1) {
    throw new Error('Content approval response has an invalid fileCount')
  }
  if (!Number.isSafeInteger(data.expectedDecisionSequence) || Number(data.expectedDecisionSequence) < 0) {
    throw new Error('Content approval response has an invalid expectedDecisionSequence')
  }
  return {
    expectedContentRevision: revision(data.expectedContentRevision, 'expectedContentRevision'),
    expectedDecisionSequence: Number(data.expectedDecisionSequence),
    expectedRightsPolicyVersion: requiredString(
      data.expectedRightsPolicyVersion,
      'expectedRightsPolicyVersion',
    ),
    expectedRightsRevision: revision(data.expectedRightsRevision, 'expectedRightsRevision'),
    expectedSourceRevision: revision(data.expectedSourceRevision, 'expectedSourceRevision'),
    fileCount: Number(data.fileCount),
  }
}

function approvalData(
  body: UnknownRecord,
  prepared: ReturnType<typeof preparedData>,
  artifactId: string,
  locale: string,
): ApproveContentResult {
  const data = record(body.data)
  if (!data || data.artifactId !== artifactId || data.locale !== locale || data.decision !== 'approved') {
    throw new Error('Content approval response does not match the saved revision')
  }
  const contentRevision = revision(data.contentRevision, 'contentRevision')
  const sourceRevision = revision(data.sourceRevision, 'sourceRevision')
  const rightsPolicyVersion = requiredString(data.rightsPolicyVersion, 'rightsPolicyVersion')
  const rightsRevision = revision(data.rightsRevision, 'rightsRevision')
  const fileCount = Number(data.fileCount)
  const decisionSequence = Number(data.decisionSequence)
  if (
    contentRevision !== prepared.expectedContentRevision ||
    sourceRevision !== prepared.expectedSourceRevision ||
    rightsPolicyVersion !== prepared.expectedRightsPolicyVersion ||
    rightsRevision !== prepared.expectedRightsRevision ||
    !Number.isSafeInteger(decisionSequence) ||
    decisionSequence < 1 ||
    decisionSequence < prepared.expectedDecisionSequence ||
    !Number.isSafeInteger(fileCount) ||
    fileCount !== prepared.fileCount
  ) {
    throw new Error('Content approval response changed after preparation')
  }
  return {
    approvalId: requiredString(data.id, 'id'),
    approvedAt: requiredString(data.approvedAt, 'approvedAt'),
    contentRevision,
    decisionSequence,
    fileCount,
    locale: locale as 'en' | 'zh-CN',
    rightsPolicyVersion,
    rightsRevision,
    sourceRevision,
    status: 'approved',
  }
}

function endpoint(apiBase: string, artifactId: string, suffix: string): string {
  return `${apiBase.replace(/\/+$/u, '')}/internal/v1/artifacts/${encodeURIComponent(artifactId)}/approvals${suffix}`
}

/** Prepares and approves exactly one saved CMS artifact locale revision. */
export async function approveSavedContentRevision(
  options: ApproveSavedRevisionOptions,
): Promise<ApproveContentResult> {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$/u.test(options.artifactId)) {
    throw new Error('Save a valid Prompt artifact before approving its revision')
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/u.test(options.idempotencyKey)) {
    throw new Error('Could not create a valid content approval id')
  }
  const fetcher = options.fetcher ?? fetch
  const commonInit: RequestInit = {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  }
  const prepareResponse = await fetcher(
    endpoint(options.apiBase, options.artifactId, '/prepare'),
    { ...commonInit, body: JSON.stringify({ locale: options.locale }) },
  )
  const prepared = preparedData(
    await responseBody(prepareResponse),
    options.artifactId,
    options.locale,
  )

  const approvalResponse = await fetcher(endpoint(options.apiBase, options.artifactId, ''), {
    ...commonInit,
    body: JSON.stringify({
      expectedContentRevision: prepared.expectedContentRevision,
      expectedDecisionSequence: prepared.expectedDecisionSequence,
      expectedRightsPolicyVersion: prepared.expectedRightsPolicyVersion,
      expectedRightsRevision: prepared.expectedRightsRevision,
      expectedSourceRevision: prepared.expectedSourceRevision,
      locale: options.locale,
    }),
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': options.idempotencyKey,
    },
  })
  return approvalData(
    await responseBody(approvalResponse),
    prepared,
    options.artifactId,
    options.locale,
  )
}
