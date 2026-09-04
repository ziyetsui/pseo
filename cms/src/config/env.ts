export interface CmsEnvironment {
  readonly databaseAdapter: 'd1' | 'postgres'
  readonly databaseUri: string | null
  readonly deploymentEnvironment: 'local' | 'production'
  readonly payloadSecret: string
  readonly postgresTransport: 'direct' | 'hyperdrive' | null
  readonly previewEnabled: boolean
  readonly previewToken: string | null
  readonly publicServerUrl: string
  readonly publicSnapshotEnabled: boolean
  readonly publicSnapshotToken: string | null
}

export interface CmsRuntimeBindings {
  /** Cloudflare runtime object; its connection string must never be logged. */
  readonly hyperdrive?: unknown
}

export const CMS_POSTGRES_POOL_MAX = 5
export const CMS_POSTGRES_REQUEST_MAX_USES = 1
export const CMS_POSTGRES_REQUEST_CONNECTION_TIMEOUT_MS = 5_000
export const CMS_POSTGRES_REQUEST_LOCK_TIMEOUT_MS = 5_000
export const CMS_POSTGRES_REQUEST_QUERY_TIMEOUT_MS = 15_000
export const CMS_POSTGRES_REQUEST_TRANSACTION_IDLE_TIMEOUT_MS = 15_000

export class CmsConfigurationError extends Error {
  override readonly name = 'CmsConfigurationError'
}

export function readCmsDatabaseAdapter(
  source: NodeJS.ProcessEnv = process.env,
): CmsEnvironment['databaseAdapter'] {
  const configuredAdapter = source.CMS_DATABASE_ADAPTER?.trim() || 'postgres'
  if (configuredAdapter !== 'postgres' && configuredAdapter !== 'd1') {
    throw new CmsConfigurationError('CMS_DATABASE_ADAPTER must be postgres or d1')
  }
  return configuredAdapter
}

function hasOwn(source: NodeJS.ProcessEnv, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(source, name)
}

function readDeploymentEnvironment(
  source: NodeJS.ProcessEnv,
): CmsEnvironment['deploymentEnvironment'] {
  const configured = source.CMS_DEPLOYMENT_ENV?.trim() || 'local'
  if (configured !== 'local' && configured !== 'production') {
    throw new CmsConfigurationError('CMS_DEPLOYMENT_ENV must be local or production')
  }
  return configured
}

export function readCmsPostgresTransport(
  source: NodeJS.ProcessEnv = process.env,
): CmsEnvironment['postgresTransport'] {
  const databaseAdapter = readCmsDatabaseAdapter(source)
  const isConfigured = hasOwn(source, 'CMS_POSTGRES_TRANSPORT')
  const configured = source.CMS_POSTGRES_TRANSPORT?.trim()

  if (databaseAdapter !== 'postgres') {
    if (isConfigured) {
      throw new CmsConfigurationError(
        'CMS_POSTGRES_TRANSPORT is accepted only when CMS_DATABASE_ADAPTER=postgres',
      )
    }
    return null
  }

  if (!configured) {
    if (readDeploymentEnvironment(source) === 'production') {
      throw new CmsConfigurationError(
        'CMS_POSTGRES_TRANSPORT must be explicit for production PostgreSQL',
      )
    }
    return 'direct'
  }
  if (configured !== 'direct' && configured !== 'hyperdrive') {
    throw new CmsConfigurationError('CMS_POSTGRES_TRANSPORT must be direct or hyperdrive')
  }
  return configured
}

function required(source: NodeJS.ProcessEnv, name: string): string {
  const value = source[name]?.trim()
  if (!value) throw new CmsConfigurationError(`${name} is required`)
  return value
}

export function readCmsEnvironment(
  source: NodeJS.ProcessEnv = process.env,
  runtime: CmsRuntimeBindings = {},
): CmsEnvironment {
  const databaseAdapter = readCmsDatabaseAdapter(source)
  const deploymentEnvironment = readDeploymentEnvironment(source)
  const postgresTransport = readCmsPostgresTransport(source)
  const payloadSecret = required(source, 'PAYLOAD_SECRET')
  if (payloadSecret.length < 32) {
    throw new CmsConfigurationError('PAYLOAD_SECRET must contain at least 32 characters')
  }

  let databaseUri: string | null = null
  if (databaseAdapter === 'postgres') {
    if (postgresTransport === 'hyperdrive') {
      if (hasOwn(source, 'DATABASE_URI')) {
        throw new CmsConfigurationError(
          'DATABASE_URI must be absent when CMS_POSTGRES_TRANSPORT=hyperdrive',
        )
      }
      const binding = runtime.hyperdrive
      const connectionString = typeof binding === 'object' && binding !== null
        ? (binding as { readonly connectionString?: unknown }).connectionString
        : undefined
      if (
        typeof connectionString !== 'string' ||
        connectionString.length === 0 ||
        connectionString.trim() !== connectionString ||
        /[\r\n]/u.test(connectionString)
      ) {
        throw new CmsConfigurationError(
          'Cloudflare HYPERDRIVE binding with a connectionString is required',
        )
      }
      databaseUri = connectionString
    } else {
      databaseUri = source.DATABASE_URI?.trim() || null
      if (!databaseUri) {
        throw new CmsConfigurationError(
          'DATABASE_URI is required when CMS_POSTGRES_TRANSPORT=direct',
        )
      }
    }
    if (!databaseUri.startsWith('postgres://') && !databaseUri.startsWith('postgresql://')) {
      throw new CmsConfigurationError(
        'PostgreSQL connection string must use postgres:// or postgresql://',
      )
    }
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
  if (
    deploymentEnvironment === 'production'
    && parsedServerUrl.protocol !== 'https:'
  ) {
    throw new CmsConfigurationError(
      'PAYLOAD_PUBLIC_SERVER_URL must use https when the CMS runs in production',
    )
  }

  // Keep the retired names out of deployable bundles while still failing
  // closed if an old binding is accidentally left on the Worker.
  const retiredGitVariable = Object.keys(source).find((name) => (
    /^CMS_(?:GIT_PUBLISHER$|GITHUB_|MOCK_GIT_)/.test(name)
  ))
  if (retiredGitVariable !== undefined) {
    throw new CmsConfigurationError(
      'Retired CMS Git publication environment variables are not accepted by the active runtime',
    )
  }

  const previewSetting = source.CMS_PREVIEW_ENABLED?.trim() || 'false'
  if (previewSetting !== 'true' && previewSetting !== 'false') {
    throw new CmsConfigurationError('CMS_PREVIEW_ENABLED must be true or false')
  }
  const previewEnabled = previewSetting === 'true'
  const configuredPreviewToken = source.CMS_PREVIEW_TOKEN?.trim() || null
  if (previewEnabled && (!configuredPreviewToken || configuredPreviewToken.length < 32)) {
    throw new CmsConfigurationError(
      'CMS_PREVIEW_TOKEN must contain at least 32 characters when preview is enabled',
    )
  }

  const publicSnapshotSetting = source.CMS_PUBLIC_SNAPSHOT_ENABLED?.trim() || 'false'
  if (publicSnapshotSetting !== 'true' && publicSnapshotSetting !== 'false') {
    throw new CmsConfigurationError('CMS_PUBLIC_SNAPSHOT_ENABLED must be true or false')
  }
  const publicSnapshotEnabled = publicSnapshotSetting === 'true'
  const rawPublicSnapshotToken = source.CMS_PUBLIC_SNAPSHOT_TOKEN
  const configuredPublicSnapshotToken = rawPublicSnapshotToken?.trim() || null
  if (
    publicSnapshotEnabled &&
    (
      !configuredPublicSnapshotToken ||
      configuredPublicSnapshotToken.length < 32 ||
      (rawPublicSnapshotToken !== undefined && /[\r\n]/u.test(rawPublicSnapshotToken))
    )
  ) {
    throw new CmsConfigurationError(
      'CMS_PUBLIC_SNAPSHOT_TOKEN must contain at least 32 characters when public snapshot export is enabled',
    )
  }

  return {
    databaseAdapter,
    databaseUri,
    deploymentEnvironment,
    payloadSecret,
    postgresTransport,
    previewEnabled,
    previewToken: previewEnabled ? configuredPreviewToken : null,
    publicServerUrl: parsedServerUrl.toString().replace(/\/$/u, ''),
    publicSnapshotEnabled,
    publicSnapshotToken: publicSnapshotEnabled ? configuredPublicSnapshotToken : null,
  }
}
