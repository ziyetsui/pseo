import assert from 'node:assert/strict'
import {
  cpSync,
  constants,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const BUILD_SECRET_SENTINEL =
  'pseo-cloudflare-build-only-secret-sentinel-20260903'
export const MIGRATION_SECRET_SENTINEL =
  'pseo-cloudflare-migration-only-secret-sentinel-20260903'
export const DEPLOY_SECRET_SENTINEL =
  'pseo-cloudflare-deploy-only-secret-sentinel-20260903'
export const POSTGRES_BUILD_URI_SENTINEL =
  'postgres://127.0.0.1:5432/pseo_cloudflare_build_sentinel'
export const HYPERDRIVE_LOCAL_CONNECTION_STRING_ENV =
  'CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE'
export const HYPERDRIVE_LOCAL_CONNECTION_STRING_SENTINEL =
  'postgres://pseo_local_sentinel:pseo_local_sentinel@127.0.0.1:5432/pseo_cloudflare_local_sentinel'
export const POSTGRES_WRANGLER_CONFIG = 'wrangler.postgres.jsonc'
export const HYPERDRIVE_CACHE_DISABLED_ATTESTATION =
  'CMS_CLOUDFLARE_HYPERDRIVE_CACHE_DISABLED_ID'

export type CloudflarePostgresTransport = 'direct' | 'hyperdrive'

export interface ProductionPostgresConfiguration {
  readonly configFileName: typeof POSTGRES_WRANGLER_CONFIG
  readonly hyperdriveId: string | null
  readonly publicServerUrl: string
  readonly transport: CloudflarePostgresTransport
}

const CLOUDFLARE_HYPERDRIVE_ID = /^[0-9a-f]{32}$/i
const ZERO_CLOUDFLARE_HYPERDRIVE_ID = '0'.repeat(32)
const MAX_HYPERDRIVE_CONTROL_PLANE_RESPONSE_BYTES = 256 * 1_024
const HYPERDRIVE_CONTROL_PLANE_TIMEOUT_MS = 30_000

const CANONICAL_NEXT_ENV = [
  'export const production = {};',
  'export const development = {};',
  'export const test = {};',
  '',
].join('\n')

const DOTENV_LINE =
  /^\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?$/gm

const SENSITIVE_KEY =
  /(?:SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE|CREDENTIAL|API_KEY|AUTH|COOKIE|DATABASE_URI)/i

const OMITTED_STAGE_NAMES = new Set([
  'node_modules',
  '.next',
  '.open-next',
  '.cloudflare-build',
  '.wrangler',
  'coverage',
  'test-results',
])

const DANGEROUS_MIGRATION_VARIABLES = [
  'PAYLOAD_DROP_DATABASE',
  'CMS_CLOUDFLARE_EPHEMERAL_D1',
] as const

const CLOUDFLARE_CONTROL_PLANE_VARIABLES = [
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_API_KEY',
  'CLOUDFLARE_EMAIL',
] as const

const SAFE_PROCESS_VARIABLES = [
  'PATH',
  'TMPDIR',
  'TMP',
  'TEMP',
  'TZ',
  'LANG',
  'LC_ALL',
  'CI',
  'NO_COLOR',
  'FORCE_COLOR',
] as const

const POSTGRES_PRODUCTION_PLAINTEXT_VARIABLES = new Set([
  'CMS_DATABASE_ADAPTER',
  'CMS_DEPLOYMENT_ENV',
  'CMS_POSTGRES_TRANSPORT',
  'CMS_PREVIEW_ENABLED',
  'CMS_PUBLIC_SNAPSHOT_ENABLED',
  'PAYLOAD_PUBLIC_SERVER_URL',
])

const CREDENTIAL_FEATURES = [
  { label: 'credential-shaped PostgreSQL URI', pattern: /postgres(?:ql)?:\/\/[^\s"'`/@:]+:[^\s"'`/@]+@/i },
  { label: 'credential-shaped GitHub token', pattern: /(?:github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,})/ },
  { label: 'credential-shaped JWT', pattern: /eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}/ },
] as const

const RETIRED_GIT_FIRST_RUNTIME_MARKERS = [
  '/internal/v1/publication-requests',
  'createPublicationRequestEndpoint',
  'createPreparePublicationRequestEndpoint',
  'SubmitReviewButton',
  'submitReviewClient',
  'GitHubGitPublisher',
  'MockGitPublisher',
  'PublicationRequestService',
  'CMS_GIT_PUBLISHER',
  'CMS_GITHUB_TOKEN',
  'CMS_GITHUB_REPOSITORY',
  'CMS_GITHUB_BASE_BRANCH',
  'CMS_MOCK_GIT_BASE_SHA',
] as const

export interface SecretNeedle {
  readonly label: string
  readonly variants: readonly Buffer[]
}

export interface ArtifactFinding {
  readonly file: string
  readonly label: string
}

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key)
}

export function parseDotEnv(source: string): ReadonlyMap<string, string> {
  const parsed = new Map<string, string>()
  DOTENV_LINE.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = DOTENV_LINE.exec(source)) !== null) {
    const key = match[1]
    if (!key) continue

    let value = (match[2] ?? '').trim()
    const quote = value[0]
    if ((quote === '"' || quote === "'" || quote === '`') && value.at(-1) === quote) {
      value = value.slice(1, -1)
      if (quote === '"') {
        value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r')
      }
    }
    parsed.set(key, value)
  }

  return parsed
}

function needleVariants(value: string): readonly Buffer[] {
  const encoded = JSON.stringify(value).slice(1, -1)
  const variants = new Map<string, Buffer>()
  for (const candidate of [value, encoded]) {
    if (candidate.length > 0) variants.set(candidate, Buffer.from(candidate))
  }
  return [...variants.values()]
}

export function collectLocalSecretNeedles(projectDir: string): readonly SecretNeedle[] {
  const needles: SecretNeedle[] = []
  const fileNames = readdirSync(projectDir)
    .filter((fileName) => {
      if (fileName.endsWith('.example')) return false
      return fileName === '.env'
        || fileName.startsWith('.env.')
        || fileName === '.dev.vars'
        || fileName.startsWith('.dev.vars.')
    })
    .sort()

  for (const fileName of fileNames) {
    const filePath = join(projectDir, fileName)
    if (!existsSync(filePath) || !lstatSync(filePath).isFile()) continue

    const values = parseDotEnv(readFileSync(filePath, 'utf8'))
    for (const [key, value] of values) {
      if (!isSensitiveKey(key) || value.length === 0) continue
      needles.push({
        label: `local environment value (${fileName}:${key})`,
        variants: needleVariants(value),
      })
    }
  }

  return needles
}

export function collectProcessSecretNeedles(
  environment: NodeJS.ProcessEnv,
): readonly SecretNeedle[] {
  return Object.entries(environment)
    .filter(([key, value]) => isSensitiveKey(key) && Boolean(value))
    .map(([key, value]) => ({
      label: `build-process environment value (${key})`,
      variants: needleVariants(value ?? ''),
    }))
}

export function createSanitizedBuildEnvironment(
  source: NodeJS.ProcessEnv,
  cloudflareEnvironment?: 'production',
): NodeJS.ProcessEnv {
  const environment: Record<string, string> = {}
  for (const key of SAFE_PROCESS_VARIABLES) {
    if (source[key]) environment[key] = source[key]
  }

  return {
    ...environment,
    NODE_ENV: 'production',
    CMS_CLOUDFLARE_EPHEMERAL_D1: 'true',
    CMS_DATABASE_ADAPTER: 'd1',
    CMS_DEPLOYMENT_ENV: cloudflareEnvironment ?? 'local',
    ...(cloudflareEnvironment ? { CLOUDFLARE_ENV: cloudflareEnvironment } : {}),
    PAYLOAD_SECRET: BUILD_SECRET_SENTINEL,
  }
}

export function createSanitizedPostgresBuildEnvironment(
  source: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const environment: Record<string, string> = {}
  for (const key of SAFE_PROCESS_VARIABLES) {
    if (source[key]) environment[key] = source[key]
  }
  return {
    ...environment,
    NODE_ENV: 'production',
    CMS_DATABASE_ADAPTER: 'postgres',
    // Builds must not receive the origin credential or depend on a deployed
    // binding. The loopback sentinel fails safely if a build unexpectedly
    // attempts I/O and is separately scanned out of the artifact.
    CMS_POSTGRES_TRANSPORT: 'direct',
    CMS_DEPLOYMENT_ENV: 'production',
    CMS_PREVIEW_ENABLED: 'false',
    CLOUDFLARE_ENV: 'production',
    DATABASE_URI: POSTGRES_BUILD_URI_SENTINEL,
    PAYLOAD_SECRET: BUILD_SECRET_SENTINEL,
    // This is an inert build-time origin. The deployed Worker receives the
    // reviewed HTTPS origin from its Wrangler environment instead.
    PAYLOAD_PUBLIC_SERVER_URL: 'https://cms-build.invalid',
  }
}

export function parseCloudflareBuildEnvironment(
  arguments_: readonly string[],
): 'production' | undefined {
  const values: string[] = []
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index]
    if (argument === '--env') {
      const value = arguments_[index + 1]
      if (!value || value.startsWith('-')) {
        throw new Error('OpenNext --env requires the explicit value production')
      }
      values.push(value)
      index += 1
    } else if (argument?.startsWith('--env=')) {
      values.push(argument.slice('--env='.length))
    }
  }
  if (values.length > 1) {
    throw new Error('OpenNext --env may be provided at most once')
  }
  if (values[0] !== undefined && values[0] !== 'production') {
    throw new Error('Sanitized Cloudflare builds allow only --env=production')
  }
  return values[0]
}

export function normalizeProductionDeployArguments(
  arguments_: readonly string[],
): readonly ['--env=production'] {
  const isEqualsForm = arguments_.length === 1 && arguments_[0] === '--env=production'
  const isSplitForm = arguments_.length === 2
    && arguments_[0] === '--env'
    && arguments_[1] === 'production'
  if (!isEqualsForm && !isSplitForm) {
    throw new Error(
      'Sanitized Cloudflare deploy requires exactly --env=production and accepts no passthrough arguments',
    )
  }
  return ['--env=production']
}

export function assertSafeMigrationSourceEnvironment(source: NodeJS.ProcessEnv): void {
  const present = DANGEROUS_MIGRATION_VARIABLES.filter(
    (key) => (source[key] ?? '').trim().length > 0,
  )
  if (present.length > 0) {
    throw new Error(
      `Dangerous migration environment is set (${present.join(', ')}); refusing production migration`,
    )
  }
}

export function assertProductionD1Configuration(projectDir: string): void {
  let config: unknown
  try {
    config = JSON.parse(readFileSync(join(projectDir, 'wrangler.jsonc'), 'utf8'))
  } catch {
    throw new Error('wrangler.jsonc must be strict JSON for deterministic production preflight')
  }
  const production = (
    config
    && typeof config === 'object'
    && 'env' in config
    && config.env
    && typeof config.env === 'object'
    && 'production' in config.env
  ) ? config.env.production : null
  const databases = (
    production
    && typeof production === 'object'
    && 'd1_databases' in production
    && Array.isArray(production.d1_databases)
  ) ? production.d1_databases : []
  const d1 = databases.filter((entry) => (
    entry
    && typeof entry === 'object'
    && 'binding' in entry
    && entry.binding === 'D1'
  ))
  if (databases.length !== 1 || d1.length !== 1) {
    throw new Error('Wrangler production must contain exactly one D1 database binding named D1')
  }
  const binding = d1[0]
  assert(binding && typeof binding === 'object')
  const databaseId = 'database_id' in binding ? binding.database_id : null
  const remote = 'remote' in binding ? binding.remote : null
  if (
    typeof databaseId !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(databaseId)
    || databaseId === '00000000-0000-0000-0000-000000000000'
    || remote !== true
  ) {
    throw new Error('Wrangler production D1 binding must be remote with a non-zero UUID')
  }
}

function readProductionPostgresConfig(projectDir: string): Record<string, unknown> {
  const projectRoot = realpathSync(projectDir)
  const configPath = join(projectRoot, POSTGRES_WRANGLER_CONFIG)
  if (!existsSync(configPath)) {
    throw new Error(
      `${POSTGRES_WRANGLER_CONFIG} is required; copy the reviewed example and insert the real Hyperdrive ID`,
    )
  }
  const info = lstatSync(configPath)
  if (!info.isFile() || info.isSymbolicLink()) {
    throw new Error(`${POSTGRES_WRANGLER_CONFIG} must be a regular non-symlink file`)
  }
  let config: unknown
  try {
    config = JSON.parse(readFileSync(configPath, 'utf8'))
  } catch {
    throw new Error(
      `${POSTGRES_WRANGLER_CONFIG} must be strict JSON for deterministic production preflight`,
    )
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error(`${POSTGRES_WRANGLER_CONFIG} must contain a Wrangler configuration object`)
  }
  return config as Record<string, unknown>
}

function recordField(
  value: unknown,
  field: string,
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field} must be an object`)
  }
  return value as Record<string, unknown>
}

function compatiblePgVersion(version: string): boolean {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (!match) return false
  const major = Number(match[1])
  const minor = Number(match[2])
  const patch = Number(match[3])
  return major === 8 && (minor > 16 || (minor === 16 && patch >= 3))
}

function productionPublicServerUrl(value: unknown): string {
  if (typeof value !== 'string' || value.trim() !== value || value.length > 2_048) {
    throw new Error('Wrangler PostgreSQL production requires an HTTPS PAYLOAD_PUBLIC_SERVER_URL')
  }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('Wrangler PostgreSQL production requires an HTTPS PAYLOAD_PUBLIC_SERVER_URL')
  }
  if (
    url.protocol !== 'https:'
    || url.username !== ''
    || url.password !== ''
    || url.hash !== ''
    || url.hostname === ''
  ) {
    throw new Error('Wrangler PostgreSQL production requires an HTTPS PAYLOAD_PUBLIC_SERVER_URL')
  }
  return url.toString().replace(/\/$/u, '')
}

export function assertCloudflarePostgresDriverCompatibility(projectDir: string): string {
  let lockfile: string
  try {
    lockfile = readFileSync(join(projectDir, 'pnpm-lock.yaml'), 'utf8')
  } catch {
    throw new Error('pnpm-lock.yaml is required to verify the Cloudflare PostgreSQL driver')
  }
  const versions = new Set(
    [...lockfile.matchAll(/^  pg@(\d+\.\d+\.\d+):/gm)]
      .map((match) => match[1])
      .filter((version): version is string => Boolean(version)),
  )
  if (versions.size !== 1) {
    throw new Error('The lockfile must resolve exactly one pg driver version for Cloudflare')
  }
  const [version] = versions
  if (!version || !compatiblePgVersion(version)) {
    throw new Error('Cloudflare PostgreSQL requires pg 8.16.3 or newer within major version 8')
  }
  return version
}

export function assertProductionPostgresConfiguration(
  projectDir: string,
  expectedTransport?: CloudflarePostgresTransport,
): ProductionPostgresConfiguration {
  const config = readProductionPostgresConfig(projectDir)
  const environments = recordField(config.env, `${POSTGRES_WRANGLER_CONFIG}:env`)
  const production = recordField(
    environments.production,
    `${POSTGRES_WRANGLER_CONFIG}:env.production`,
  )
  const vars = recordField(
    production.vars,
    `${POSTGRES_WRANGLER_CONFIG}:env.production.vars`,
  )
  if (
    vars.CMS_DATABASE_ADAPTER !== 'postgres'
    || vars.CMS_DEPLOYMENT_ENV !== 'production'
    || vars.CMS_PREVIEW_ENABLED !== 'false'
    || vars.CMS_PUBLIC_SNAPSHOT_ENABLED !== 'true'
  ) {
    throw new Error(
      'Wrangler PostgreSQL production vars must select postgres, production, disabled Preview, and enabled public snapshot export',
    )
  }
  const transport = vars.CMS_POSTGRES_TRANSPORT
  if (transport !== 'direct' && transport !== 'hyperdrive') {
    throw new Error(
      'Wrangler PostgreSQL production must explicitly select CMS_POSTGRES_TRANSPORT=hyperdrive or direct',
    )
  }
  if (expectedTransport && transport !== expectedTransport) {
    throw new Error(`Wrangler PostgreSQL production must select ${expectedTransport} transport`)
  }
  const variableNames = Object.keys(vars)
  if (
    variableNames.length !== POSTGRES_PRODUCTION_PLAINTEXT_VARIABLES.size
    || variableNames.some((key) => !POSTGRES_PRODUCTION_PLAINTEXT_VARIABLES.has(key))
  ) {
    throw new Error(
      'Wrangler PostgreSQL production vars may contain only the reviewed non-secret key set; runtime credentials belong in Worker secrets or bindings',
    )
  }
  const publicServerUrl = productionPublicServerUrl(vars.PAYLOAD_PUBLIC_SERVER_URL)
  const d1Databases = production.d1_databases
  if (d1Databases !== undefined && (!Array.isArray(d1Databases) || d1Databases.length > 0)) {
    throw new Error('Wrangler PostgreSQL production cannot include a D1 binding')
  }
  const placement = recordField(
    production.placement ?? config.placement,
    `${POSTGRES_WRANGLER_CONFIG}:env.production.placement`,
  )
  if (placement.mode !== 'smart') {
    throw new Error('Wrangler PostgreSQL production must enable Smart Placement')
  }
  const compatibilityFlags = production.compatibility_flags ?? config.compatibility_flags
  if (!Array.isArray(compatibilityFlags) || !compatibilityFlags.includes('nodejs_compat')) {
    throw new Error('Wrangler PostgreSQL production must enable nodejs_compat')
  }

  const bindings = production.hyperdrive
  if (transport === 'direct') {
    if (bindings !== undefined && (!Array.isArray(bindings) || bindings.length > 0)) {
      throw new Error('Direct PostgreSQL production cannot also configure Hyperdrive')
    }
    assertCloudflarePostgresDriverCompatibility(projectDir)
    return {
      configFileName: POSTGRES_WRANGLER_CONFIG,
      hyperdriveId: null,
      publicServerUrl,
      transport,
    }
  }
  if (!Array.isArray(bindings) || bindings.length !== 1) {
    throw new Error('Wrangler PostgreSQL production requires exactly one Hyperdrive binding')
  }
  const binding = recordField(bindings[0], `${POSTGRES_WRANGLER_CONFIG}:hyperdrive[0]`)
  if (
    Object.keys(binding).length !== 2
    || binding.binding !== 'HYPERDRIVE'
    || typeof binding.id !== 'string'
    || !CLOUDFLARE_HYPERDRIVE_ID.test(binding.id)
    || binding.id === ZERO_CLOUDFLARE_HYPERDRIVE_ID
  ) {
    throw new Error(
      'Wrangler PostgreSQL production Hyperdrive binding must be HYPERDRIVE with a real 32-character hexadecimal ID and no inline connection string',
    )
  }
  assertCloudflarePostgresDriverCompatibility(projectDir)
  return {
    configFileName: POSTGRES_WRANGLER_CONFIG,
    hyperdriveId: binding.id,
    publicServerUrl,
    transport,
  }
}

export function assertHyperdriveCachingDisabledAttestation(
  configuration: ProductionPostgresConfiguration,
  source: NodeJS.ProcessEnv,
): void {
  if (configuration.transport !== 'hyperdrive') return
  assert(configuration.hyperdriveId)
  if (source[HYPERDRIVE_CACHE_DISABLED_ATTESTATION] !== configuration.hyperdriveId) {
    throw new Error(
      `Hyperdrive deployment requires ${HYPERDRIVE_CACHE_DISABLED_ATTESTATION} to equal the reviewed cache-disabled Hyperdrive ID`,
    )
  }
}

export function assertHyperdriveCachingDisabledControlPlaneResponse(
  serialized: string,
  expectedId: string,
): void {
  if (
    serialized.length === 0
    || Buffer.byteLength(serialized) > MAX_HYPERDRIVE_CONTROL_PLANE_RESPONSE_BYTES
    || /[\0]/u.test(serialized)
  ) {
    throw new Error('Cloudflare Hyperdrive cache-state verification returned an invalid response')
  }
  let response: unknown
  try {
    response = JSON.parse(serialized)
  } catch {
    // Wrangler 4.x logs its two-line version banner to stdout before the JSON
    // returned by `hyperdrive get`. Accept only a complete JSON object that
    // begins on its own line and consumes the remainder of stdout. This keeps
    // the gate compatible with the real CLI without accepting a partial or
    // ambiguously delimited control-plane response.
    const lines = serialized.split(/\r?\n/u)
    const objectStart = lines.findIndex((line) => line.trim() === '{')
    if (objectStart < 0) {
      throw new Error('Cloudflare Hyperdrive cache-state verification returned an invalid response')
    }
    try {
      response = JSON.parse(lines.slice(objectStart).join('\n'))
    } catch {
      throw new Error('Cloudflare Hyperdrive cache-state verification returned an invalid response')
    }
  }
  const configuration = recordField(response, 'Cloudflare Hyperdrive control-plane response')
  const caching = recordField(
    configuration.caching,
    'Cloudflare Hyperdrive control-plane response caching',
  )
  if (configuration.id !== expectedId || caching.disabled !== true) {
    throw new Error(
      'Cloudflare Hyperdrive control-plane verification requires the configured ID with caching.disabled=true',
    )
  }
}

function createSanitizedCloudflareControlPlaneEnvironment(
  source: NodeJS.ProcessEnv,
  logPath: string,
): NodeJS.ProcessEnv {
  const environment = {} as NodeJS.ProcessEnv
  for (const key of SAFE_PROCESS_VARIABLES) {
    if (source[key]) environment[key] = source[key]
  }
  for (const key of CLOUDFLARE_CONTROL_PLANE_VARIABLES) {
    if (source[key]) environment[key] = source[key]
  }
  return {
    ...environment,
    CI: 'true',
    CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false',
    NODE_ENV: 'production',
    NO_COLOR: '1',
    WRANGLER_LOG_PATH: logPath,
  }
}

export function verifyHyperdriveCachingDisabledControlPlane(
  projectDir: string,
  configuration: ProductionPostgresConfiguration,
  sourceEnvironment: NodeJS.ProcessEnv = process.env,
): void {
  if (configuration.transport !== 'hyperdrive') return
  assert(configuration.hyperdriveId)
  const result = spawnSync(
    process.execPath,
    [
      join(projectDir, 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
      'hyperdrive',
      'get',
      configuration.hyperdriveId,
      '--config',
      configuration.configFileName,
      '--env',
      'production',
    ],
    {
      cwd: projectDir,
      encoding: 'utf8',
      env: createSanitizedCloudflareControlPlaneEnvironment(
        sourceEnvironment,
        join(projectDir, '.wrangler', 'hyperdrive-cache-verification.log'),
      ),
      maxBuffer: MAX_HYPERDRIVE_CONTROL_PLANE_RESPONSE_BYTES,
      timeout: HYPERDRIVE_CONTROL_PLANE_TIMEOUT_MS,
    },
  )
  if (result.error || result.status !== 0 || typeof result.stdout !== 'string') {
    // Wrangler diagnostics can contain origin metadata. Keep the deploy error
    // deliberately generic rather than reflecting captured stdout/stderr.
    throw new Error('Cloudflare Hyperdrive cache-state verification failed')
  }
  assertHyperdriveCachingDisabledControlPlaneResponse(
    result.stdout.trim(),
    configuration.hyperdriveId,
  )
}

export function assertRemotePostgresMigrationUri(value: string | undefined): string {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value.length > 8_192
    || value.trim() !== value
    || /[\r\n\0]/u.test(value)
  ) {
    throw new Error('A bounded remote DATABASE_URI is required for PostgreSQL migration')
  }
  let uri: URL
  try {
    uri = new URL(value)
  } catch {
    throw new Error('DATABASE_URI must be a valid PostgreSQL URI')
  }
  const hostname = uri.hostname.replace(/^\[|\]$/g, '').replace(/\.+$/g, '').toLowerCase()
  if (
    (uri.protocol !== 'postgres:' && uri.protocol !== 'postgresql:')
    || uri.hash !== ''
    || hostname === ''
    || hostname === 'localhost'
    || hostname.endsWith('.localhost')
    || hostname.endsWith('.local')
    || hostname.endsWith('.internal')
    || /^127(?:\.\d{1,3}){3}$/u.test(hostname)
    || /^0(?:\.\d{1,3}){3}$/u.test(hostname)
    || hostname === '::'
    || hostname === '::1'
    || /^::ffff:127(?:\.\d{1,3}){3}$/u.test(hostname)
    || uri.searchParams.get('sslmode')?.toLowerCase() === 'disable'
    || uri.searchParams.get('ssl')?.toLowerCase() === 'false'
  ) {
    throw new Error('DATABASE_URI must identify a remote TLS-capable PostgreSQL database')
  }
  return value
}

export function assertDirectPostgresRuntimeSecretReady(source: NodeJS.ProcessEnv): void {
  if (source.CMS_CLOUDFLARE_DIRECT_DATABASE_READY !== 'true') {
    throw new Error(
      'Direct PostgreSQL beta deploy requires explicit confirmation that the remote DATABASE_URI Worker secret is configured',
    )
  }
}

export function assertPostgresRuntimeBindingsReady(source: NodeJS.ProcessEnv): void {
  if (source.CMS_CLOUDFLARE_RUNTIME_BINDINGS_READY !== 'true') {
    throw new Error(
      'PostgreSQL deploy requires explicit confirmation that PAYLOAD_SECRET and CMS_PUBLIC_SNAPSHOT_TOKEN are configured as Worker secrets',
    )
  }
}

export function createSanitizedProductionEnvironment(
  source: NodeJS.ProcessEnv,
  payloadSecret: string,
): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    ...createSanitizedBuildEnvironment(source, 'production'),
    PAYLOAD_SECRET: payloadSecret,
    CMS_DATABASE_ADAPTER: 'd1',
    CMS_DEPLOYMENT_ENV: 'production',
    CMS_PREVIEW_ENABLED: 'false',
    CLOUDFLARE_ENV: 'production',
    NODE_ENV: 'production',
  }
  for (const key of DANGEROUS_MIGRATION_VARIABLES) delete environment[key]

  // These authorize Wrangler itself, not the CMS application. App runtime
  // secrets stay removed and are provided by the Worker secret store.
  for (const key of CLOUDFLARE_CONTROL_PLANE_VARIABLES) {
    if (source[key]) environment[key] = source[key]
  }
  return environment
}

export function createSanitizedPostgresProductionEnvironment(
  source: NodeJS.ProcessEnv,
  payloadSecret: string,
  transport: CloudflarePostgresTransport,
  publicServerUrl: string,
): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    NODE_ENV: 'production',
    CMS_DATABASE_ADAPTER: 'postgres',
    CMS_POSTGRES_TRANSPORT: transport,
    CMS_DEPLOYMENT_ENV: 'production',
    CMS_PREVIEW_ENABLED: 'false',
    CLOUDFLARE_ENV: 'production',
    PAYLOAD_SECRET: payloadSecret,
    PAYLOAD_PUBLIC_SERVER_URL: productionPublicServerUrl(publicServerUrl),
  }
  for (const key of SAFE_PROCESS_VARIABLES) {
    if (source[key]) environment[key] = source[key]
  }
  for (const key of CLOUDFLARE_CONTROL_PLANE_VARIABLES) {
    if (source[key]) environment[key] = source[key]
  }
  return environment
}

export function createSanitizedPostgresMigrationEnvironment(
  source: NodeJS.ProcessEnv,
  publicServerUrl: string,
): NodeJS.ProcessEnv {
  const databaseUri = assertRemotePostgresMigrationUri(source.DATABASE_URI)
  const environment: NodeJS.ProcessEnv = {
    ...createSanitizedPostgresProductionEnvironment(
      source,
      MIGRATION_SECRET_SENTINEL,
      'direct',
      publicServerUrl,
    ),
    DATABASE_URI: databaseUri,
  }
  for (const key of CLOUDFLARE_CONTROL_PLANE_VARIABLES) delete environment[key]
  return environment
}

export function createSanitizedDeployEnvironment(
  source: NodeJS.ProcessEnv,
  stageRoot: string,
): NodeJS.ProcessEnv {
  return {
    ...createSanitizedProductionEnvironment(source, DEPLOY_SECRET_SENTINEL),
    // OpenNext shells out to `pnpm exec wrangler`. Explicit CI mode prevents
    // pnpm from attempting an interactive node_modules confirmation in the
    // one-use staging directory; it does not add any credential variables.
    CI: 'true',
    PAYLOAD_CONFIG_PATH: join(stageRoot, 'src', 'payload.config.ts'),
    WRANGLER_LOG_PATH: join(stageRoot, '.wrangler', 'wrangler.log'),
  }
}

export function createSanitizedPostgresDeployEnvironment(
  source: NodeJS.ProcessEnv,
  stageRoot: string,
  transport: CloudflarePostgresTransport,
  publicServerUrl: string,
): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    ...createSanitizedPostgresProductionEnvironment(
      source,
      DEPLOY_SECRET_SENTINEL,
      transport,
      publicServerUrl,
    ),
    CI: 'true',
    PAYLOAD_CONFIG_PATH: join(stageRoot, 'src', 'payload.config.ts'),
    WRANGLER_LOG_PATH: join(stageRoot, '.wrangler', 'wrangler.log'),
  }
  if (transport === 'hyperdrive') {
    // OpenNext asks Wrangler for a local platform proxy even during deploy.
    // Give that emulator an inert loopback URI so the real Neon origin never
    // enters the build/deploy process. Wrangler uses the reviewed Hyperdrive
    // binding ID for the actual remote upload.
    environment[HYPERDRIVE_LOCAL_CONNECTION_STRING_ENV] =
      HYPERDRIVE_LOCAL_CONNECTION_STRING_SENTINEL
  }
  return environment
}

function isExcludedFromStage(sourceRoot: string, sourcePath: string): boolean {
  const relativePath = relative(sourceRoot, sourcePath)
  if (relativePath === '') return false

  const firstSegment = relativePath.split(/[\\/]/, 1)[0]
  const fileName = basename(sourcePath)
  return Boolean(
    (firstSegment && OMITTED_STAGE_NAMES.has(firstSegment))
      || firstSegment?.startsWith('.open-next.pending-')
      || firstSegment?.startsWith('.cloudflare-stage-')
      || fileName === '.env'
      || fileName.startsWith('.env.')
      || fileName === '.dev.vars'
      || fileName.startsWith('.dev.vars.'),
  )
}

export function copyProjectToSanitizedStage(
  sourceRoot: string,
  stageRoot: string,
  cloneDependencies = true,
): void {
  cpSync(sourceRoot, stageRoot, {
    recursive: true,
    filter: (sourcePath) => !isExcludedFromStage(sourceRoot, sourcePath),
  })

  const sourceModules = join(sourceRoot, 'node_modules')
  assert(existsSync(sourceModules), 'CMS node_modules is required for the staged Cloudflare build')
  if (cloneDependencies) {
    cpSync(sourceModules, join(stageRoot, 'node_modules'), {
      recursive: true,
      mode: constants.COPYFILE_FICLONE,
      verbatimSymlinks: true,
    })
  } else {
    symlinkSync(sourceModules, join(stageRoot, 'node_modules'), 'dir')
  }
}

function listArtifactFiles(root: string): readonly string[] {
  const files: string[] = []
  const pending = [root]
  const resolvedRoot = realpathSync(root)

  while (pending.length > 0) {
    const current = pending.pop()
    if (!current) continue
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = join(current, entry.name)
      if (entry.isSymbolicLink()) {
        const resolvedTarget = realpathSync(entryPath)
        const targetPath = relative(resolvedRoot, resolvedTarget)
        if (targetPath === '..' || targetPath.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)) {
          throw new Error('Cloudflare artifact contains a symlink outside the artifact; refusing an incomplete scan')
        }
        // OpenNext's pnpm server bundle legitimately contains internal links.
        // Their physical targets are also traversed from the artifact root.
        continue
      }
      if (entry.isDirectory()) pending.push(entryPath)
      else if (entry.isFile()) files.push(entryPath)
      else throw new Error('Cloudflare artifact contains an unsupported filesystem entry')
    }
  }

  return files.sort()
}

export function scanCloudflareArtifact(
  artifactDir: string,
  needles: readonly SecretNeedle[],
): readonly ArtifactFinding[] {
  if (!existsSync(artifactDir) || !lstatSync(artifactDir).isDirectory()) {
    throw new Error('Cloudflare artifact is missing; refusing to deploy')
  }

  const findings: ArtifactFinding[] = []
  for (const filePath of listArtifactFiles(artifactDir)) {
    const contents = readFileSync(filePath)
    const artifactPath = relative(artifactDir, filePath)

    for (const needle of needles) {
      if (needle.variants.some((variant) => contents.includes(variant))) {
        findings.push({ file: artifactPath, label: needle.label })
      }
    }

    const text = contents.toString('utf8')
    for (const feature of CREDENTIAL_FEATURES) {
      if (feature.pattern.test(text)) {
        findings.push({ file: artifactPath, label: feature.label })
      }
    }
  }

  return findings
}

export function assertCloudflareArtifactSafe(
  artifactDir: string,
  needles: readonly SecretNeedle[],
): void {
  const findings = scanCloudflareArtifact(artifactDir, needles)
  if (findings.length === 0) return

  const locations = [...new Set(findings.map((finding) => finding.file))]
  throw new Error(
    `Cloudflare artifact secret scan failed (${findings.length} finding(s) in ${locations.length} file(s)); values are intentionally redacted`,
  )
}

export function scanRetiredGitFirstRuntimeMarkers(
  artifactDir: string,
): readonly ArtifactFinding[] {
  if (!existsSync(artifactDir) || !lstatSync(artifactDir).isDirectory()) {
    throw new Error('Cloudflare artifact is missing; refusing to deploy')
  }

  const findings: ArtifactFinding[] = []
  const markers = RETIRED_GIT_FIRST_RUNTIME_MARKERS.map((marker, index) => ({
    bytes: Buffer.from(marker),
    label: `retired Git-first runtime marker ${index + 1}`,
  }))
  for (const filePath of listArtifactFiles(artifactDir)) {
    const contents = readFileSync(filePath)
    const artifactPath = relative(artifactDir, filePath)
    for (const marker of markers) {
      if (contents.includes(marker.bytes)) {
        findings.push({ file: artifactPath, label: marker.label })
      }
    }
  }
  return findings
}

export function assertRetiredGitFirstRuntimeExcluded(artifactDir: string): void {
  const findings = scanRetiredGitFirstRuntimeMarkers(artifactDir)
  if (findings.length === 0) return

  const locations = [...new Set(findings.map((finding) => finding.file))]
  throw new Error(
    `Cloudflare artifact contains retired Git-first route, UI, publisher, or environment markers (${findings.length} finding(s) in ${locations.length} file(s)); marker values are intentionally redacted`,
  )
}

export function assertUnusedNextOgRuntimeExcluded(artifactDir: string): void {
  const forbiddenMarkers = [
    Buffer.from('@vercel/og'),
    Buffer.from('resvg.wasm'),
    Buffer.from('ImageResponse'),
  ]
  const ogRuntimeFiles = listArtifactFiles(artifactDir).filter((filePath) => {
    const normalizedPath = filePath.split(/[\\/]/).join('/')
    if (normalizedPath.includes('/next/dist/compiled/@vercel/og/') || normalizedPath.includes('resvg.wasm')) {
      return true
    }
    const baseName = basename(filePath)
    if (baseName !== 'handler.mjs' && baseName !== 'handler.mjs.meta.json') return false
    const contents = readFileSync(filePath)
    return forbiddenMarkers.some((marker) => contents.includes(marker))
  })
  if (ogRuntimeFiles.length > 0) {
    throw new Error(
      `Cloudflare artifact contains ${ogRuntimeFiles.length} handler, metafile, or runtime file(s) referencing the disabled Next OG runtime; refusing an oversized deployment`,
    )
  }
}

export function assertCompiledEnvironmentEmpty(artifactDir: string): void {
  const nextEnvPath = join(artifactDir, 'cloudflare', 'next-env.mjs')
  if (!existsSync(nextEnvPath) || !lstatSync(nextEnvPath).isFile()) {
    throw new Error('OpenNext did not produce cloudflare/next-env.mjs')
  }
  if (readFileSync(nextEnvPath, 'utf8') !== CANONICAL_NEXT_ENV) {
    throw new Error(
      'OpenNext compiled environment is not the expected empty module; refusing to hide or deploy contamination',
    )
  }
}

function artifactNeedles(projectDir: string, sourceEnvironment: NodeJS.ProcessEnv): readonly SecretNeedle[] {
  return [
    ...collectLocalSecretNeedles(projectDir),
    ...collectProcessSecretNeedles(sourceEnvironment),
    {
      label: 'build-only PAYLOAD_SECRET sentinel',
      variants: needleVariants(BUILD_SECRET_SENTINEL),
    },
    {
      label: 'migration-only PAYLOAD_SECRET sentinel',
      variants: needleVariants(MIGRATION_SECRET_SENTINEL),
    },
    {
      label: 'deploy-only PAYLOAD_SECRET sentinel',
      variants: needleVariants(DEPLOY_SECRET_SENTINEL),
    },
    {
      label: 'PostgreSQL build-only URI sentinel',
      variants: needleVariants(POSTGRES_BUILD_URI_SENTINEL),
    },
    {
      label: 'Hyperdrive local-emulation URI sentinel',
      variants: needleVariants(HYPERDRIVE_LOCAL_CONNECTION_STRING_SENTINEL),
    },
  ]
}

export function checkCloudflareArtifact(
  projectDir: string,
  sourceEnvironment: NodeJS.ProcessEnv = process.env,
): void {
  assertCompiledEnvironmentEmpty(join(projectDir, '.open-next'))
  assertUnusedNextOgRuntimeExcluded(join(projectDir, '.open-next'))
  assertRetiredGitFirstRuntimeExcluded(join(projectDir, '.open-next'))
  assertCloudflareArtifactSafe(
    join(projectDir, '.open-next'),
    artifactNeedles(projectDir, sourceEnvironment),
  )
}

export function buildCloudflareArtifact(
  projectDir: string,
  openNextArguments: readonly string[],
  sourceEnvironment: NodeJS.ProcessEnv = process.env,
  databaseAdapter: 'd1' | 'postgres' = 'd1',
): void {
  const outputDir = join(projectDir, '.open-next')
  const pendingOutput = join(projectDir, `.open-next.pending-${process.pid}`)
  const needles = artifactNeedles(projectDir, sourceEnvironment)
  const cloudflareEnvironment = parseCloudflareBuildEnvironment(openNextArguments)

  // A previous artifact may already be contaminated. Never deploy or reuse it.
  rmSync(outputDir, { recursive: true, force: true })
  rmSync(pendingOutput, { recursive: true, force: true })

  const stage = createSanitizedStage(projectDir, false, true)
  try {
    const stageRoot = stage.root

    const openNextCli = join(
      stageRoot,
      'node_modules',
      '@opennextjs',
      'cloudflare',
      'dist',
      'cli',
      'index.js',
    )
    const result = spawnSync(
      process.execPath,
      [openNextCli, 'build', ...openNextArguments],
      {
        cwd: stageRoot,
        env: {
          ...(databaseAdapter === 'd1'
            ? createSanitizedBuildEnvironment(sourceEnvironment, cloudflareEnvironment)
            : createSanitizedPostgresBuildEnvironment(sourceEnvironment)),
          PAYLOAD_CONFIG_PATH: join(stageRoot, 'src', 'payload.config.ts'),
          WRANGLER_LOG_PATH: join(stageRoot, '.wrangler', 'wrangler.log'),
        },
        stdio: 'inherit',
      },
    )
    if (result.error) throw result.error
    if (result.status !== 0) {
      throw new Error(`Staged OpenNext build failed with exit code ${result.status ?? 'unknown'}`)
    }

    const stagedOutput = join(stageRoot, '.open-next')
    assertCompiledEnvironmentEmpty(stagedOutput)
    assertUnusedNextOgRuntimeExcluded(stagedOutput)
    assertRetiredGitFirstRuntimeExcluded(stagedOutput)
    assertCloudflareArtifactSafe(stagedOutput, needles)

    cpSync(stagedOutput, pendingOutput, {
      recursive: true,
      mode: constants.COPYFILE_FICLONE,
      verbatimSymlinks: true,
    })
    assertUnusedNextOgRuntimeExcluded(pendingOutput)
    assertRetiredGitFirstRuntimeExcluded(pendingOutput)
    assertCloudflareArtifactSafe(pendingOutput, needles)
    renameSync(pendingOutput, outputDir)
  } finally {
    rmSync(pendingOutput, { recursive: true, force: true })
    rmSync(stage.parent, { recursive: true, force: true })
  }
}

export function buildCloudflarePostgresArtifact(
  projectDir: string,
  sourceEnvironment: NodeJS.ProcessEnv = process.env,
): ProductionPostgresConfiguration {
  const configuration = assertProductionPostgresConfiguration(projectDir)
  assertHyperdriveCachingDisabledAttestation(configuration, sourceEnvironment)
  buildCloudflareArtifact(
    projectDir,
    ['--env=production', `--config=${configuration.configFileName}`],
    sourceEnvironment,
    'postgres',
  )
  return configuration
}

function stableStageParent(projectDir: string): string {
  const identity = createHash('sha256').update(resolve(projectDir)).digest('hex').slice(0, 16)
  return join(tmpdir(), `pseo-cms-cloudflare-${identity}`)
}

export function createSanitizedStage(
  projectDir: string,
  includeArtifact: boolean,
  cloneDependencies = false,
): {
  readonly parent: string
  readonly root: string
} {
  const parent = stableStageParent(projectDir)
  const root = join(parent, 'cms')
  try {
    mkdirSync(parent)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error('A sanitized Cloudflare operation is already running or left a stale staging directory')
    }
    throw error
  }
  try {
    mkdirSync(root)
    copyProjectToSanitizedStage(projectDir, root, cloneDependencies)
    mkdirSync(join(root, '.wrangler'))
    if (includeArtifact) {
      cpSync(join(projectDir, '.open-next'), join(root, '.open-next'), {
        recursive: true,
        mode: constants.COPYFILE_FICLONE,
        verbatimSymlinks: true,
      })
    }
  } catch (error) {
    rmSync(parent, { recursive: true, force: true })
    throw error
  }
  return { parent, root }
}

function runNodeCli(
  cliPath: string,
  arguments_: readonly string[],
  cwd: string,
  environment: NodeJS.ProcessEnv,
  description: string,
): void {
  const result = spawnSync(process.execPath, [cliPath, ...arguments_], {
    cwd,
    env: environment,
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${description} failed with exit code ${result.status ?? 'unknown'}`)
  }
}

export function dryRunCloudflareDeploy(
  projectDir: string,
  sourceEnvironment: NodeJS.ProcessEnv = process.env,
): void {
  assertProductionD1Configuration(projectDir)
  checkCloudflareArtifact(projectDir, sourceEnvironment)
  assertCompiledEnvironmentEmpty(join(projectDir, '.open-next'))
  const stage = createSanitizedStage(projectDir, true)
  try {
    const dryRunOutput = join(stage.root, '.wrangler', 'dry-run')
    const environment = {
      ...createSanitizedProductionEnvironment(sourceEnvironment, DEPLOY_SECRET_SENTINEL),
      PAYLOAD_CONFIG_PATH: join(stage.root, 'src', 'payload.config.ts'),
      WRANGLER_LOG_PATH: join(stage.root, '.wrangler', 'wrangler.log'),
    }
    runNodeCli(
      join(stage.root, 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
      ['deploy', '--env=production', '--dry-run', `--outdir=${dryRunOutput}`],
      stage.root,
      environment,
      'Sanitized Wrangler deploy dry-run',
    )
    assertCloudflareArtifactSafe(
      dryRunOutput,
      artifactNeedles(projectDir, sourceEnvironment),
    )
    assertRetiredGitFirstRuntimeExcluded(dryRunOutput)
  } finally {
    rmSync(stage.parent, { recursive: true, force: true })
  }
}

export function dryRunCloudflarePostgresDeploy(
  projectDir: string,
  sourceEnvironment: NodeJS.ProcessEnv = process.env,
): ProductionPostgresConfiguration {
  const configuration = assertProductionPostgresConfiguration(projectDir)
  assertHyperdriveCachingDisabledAttestation(configuration, sourceEnvironment)
  if (configuration.transport === 'direct') {
    assertDirectPostgresRuntimeSecretReady(sourceEnvironment)
  }
  checkCloudflareArtifact(projectDir, sourceEnvironment)
  assertCompiledEnvironmentEmpty(join(projectDir, '.open-next'))
  const stage = createSanitizedStage(projectDir, true)
  try {
    const dryRunOutput = join(stage.root, '.wrangler', 'dry-run')
    const environment = {
      ...createSanitizedPostgresProductionEnvironment(
        sourceEnvironment,
        DEPLOY_SECRET_SENTINEL,
        configuration.transport,
        configuration.publicServerUrl,
      ),
      PAYLOAD_CONFIG_PATH: join(stage.root, 'src', 'payload.config.ts'),
      WRANGLER_LOG_PATH: join(stage.root, '.wrangler', 'wrangler.log'),
    }
    runNodeCli(
      join(stage.root, 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
      [
        'deploy',
        '--env=production',
        `--config=${configuration.configFileName}`,
        '--dry-run',
        `--outdir=${dryRunOutput}`,
      ],
      stage.root,
      environment,
      'Sanitized Wrangler PostgreSQL deploy dry-run',
    )
    assertCloudflareArtifactSafe(
      dryRunOutput,
      artifactNeedles(projectDir, sourceEnvironment),
    )
    assertRetiredGitFirstRuntimeExcluded(dryRunOutput)
  } finally {
    rmSync(stage.parent, { recursive: true, force: true })
  }
  return configuration
}

export function migrateCloudflareProduction(
  projectDir: string,
  sourceEnvironment: NodeJS.ProcessEnv = process.env,
): void {
  assertSafeMigrationSourceEnvironment(sourceEnvironment)
  assertProductionD1Configuration(projectDir)
  const stage = createSanitizedStage(projectDir, false)
  try {
    const environment: NodeJS.ProcessEnv = {
      ...createSanitizedProductionEnvironment(sourceEnvironment, MIGRATION_SECRET_SENTINEL),
      PAYLOAD_CONFIG_PATH: join(stage.root, 'src', 'payload.config.ts'),
      WRANGLER_LOG_PATH: join(stage.root, '.wrangler', 'wrangler.log'),
    }
    assert.equal(environment.CMS_DATABASE_ADAPTER, 'd1')
    assert.equal(environment.CLOUDFLARE_ENV, 'production')
    assert.equal(environment.NODE_ENV, 'production')
    assert.equal(environment.CMS_CLOUDFLARE_EPHEMERAL_D1, undefined)
    assert.equal(environment.DATABASE_URI, undefined)

    runNodeCli(
      join(stage.root, 'node_modules', 'payload', 'bin.js'),
      ['migrate'],
      stage.root,
      environment,
      'Sanitized Payload production migration',
    )
    runNodeCli(
      join(stage.root, 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
      ['d1', 'execute', 'D1', '--command', 'PRAGMA optimize', '--env=production', '--remote'],
      stage.root,
      environment,
      'Production D1 optimization',
    )
  } finally {
    rmSync(stage.parent, { recursive: true, force: true })
  }
}

export function migrateCloudflarePostgresProduction(
  projectDir: string,
  sourceEnvironment: NodeJS.ProcessEnv = process.env,
): ProductionPostgresConfiguration {
  assertSafeMigrationSourceEnvironment(sourceEnvironment)
  const configuration = assertProductionPostgresConfiguration(projectDir)
  const stage = createSanitizedStage(projectDir, false)
  try {
    const environment: NodeJS.ProcessEnv = {
      ...createSanitizedPostgresMigrationEnvironment(
        sourceEnvironment,
        configuration.publicServerUrl,
      ),
      PAYLOAD_CONFIG_PATH: join(stage.root, 'src', 'payload.config.ts'),
    }
    assert.equal(environment.CMS_DATABASE_ADAPTER, 'postgres')
    assert.equal(environment.CMS_POSTGRES_TRANSPORT, 'direct')
    assert.equal(environment.CMS_DEPLOYMENT_ENV, 'production')
    assert.equal(environment.CMS_CLOUDFLARE_EPHEMERAL_D1, undefined)
    runNodeCli(
      join(stage.root, 'node_modules', 'payload', 'bin.js'),
      ['migrate'],
      stage.root,
      environment,
      'Sanitized Payload PostgreSQL production migration',
    )
  } finally {
    rmSync(stage.parent, { recursive: true, force: true })
  }
  return configuration
}

export function deployCloudflareArtifact(
  projectDir: string,
  openNextArguments: readonly string[],
  sourceEnvironment: NodeJS.ProcessEnv = process.env,
): void {
  const deployArguments = normalizeProductionDeployArguments(openNextArguments)
  assertProductionD1Configuration(projectDir)
  checkCloudflareArtifact(projectDir, sourceEnvironment)
  assertCompiledEnvironmentEmpty(join(projectDir, '.open-next'))
  // Clone dependencies for the OpenNext deploy path. Its internal `pnpm exec`
  // may reconcile node_modules in CI mode, so a source-checkout symlink would
  // create an unacceptable mutation boundary.
  const stage = createSanitizedStage(projectDir, true, true)
  try {
    const stagedOutput = join(stage.root, '.open-next')
    assertCompiledEnvironmentEmpty(stagedOutput)
    assertRetiredGitFirstRuntimeExcluded(stagedOutput)
    assertCloudflareArtifactSafe(stagedOutput, artifactNeedles(projectDir, sourceEnvironment))
    runNodeCli(
      join(
        stage.root,
        'node_modules',
        '@opennextjs',
        'cloudflare',
        'dist',
        'cli',
        'index.js',
      ),
      ['deploy', ...deployArguments],
      stage.root,
      createSanitizedDeployEnvironment(sourceEnvironment, stage.root),
      'Sanitized OpenNext production deploy',
    )
  } finally {
    rmSync(stage.parent, { recursive: true, force: true })
  }
}

export function deployCloudflarePostgresArtifact(
  projectDir: string,
  sourceEnvironment: NodeJS.ProcessEnv = process.env,
): ProductionPostgresConfiguration {
  const configuration = assertProductionPostgresConfiguration(projectDir)
  assertHyperdriveCachingDisabledAttestation(configuration, sourceEnvironment)
  assertPostgresRuntimeBindingsReady(sourceEnvironment)
  if (configuration.transport === 'direct') {
    assertDirectPostgresRuntimeSecretReady(sourceEnvironment)
  }
  checkCloudflareArtifact(projectDir, sourceEnvironment)
  assertCompiledEnvironmentEmpty(join(projectDir, '.open-next'))
  const stage = createSanitizedStage(projectDir, true, true)
  try {
    // Re-read the control-plane state immediately before the production write.
    // Hyperdrive enables query caching by default and does not invalidate
    // cached auth/rights reads after writes, so an attestation alone is not
    // sufficient evidence for this Payload database binding.
    verifyHyperdriveCachingDisabledControlPlane(
      stage.root,
      configuration,
      sourceEnvironment,
    )
    const stagedOutput = join(stage.root, '.open-next')
    assertCompiledEnvironmentEmpty(stagedOutput)
    assertRetiredGitFirstRuntimeExcluded(stagedOutput)
    assertCloudflareArtifactSafe(stagedOutput, artifactNeedles(projectDir, sourceEnvironment))
    runNodeCli(
      join(
        stage.root,
        'node_modules',
        '@opennextjs',
        'cloudflare',
        'dist',
        'cli',
        'index.js',
      ),
      [
        'deploy',
        '--env=production',
        `--config=${configuration.configFileName}`,
      ],
      stage.root,
      createSanitizedPostgresDeployEnvironment(
        sourceEnvironment,
        stage.root,
        configuration.transport,
        configuration.publicServerUrl,
      ),
      'Sanitized OpenNext PostgreSQL production deploy',
    )
  } finally {
    rmSync(stage.parent, { recursive: true, force: true })
  }
  return configuration
}

async function main(): Promise<void> {
  const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const [command, ...arguments_] = process.argv.slice(2)

  if (command === 'build') {
    buildCloudflareArtifact(projectDir, arguments_)
    process.stdout.write('Cloudflare artifact built in an env-file-free staging directory and passed the redacted secret scan.\n')
    return
  }
  if (command === 'check') {
    checkCloudflareArtifact(projectDir)
    process.stdout.write('Cloudflare artifact passed the pre-deploy redacted secret scan.\n')
    return
  }
  if (command === 'dry-run') {
    dryRunCloudflareDeploy(projectDir)
    process.stdout.write('Sanitized Cloudflare deploy dry-run passed its redacted secret scan.\n')
    return
  }
  if (command === 'migrate') {
    migrateCloudflareProduction(projectDir)
    process.stdout.write('Sanitized production D1 migration completed.\n')
    return
  }
  if (command === 'deploy') {
    deployCloudflareArtifact(projectDir, arguments_)
    return
  }
  if (command === 'preflight-postgres') {
    if (arguments_.length > 0) throw new Error('PostgreSQL preflight accepts no passthrough arguments')
    const configuration = assertProductionPostgresConfiguration(projectDir)
    const stage = createSanitizedStage(projectDir, false)
    try {
      verifyHyperdriveCachingDisabledControlPlane(
        stage.root,
        configuration,
        process.env,
      )
    } finally {
      rmSync(stage.parent, { recursive: true, force: true })
    }
    process.stdout.write(
      `Cloudflare PostgreSQL preflight passed for ${configuration.transport} transport, including required cache-state verification; no deployment was performed.\n`,
    )
    return
  }
  if (command === 'build-postgres') {
    if (arguments_.length > 0) throw new Error('PostgreSQL build accepts no passthrough arguments')
    buildCloudflarePostgresArtifact(projectDir)
    process.stdout.write(
      'Cloudflare PostgreSQL artifact built in an env-file-free staging directory and passed the redacted secret scan.\n',
    )
    return
  }
  if (command === 'dry-run-postgres') {
    if (arguments_.length > 0) throw new Error('PostgreSQL deploy dry-run accepts no passthrough arguments')
    dryRunCloudflarePostgresDeploy(projectDir)
    process.stdout.write('Sanitized Cloudflare PostgreSQL deploy dry-run passed.\n')
    return
  }
  if (command === 'migrate-postgres') {
    if (arguments_.length > 0) throw new Error('PostgreSQL migration accepts no passthrough arguments')
    migrateCloudflarePostgresProduction(projectDir)
    process.stdout.write('Sanitized production PostgreSQL migration completed.\n')
    return
  }
  if (command === 'deploy-postgres') {
    if (arguments_.length > 0) throw new Error('PostgreSQL deploy accepts no passthrough arguments')
    deployCloudflarePostgresArtifact(projectDir)
    return
  }
  throw new Error(
    'Usage: cloudflare-artifact.ts <build [OpenNext arguments...] | check | dry-run | migrate | deploy [OpenNext arguments...] | preflight-postgres | build-postgres | dry-run-postgres | migrate-postgres | deploy-postgres>',
  )
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await main()
}
