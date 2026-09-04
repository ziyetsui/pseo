import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { CloudflareContext } from '@opennextjs/cloudflare'
import { sqliteD1Adapter } from '@payloadcms/db-d1-sqlite'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { buildConfig, type PayloadLogger } from 'payload'
import type { GetPlatformProxyOptions } from 'wrangler'

import {
  AgentProposalAudits,
  ContentApprovals,
  ContentWithdrawals,
  LocaleVariants,
  PublicationDecisionSequences,
  PromptArtifacts,
  PublicationRequests,
  SourceEvidence,
  Taxonomies,
  Users,
} from '@/collections'
import {
  CMS_POSTGRES_POOL_MAX,
  CMS_POSTGRES_REQUEST_CONNECTION_TIMEOUT_MS,
  CMS_POSTGRES_REQUEST_LOCK_TIMEOUT_MS,
  CMS_POSTGRES_REQUEST_MAX_USES,
  CMS_POSTGRES_REQUEST_QUERY_TIMEOUT_MS,
  CMS_POSTGRES_REQUEST_TRANSACTION_IDLE_TIMEOUT_MS,
  readCmsDatabaseAdapter,
  readCmsEnvironment,
  readCmsPostgresTransport,
} from '@/config/env'
import { cmsMigrationDirectory } from '@/config/migrationDirectory'
import {
  createContentApprovalEndpoint,
  createPromptProposalEndpoint,
  createContentWithdrawalEndpoint,
  createPrepareContentApprovalEndpoint,
  createPrepareContentWithdrawalEndpoint,
  createPreviewCatalogEndpoint,
  createPublicSnapshotEndpoint,
} from '@/endpoints'
import { cloudflareRequestScopedPg } from '@/runtime/cloudflareRequestScopedPostgres'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const databaseAdapter = readCmsDatabaseAdapter()
const postgresTransport = readCmsPostgresTransport()
const cloudflare = databaseAdapter === 'd1' || postgresTransport === 'hyperdrive'
  ? await getCloudflareRuntime()
  : null
const environment = readCmsEnvironment(
  cloudflare ? mergeTextBindings(process.env, cloudflare.env) : process.env,
  postgresTransport === 'hyperdrive'
    ? { hyperdrive: getHyperdriveBinding(cloudflare) }
    : {},
)

const db = environment.databaseAdapter === 'd1'
  ? sqliteD1Adapter({
      binding: getD1Binding(cloudflare),
      migrationDir: cmsMigrationDirectory(dirname, 'd1'),
    })
  : postgresAdapter({
      migrationDir: cmsMigrationDirectory(dirname, 'postgres'),
      pool: {
        connectionString: environment.databaseUri!,
        max: CMS_POSTGRES_POOL_MAX,
        ...(environment.postgresTransport === 'hyperdrive'
          ? {
              connectionTimeoutMillis: CMS_POSTGRES_REQUEST_CONNECTION_TIMEOUT_MS,
              idle_in_transaction_session_timeout:
                CMS_POSTGRES_REQUEST_TRANSACTION_IDLE_TIMEOUT_MS,
              lock_timeout: CMS_POSTGRES_REQUEST_LOCK_TIMEOUT_MS,
              maxUses: CMS_POSTGRES_REQUEST_MAX_USES,
              query_timeout: CMS_POSTGRES_REQUEST_QUERY_TIMEOUT_MS,
              statement_timeout: CMS_POSTGRES_REQUEST_QUERY_TIMEOUT_MS,
            }
          : {}),
      },
      ...(environment.postgresTransport === 'hyperdrive'
        ? { pg: cloudflareRequestScopedPg }
        : {}),
    })

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      importMapFile: path.resolve(dirname, 'app/(payload)/admin/importMap.ts'),
    },
    meta: {
      // Dynamic OG generation adds @vercel/og's WASM runtime to the Worker.
      // The matching endpoint alias in next.config.mjs preserves Payload's
      // disabled HTTP 400 response without bundling that optional feature.
      defaultOGImageType: 'off',
      titleSuffix: ' · PSEO draft editor',
    },
  },
  collections: [
    Users,
    AgentProposalAudits,
    PromptArtifacts,
    LocaleVariants,
    Taxonomies,
    SourceEvidence,
    PublicationDecisionSequences,
    ContentApprovals,
    ContentWithdrawals,
    PublicationRequests,
  ],
  cors: [environment.publicServerUrl],
  csrf: [environment.publicServerUrl],
  db,
  endpoints: [
    createPromptProposalEndpoint(),
    createPrepareContentApprovalEndpoint(),
    createContentApprovalEndpoint(),
    createPrepareContentWithdrawalEndpoint(),
    createContentWithdrawalEndpoint(),
    createPreviewCatalogEndpoint(environment),
    createPublicSnapshotEndpoint(environment),
  ],
  graphQL: {
    // Internal beta uses the reviewed REST endpoints only. Keeping GraphQL
    // disabled reduces the public surface and avoids an unverified workerd
    // compatibility path in Payload's Cloudflare runtime.
    disable: true,
  },
  secret: environment.payloadSecret,
  serverURL: environment.publicServerUrl,
  telemetry: false,
  ...(environment.databaseAdapter === 'd1' && process.env.NODE_ENV === 'production'
    ? { logger: createCloudflareLogger() }
    : {}),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})

type D1Binding = Parameters<typeof sqliteD1Adapter>[0]['binding']
type CmsCloudflareContext = CloudflareContext & {
  env: {
    D1?: D1Binding
    HYPERDRIVE?: unknown
  }
}

function getD1Binding(context: CloudflareContext | null): D1Binding {
  const binding = (context as CmsCloudflareContext | null)?.env.D1
  if (!binding) {
    throw new Error('Cloudflare D1 binding D1 is required when CMS_DATABASE_ADAPTER=d1')
  }
  return binding
}

function getHyperdriveBinding(context: CloudflareContext | null): unknown {
  return (context as CmsCloudflareContext | null)?.env.HYPERDRIVE
}

function mergeTextBindings(
  source: NodeJS.ProcessEnv,
  bindings: object,
): NodeJS.ProcessEnv {
  const merged = { ...source }
  for (const [name, value] of Object.entries(bindings)) {
    if (typeof value === 'string') merged[name] = value
  }
  return merged
}

async function getCloudflareRuntime(): Promise<CloudflareContext> {
  const isProduction = process.env.NODE_ENV === 'production'
  const usesEphemeralBuildBinding = process.env.CMS_CLOUDFLARE_EPHEMERAL_D1 === 'true'
  const usesPlatformProxy = process.env.CMS_CLOUDFLARE_PLATFORM_PROXY === 'true'
  if (isPayloadCli() || usesEphemeralBuildBinding || usesPlatformProxy) {
    const { getPlatformProxy } = await import(
      /* webpackIgnore: true */ `${'__wrangler'.replaceAll('_', '')}`
    ) as typeof import('wrangler')
    const configuredEnvironment = process.env.CLOUDFLARE_ENV
    return getPlatformProxy({
      configPath: path.resolve(dirname, '../wrangler.jsonc'),
      ...(configuredEnvironment ? { environment: configuredEnvironment } : {}),
      // A production migration/deploy must consume the checked-in Wrangler
      // environment, never developer-local `.env` values such as localhost
      // URLs. Payload still loads PAYLOAD_SECRET into process.env for the CLI.
      ...(isProduction ? { envFiles: [] } : {}),
      ...(usesEphemeralBuildBinding ? { persist: false } : {}),
      remoteBindings: usesEphemeralBuildBinding ? false : isProduction,
    } satisfies GetPlatformProxyOptions)
  }

  const { getCloudflareContext } = await import('@opennextjs/cloudflare')
  return getCloudflareContext({ async: true })
}

function isPayloadCli(): boolean {
  return process.argv.some((value) => {
    try {
      return path.resolve(value).endsWith(path.join('payload', 'bin.js'))
    } catch {
      return false
    }
  })
}

function createCloudflareLogger(): PayloadLogger {
  const createLog = (
    level: string,
    output: (...data: unknown[]) => void,
  ) => (objOrMessage: object | string, message?: string) => {
    const record = typeof objOrMessage === 'string'
      ? { level, message: objOrMessage }
      : { level, ...objOrMessage, message: message ?? getMessage(objOrMessage) }
    output(JSON.stringify(record))
  }

  return {
    level: process.env.PAYLOAD_LOG_LEVEL || 'info',
    trace: createLog('trace', console.debug),
    debug: createLog('debug', console.debug),
    info: createLog('info', console.log),
    warn: createLog('warn', console.warn),
    error: createLog('error', console.error),
    fatal: createLog('fatal', console.error),
    silent: () => undefined,
  } as unknown as PayloadLogger
}

function getMessage(value: object): unknown {
  return 'message' in value ? value.message : undefined
}
