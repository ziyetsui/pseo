import { isIP } from 'node:net'

const PROMPT_PROPOSAL_PATH = '/api/internal/v1/agent-proposals/prompts'
const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9:._/-]{11,199}$/u

export interface CmsProposalClientConfig {
  readonly accessClientId?: string
  readonly accessClientSecret?: string
  readonly apiKey: string
  readonly baseUrl: string
  readonly fetch?: typeof fetch
  readonly timeoutMs?: number
}

export interface CmsPromptProposalResult {
  readonly artifactId: string | number
  readonly artifactKey: string
  readonly auditId: string | number
  readonly locale: 'en' | 'zh-CN'
  readonly localeVariantId: string | number
  readonly replayed: boolean
  readonly rightsStatus: 'review_required'
  readonly sourceEvidenceId: string | number
  readonly state: 'draft'
}

export class CmsProposalClientError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'CmsProposalClientError'
    this.code = code
    this.status = status
  }
}

function endpoint(baseUrl: string): URL {
  let parsed: URL
  try {
    parsed = new URL(baseUrl)
  } catch {
    throw new CmsProposalClientError('CMS_BASE_URL_INVALID', 'CMS base URL is invalid', 0)
  }
  const loopback = parsed.hostname === 'localhost' || parsed.hostname === '::1' || (isIP(parsed.hostname) === 4 && parsed.hostname.startsWith('127.'))
  if ((parsed.protocol !== 'https:' && !(loopback && parsed.protocol === 'http:')) || parsed.username || parsed.password) {
    throw new CmsProposalClientError('CMS_BASE_URL_INVALID', 'CMS base URL must be HTTPS (HTTP is allowed only on loopback)', 0)
  }
  if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new CmsProposalClientError('CMS_BASE_URL_INVALID', 'CMS base URL must contain only an origin', 0)
  }
  parsed.pathname = PROMPT_PROPOSAL_PATH
  return parsed
}

function responseObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function validId(value: unknown): value is string | number {
  return (typeof value === 'string' && value.length > 0) || (typeof value === 'number' && Number.isSafeInteger(value) && value > 0)
}

export async function submitCmsPromptProposal(
  config: CmsProposalClientConfig,
  proposal: unknown,
  idempotencyKey: string,
): Promise<CmsPromptProposalResult> {
  if (!IDEMPOTENCY_KEY.test(idempotencyKey)) {
    throw new CmsProposalClientError('IDEMPOTENCY_KEY_INVALID', 'Idempotency key must contain 12-200 safe characters', 0)
  }
  if (config.apiKey.length < 16 || /[\r\n]/u.test(config.apiKey)) {
    throw new CmsProposalClientError('CMS_API_KEY_INVALID', 'CMS API key is missing or invalid', 0)
  }
  if ((config.accessClientId === undefined) !== (config.accessClientSecret === undefined)) {
    throw new CmsProposalClientError('ACCESS_CREDENTIALS_INCOMPLETE', 'Both Cloudflare Access service-token fields are required', 0)
  }

  const headers = new Headers({
    'Authorization': `users API-Key ${config.apiKey}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': idempotencyKey,
  })
  if (config.accessClientId !== undefined && config.accessClientSecret !== undefined) {
    headers.set('CF-Access-Client-Id', config.accessClientId)
    headers.set('CF-Access-Client-Secret', config.accessClientSecret)
  }

  const fetchImplementation = config.fetch ?? fetch
  const response = await fetchImplementation(endpoint(config.baseUrl), {
    method: 'POST',
    headers,
    body: JSON.stringify(proposal),
    redirect: 'error',
    signal: AbortSignal.timeout(config.timeoutMs ?? 20_000),
  })
  const body = responseObject(await response.json().catch(() => ({})))
  if (!response.ok) {
    throw new CmsProposalClientError(
      typeof body.code === 'string' ? body.code : 'CMS_PROPOSAL_REQUEST_FAILED',
      typeof body.detail === 'string' ? body.detail : `CMS proposal request failed with status ${response.status}`,
      response.status,
    )
  }
  const data = responseObject(body.data)
  if (
    data.state !== 'draft' ||
    data.rightsStatus !== 'review_required' ||
    (data.replayed !== true && data.replayed !== false) ||
    typeof data.artifactKey !== 'string' ||
    (data.locale !== 'en' && data.locale !== 'zh-CN') ||
    !validId(data.artifactId) ||
    !validId(data.auditId) ||
    !validId(data.localeVariantId) ||
    !validId(data.sourceEvidenceId)
  ) {
    throw new CmsProposalClientError('CMS_PROPOSAL_RESPONSE_INVALID', 'CMS returned an invalid proposal receipt', response.status)
  }
  return data as unknown as CmsPromptProposalResult
}
