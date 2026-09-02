export interface CmsEnvironment {
  readonly databaseUri: string
  readonly gitPublisherMode: 'mock'
  readonly mockGitBaseSha: string
  readonly payloadSecret: string
  readonly publicServerUrl: string
}

export class CmsConfigurationError extends Error {
  override readonly name = 'CmsConfigurationError'
}

function required(source: NodeJS.ProcessEnv, name: string): string {
  const value = source[name]?.trim()
  if (!value) throw new CmsConfigurationError(`${name} is required`)
  return value
}

export function readCmsEnvironment(source: NodeJS.ProcessEnv = process.env): CmsEnvironment {
  const payloadSecret = required(source, 'PAYLOAD_SECRET')
  if (payloadSecret.length < 32) {
    throw new CmsConfigurationError('PAYLOAD_SECRET must contain at least 32 characters')
  }

  const databaseUri = required(source, 'DATABASE_URI')
  if (!databaseUri.startsWith('postgres://') && !databaseUri.startsWith('postgresql://')) {
    throw new CmsConfigurationError('DATABASE_URI must use postgres:// or postgresql://')
  }

  const publicServerUrl = required(source, 'PAYLOAD_PUBLIC_SERVER_URL')
  let parsedServerUrl: URL
  try {
    parsedServerUrl = new URL(publicServerUrl)
  } catch {
    throw new CmsConfigurationError('PAYLOAD_PUBLIC_SERVER_URL must be an absolute URL')
  }
  if (!['http:', 'https:'].includes(parsedServerUrl.protocol)) {
    throw new CmsConfigurationError('PAYLOAD_PUBLIC_SERVER_URL must use http or https')
  }

  const configuredMode = source.CMS_GIT_PUBLISHER?.trim() || 'mock'
  if (configuredMode !== 'mock') {
    throw new CmsConfigurationError(
      'CMS_GIT_PUBLISHER must be mock; no live Git publisher is bundled with the internal beta',
    )
  }

  const mockGitBaseSha = required(source, 'CMS_MOCK_GIT_BASE_SHA')
  if (!/^[a-f0-9]{7,64}$/u.test(mockGitBaseSha)) {
    throw new CmsConfigurationError('CMS_MOCK_GIT_BASE_SHA must be a 7-64 character lowercase hex revision')
  }

  return {
    databaseUri,
    gitPublisherMode: 'mock',
    mockGitBaseSha,
    payloadSecret,
    publicServerUrl: parsedServerUrl.toString().replace(/\/$/u, ''),
  }
}
