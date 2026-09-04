import assert from 'node:assert/strict'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
  BUILD_SECRET_SENTINEL,
  HYPERDRIVE_LOCAL_CONNECTION_STRING_ENV,
  HYPERDRIVE_LOCAL_CONNECTION_STRING_SENTINEL,
  HYPERDRIVE_CACHE_DISABLED_ATTESTATION,
  MIGRATION_SECRET_SENTINEL,
  POSTGRES_BUILD_URI_SENTINEL,
  POSTGRES_WRANGLER_CONFIG,
  assertCloudflarePostgresDriverCompatibility,
  assertCloudflareArtifactSafe,
  assertCompiledEnvironmentEmpty,
  assertDirectPostgresRuntimeSecretReady,
  assertHyperdriveCachingDisabledAttestation,
  assertHyperdriveCachingDisabledControlPlaneResponse,
  assertPostgresRuntimeBindingsReady,
  assertProductionPostgresConfiguration,
  assertRemotePostgresMigrationUri,
  assertRetiredGitFirstRuntimeExcluded,
  assertUnusedNextOgRuntimeExcluded,
  assertSafeMigrationSourceEnvironment,
  assertProductionD1Configuration,
  collectLocalSecretNeedles,
  collectProcessSecretNeedles,
  checkCloudflareArtifact,
  buildCloudflarePostgresArtifact,
  copyProjectToSanitizedStage,
  createSanitizedBuildEnvironment,
  createSanitizedDeployEnvironment,
  createSanitizedPostgresBuildEnvironment,
  createSanitizedPostgresDeployEnvironment,
  createSanitizedPostgresMigrationEnvironment,
  createSanitizedPostgresProductionEnvironment,
  createSanitizedProductionEnvironment,
  createSanitizedStage,
  deployCloudflarePostgresArtifact,
  dryRunCloudflarePostgresDeploy,
  parseDotEnv,
  parseCloudflareBuildEnvironment,
  normalizeProductionDeployArguments,
  scanCloudflareArtifact,
  scanRetiredGitFirstRuntimeMarkers,
  verifyHyperdriveCachingDisabledControlPlane,
  type ProductionPostgresConfiguration,
} from '../scripts/cloudflare-artifact.ts'

function withTempDirectory(run: (directory: string) => void): void {
  const directory = mkdtempSync(join(tmpdir(), 'cms-cloudflare-artifact-test-'))
  try {
    run(directory)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

const cmsRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function writePgLock(projectDir: string, version = '8.20.0'): void {
  writeFileSync(join(projectDir, 'pnpm-lock.yaml'), `lockfileVersion: '9.0'\n\npackages:\n\n  pg@${version}:\n`)
}

function productionPostgresConfig(
  transport: 'direct' | 'hyperdrive' = 'hyperdrive',
): Record<string, unknown> {
  return {
    compatibility_flags: ['nodejs_compat', 'global_fetch_strictly_public'],
    env: {
      production: {
        placement: { mode: 'smart' },
        vars: {
          CMS_DATABASE_ADAPTER: 'postgres',
          CMS_POSTGRES_TRANSPORT: transport,
          CMS_DEPLOYMENT_ENV: 'production',
          CMS_PREVIEW_ENABLED: 'false',
          CMS_PUBLIC_SNAPSHOT_ENABLED: 'true',
          PAYLOAD_PUBLIC_SERVER_URL: 'https://cms.example.com',
        },
        ...(transport === 'hyperdrive'
          ? {
              hyperdrive: [{
                binding: 'HYPERDRIVE',
                id: '57b7076f58be42419276f058a8968187',
              }],
            }
          : {}),
      },
    },
  }
}

test('Payload disables dynamic OG images and both bundlers alias the exact endpoint to a stub', async () => {
  const config = readFileSync(join(cmsRoot, 'next.config.mjs'), 'utf8')
  const payloadConfig = readFileSync(join(cmsRoot, 'src', 'payload.config.ts'), 'utf8')

  assert.match(payloadConfig, /defaultOGImageType:\s*'off'/)
  assert.match(config, /createRequire\(import\.meta\.url\)/)
  assert.match(config, /require\.resolve\('@payloadcms\/next\/routes'\)/)
  assert.match(config, /routes\/rest\/og\/index\.js/)
  assert.match(config, /turbopack:\s*\{[\s\S]*?resolveAlias: runtimeAliases/)
  assert.match(config, /webpackConfig\.resolve\.alias\s*=\s*\{[\s\S]*?\.\.\.runtimeAliases/)
  assert.doesNotMatch(config, /outputFileTracingExcludes/)

  const configModule = await import(
    `${pathToFileURL(join(cmsRoot, 'next.config.mjs')).href}?alias-regression`
  )
  const developmentAliases = configModule.createRuntimeAliases({
    NODE_ENV: 'development',
    CMS_DATABASE_ADAPTER: 'd1',
  })
  const productionD1Aliases = configModule.createRuntimeAliases({
    NODE_ENV: 'production',
    CMS_DATABASE_ADAPTER: 'd1',
  })
  assert.equal(developmentAliases['drizzle-kit/api'], undefined)
  assert.equal(typeof productionD1Aliases['drizzle-kit/api'], 'string')
  assert.equal(
    Object.keys(developmentAliases).some((key) => key.endsWith('/routes/rest/og/index.js')),
    true,
  )

  const stub = await import(pathToFileURL(join(cmsRoot, 'stubs', 'payload-og-endpoint.js')).href)
  assert.equal(stub.runtime, 'nodejs')
  assert.equal(stub.contentType, 'image/png')
  const response = await stub.generateOGImage()
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: 'Open Graph images are disabled' })
})

test('dotenv parsing supports export, comments, quotes, and escaped newlines', () => {
  const parsed = parseDotEnv([
    'export PAYLOAD_SECRET="secret\\nline"',
    "CMS_GITHUB_TOKEN='github-token' # comment",
    'DATABASE_URI=postgres://user:pass@example.invalid/db',
    'EMPTY=',
  ].join('\n'))

  assert.equal(parsed.get('PAYLOAD_SECRET'), 'secret\nline')
  assert.equal(parsed.get('CMS_GITHUB_TOKEN'), 'github-token')
  assert.equal(parsed.get('DATABASE_URI'), 'postgres://user:pass@example.invalid/db')
  assert.equal(parsed.get('EMPTY'), '')
})

test('local secret needles cover all env modes but exclude examples and non-sensitive values', () => {
  withTempDirectory((projectDir) => {
    writeFileSync(join(projectDir, '.env'), [
      'PAYLOAD_SECRET=payload-secret-value-that-is-private',
      'PAYLOAD_PUBLIC_SERVER_URL=https://public.example',
      'EMPTY_TOKEN=',
    ].join('\n'))
    writeFileSync(join(projectDir, '.env.development'), 'CMS_GITHUB_TOKEN=ignored-development-token\n')
    writeFileSync(join(projectDir, '.dev.vars.preview'), 'CMS_PREVIEW_TOKEN=preview-secret-value\n')
    writeFileSync(join(projectDir, '.env.example'), 'CMS_GITHUB_TOKEN=example-secret-value\n')

    const needles = collectLocalSecretNeedles(projectDir)

    assert.equal(needles.length, 3)
    assert.ok(needles.some((needle) => /PAYLOAD_SECRET/.test(needle.label)))
    assert.ok(needles.some((needle) => /.env.development:CMS_GITHUB_TOKEN/.test(needle.label)))
    assert.ok(needles.some((needle) => /.dev.vars.preview:CMS_PREVIEW_TOKEN/.test(needle.label)))
    assert.ok(needles.every((needle) => !/.env.example/.test(needle.label)))
  })
})

test('sanitized build environment removes credentials and installs a fixed build-only sentinel', () => {
  const environment = createSanitizedBuildEnvironment({
    PATH: '/bin',
    NODE_ENV: 'development',
    DATABASE_URI: 'postgres://user:password@example.invalid/db',
    CMS_GITHUB_TOKEN: 'github-token-value',
    CMS_PREVIEW_TOKEN: 'preview-token-value',
    CLOUDFLARE_API_TOKEN: 'cloudflare-token-value',
    NODE_OPTIONS: '--require unsafe-helper',
    NODE_PATH: '/unsafe/modules',
    UNRELATED_BUILD_SETTING: 'not-allowlisted',
  })

  assert.equal(environment.PATH, '/bin')
  assert.equal(environment.DATABASE_URI, undefined)
  assert.equal(environment.CMS_GITHUB_TOKEN, undefined)
  assert.equal(environment.CMS_PREVIEW_TOKEN, undefined)
  assert.equal(environment.CLOUDFLARE_API_TOKEN, undefined)
  assert.equal(environment.NODE_OPTIONS, undefined)
  assert.equal(environment.NODE_PATH, undefined)
  assert.equal(environment.UNRELATED_BUILD_SETTING, undefined)
  assert.equal(environment.PAYLOAD_SECRET, BUILD_SECRET_SENTINEL)
  assert.equal(environment.CMS_DATABASE_ADAPTER, 'd1')
  assert.equal(environment.NODE_ENV, 'production')
  assert.equal(environment.CLOUDFLARE_ENV, undefined)
  assert.equal(environment.CMS_DEPLOYMENT_ENV, 'local')

  const production = createSanitizedBuildEnvironment({ NODE_ENV: 'development' }, 'production')
  assert.equal(production.CLOUDFLARE_ENV, 'production')
  assert.equal(production.CMS_DEPLOYMENT_ENV, 'production')
})

test('Cloudflare build environment parsing accepts only absent or one production value', () => {
  assert.equal(parseCloudflareBuildEnvironment([]), undefined)
  assert.equal(parseCloudflareBuildEnvironment(['--env=production']), 'production')
  assert.equal(parseCloudflareBuildEnvironment(['--env', 'production']), 'production')
  assert.throws(() => parseCloudflareBuildEnvironment(['--env=staging']), /only --env=production/)
  assert.throws(
    () => parseCloudflareBuildEnvironment(['--env=production', '--env', 'production']),
    /at most once/,
  )
})

test('production deploy accepts only one explicit production environment argument', () => {
  assert.deepEqual(normalizeProductionDeployArguments(['--env=production']), ['--env=production'])
  assert.deepEqual(normalizeProductionDeployArguments(['--env', 'production']), ['--env=production'])

  for (const arguments_ of [
    [],
    ['--env=local'],
    ['--env', 'staging'],
    ['--env=production', '--env=production'],
    ['-e', 'production'],
    ['--config', 'other.jsonc', '--env=production'],
    ['-c', 'other.jsonc', '--env=production'],
    ['--configPath=other.jsonc', '--env=production'],
    ['--env=production', '--dry-run'],
  ]) {
    assert.throws(
      () => normalizeProductionDeployArguments(arguments_),
      /requires exactly --env=production/,
    )
  }
})

test('production deploy environment forces non-interactive CI without widening env access', () => {
  const environment = createSanitizedDeployEnvironment({
    NODE_ENV: 'development',
    CI: 'false',
    DATABASE_URI: 'postgres://user:password@example.invalid/db',
    CMS_GITHUB_TOKEN: 'application-token',
    NODE_OPTIONS: '--require unsafe-helper',
    CLOUDFLARE_API_TOKEN: 'control-plane-token',
  }, '/isolated/cms')

  assert.equal(environment.CI, 'true')
  assert.equal(environment.DATABASE_URI, undefined)
  assert.equal(environment.CMS_GITHUB_TOKEN, undefined)
  assert.equal(environment.NODE_OPTIONS, undefined)
  assert.equal(environment.CLOUDFLARE_API_TOKEN, 'control-plane-token')
  assert.equal(environment.PAYLOAD_CONFIG_PATH, '/isolated/cms/src/payload.config.ts')
  assert.equal(environment.WRANGLER_LOG_PATH, '/isolated/cms/.wrangler/wrangler.log')
})

test('production migration environment is D1-only and rejects dangerous caller overrides', () => {
  assert.throws(
    () => assertSafeMigrationSourceEnvironment({
      NODE_ENV: 'production',
      PAYLOAD_DROP_DATABASE: 'true',
    }),
    /PAYLOAD_DROP_DATABASE/,
  )
  assert.throws(
    () => assertSafeMigrationSourceEnvironment({
      NODE_ENV: 'production',
      CMS_CLOUDFLARE_EPHEMERAL_D1: 'false',
    }),
    /CMS_CLOUDFLARE_EPHEMERAL_D1/,
  )

  const environment = createSanitizedProductionEnvironment({
    NODE_ENV: 'development',
    DATABASE_URI: 'postgres://user:password@example.invalid/db',
    CMS_GITHUB_TOKEN: 'application-token',
    CMS_PREVIEW_TOKEN: 'preview-token',
    CMS_CLOUDFLARE_EPHEMERAL_D1: 'true',
    PAYLOAD_DROP_DATABASE: 'true',
    CLOUDFLARE_API_TOKEN: 'control-plane-token',
  }, MIGRATION_SECRET_SENTINEL)

  assert.equal(environment.DATABASE_URI, undefined)
  assert.equal(environment.CMS_GITHUB_TOKEN, undefined)
  assert.equal(environment.CMS_PREVIEW_TOKEN, undefined)
  assert.equal(environment.CMS_CLOUDFLARE_EPHEMERAL_D1, undefined)
  assert.equal(environment.PAYLOAD_DROP_DATABASE, undefined)
  assert.equal(environment.CLOUDFLARE_API_TOKEN, 'control-plane-token')
  assert.equal(environment.PAYLOAD_SECRET, MIGRATION_SECRET_SENTINEL)
  assert.equal(environment.CMS_DATABASE_ADAPTER, 'd1')
  assert.equal(environment.CMS_DEPLOYMENT_ENV, 'production')
  assert.equal(environment.CLOUDFLARE_ENV, 'production')
})

test('production D1 preflight requires one remote non-zero UUID binding', () => {
  withTempDirectory((projectDir) => {
    const writeConfig = (d1Databases: unknown[]): void => {
      writeFileSync(join(projectDir, 'wrangler.jsonc'), JSON.stringify({
        env: { production: { d1_databases: d1Databases } },
      }))
    }

    writeConfig([{
      binding: 'D1',
      database_id: 'aeec1c88-bc9c-4d6e-a4c2-9f8bda4f7a7b',
      remote: true,
    }])
    assert.doesNotThrow(() => assertProductionD1Configuration(projectDir))

    writeConfig([{
      binding: 'D1',
      database_id: '00000000-0000-0000-0000-000000000000',
      remote: true,
    }])
    assert.throws(() => assertProductionD1Configuration(projectDir), /non-zero UUID/)

    writeConfig([{
      binding: 'D1',
      database_id: 'aeec1c88-bc9c-4d6e-a4c2-9f8bda4f7a7b',
      remote: false,
    }])
    assert.throws(() => assertProductionD1Configuration(projectDir), /must be remote/)
  })
})

test('PostgreSQL production preflight requires an explicit isolated transport and compatible pg', () => {
  withTempDirectory((projectDir) => {
    writePgLock(projectDir)
    const writeConfig = (config: unknown): void => {
      writeFileSync(join(projectDir, POSTGRES_WRANGLER_CONFIG), JSON.stringify(config))
    }

    writeConfig(productionPostgresConfig())
    assert.deepEqual(assertProductionPostgresConfiguration(projectDir), {
      configFileName: POSTGRES_WRANGLER_CONFIG,
      hyperdriveId: '57b7076f58be42419276f058a8968187',
      publicServerUrl: 'https://cms.example.com',
      transport: 'hyperdrive',
    })
    assert.equal(assertCloudflarePostgresDriverCompatibility(projectDir), '8.20.0')

    const placeholder = productionPostgresConfig() as {
      env: { production: { hyperdrive: Array<{ id: string }> } }
    }
    placeholder.env.production.hyperdrive[0]!.id = 'REPLACE_WITH_CLOUDFLARE_HYPERDRIVE_ID'
    writeConfig(placeholder)
    assert.throws(
      () => assertProductionPostgresConfiguration(projectDir),
      /real 32-character hexadecimal ID/,
    )

    const hyphenatedUuid = productionPostgresConfig() as {
      env: { production: { hyperdrive: Array<{ id: string }> } }
    }
    hyphenatedUuid.env.production.hyperdrive[0]!.id =
      '11111111-1111-4111-8111-111111111111'
    writeConfig(hyphenatedUuid)
    assert.throws(
      () => assertProductionPostgresConfiguration(projectDir),
      /real 32-character hexadecimal ID/,
    )

    const zeroId = productionPostgresConfig() as {
      env: { production: { hyperdrive: Array<{ id: string }> } }
    }
    zeroId.env.production.hyperdrive[0]!.id = '00000000000000000000000000000000'
    writeConfig(zeroId)
    assert.throws(
      () => assertProductionPostgresConfiguration(projectDir),
      /real 32-character hexadecimal ID/,
    )

    const withInlineConnection = productionPostgresConfig() as {
      env: { production: { hyperdrive: Array<Record<string, string>> } }
    }
    withInlineConnection.env.production.hyperdrive[0]!.localConnectionString =
      'postgres://user:password@example.com/db'
    writeConfig(withInlineConnection)
    assert.throws(
      () => assertProductionPostgresConfiguration(projectDir),
      /no inline connection string/,
    )

    const mixedD1 = productionPostgresConfig() as {
      env: { production: Record<string, unknown> }
    }
    mixedD1.env.production.d1_databases = [{ binding: 'D1' }]
    writeConfig(mixedD1)
    assert.throws(
      () => assertProductionPostgresConfiguration(projectDir),
      /cannot include a D1 binding/,
    )

    const plaintextUri = productionPostgresConfig() as {
      env: { production: { vars: Record<string, string> } }
    }
    plaintextUri.env.production.vars.DATABASE_URI =
      'postgres://user:password@example.com/db'
    writeConfig(plaintextUri)
    assert.throws(
      () => assertProductionPostgresConfiguration(projectDir),
      /only the reviewed non-secret key set/,
    )

    const plaintextToken = productionPostgresConfig() as {
      env: { production: { vars: Record<string, string> } }
    }
    plaintextToken.env.production.vars.CMS_PUBLIC_SNAPSHOT_TOKEN =
      'not-allowed-in-plaintext-wrangler-vars'
    writeConfig(plaintextToken)
    assert.throws(
      () => assertProductionPostgresConfiguration(projectDir),
      /only the reviewed non-secret key set/,
    )

    const insecureOrigin = productionPostgresConfig() as {
      env: { production: { vars: Record<string, string> } }
    }
    insecureOrigin.env.production.vars.PAYLOAD_PUBLIC_SERVER_URL =
      'http://cms.example.com'
    writeConfig(insecureOrigin)
    assert.throws(
      () => assertProductionPostgresConfiguration(projectDir),
      /HTTPS PAYLOAD_PUBLIC_SERVER_URL/,
    )

    writeConfig(productionPostgresConfig('direct'))
    assert.deepEqual(assertProductionPostgresConfiguration(projectDir, 'direct'), {
      configFileName: POSTGRES_WRANGLER_CONFIG,
      hyperdriveId: null,
      publicServerUrl: 'https://cms.example.com',
      transport: 'direct',
    })

    writePgLock(projectDir, '8.16.2')
    assert.throws(
      () => assertProductionPostgresConfiguration(projectDir),
      /pg 8\.16\.3 or newer/,
    )
  })
})

test('Hyperdrive cache-disabled attestation is bound to the exact configuration ID', () => {
  const hyperdrive: ProductionPostgresConfiguration = {
    configFileName: POSTGRES_WRANGLER_CONFIG,
    hyperdriveId: '57b7076f58be42419276f058a8968187',
    publicServerUrl: 'https://cms.example.com',
    transport: 'hyperdrive',
  }
  assert.throws(
    () => assertHyperdriveCachingDisabledAttestation(
      hyperdrive,
      {} as unknown as NodeJS.ProcessEnv,
    ),
    new RegExp(HYPERDRIVE_CACHE_DISABLED_ATTESTATION),
  )
  assert.throws(
    () => assertHyperdriveCachingDisabledAttestation(
      hyperdrive,
      {
        [HYPERDRIVE_CACHE_DISABLED_ATTESTATION]: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      } as unknown as NodeJS.ProcessEnv,
    ),
    /equal the reviewed cache-disabled Hyperdrive ID/,
  )
  assert.doesNotThrow(() => assertHyperdriveCachingDisabledAttestation(
    hyperdrive,
    {
      [HYPERDRIVE_CACHE_DISABLED_ATTESTATION]: hyperdrive.hyperdriveId ?? '',
    } as unknown as NodeJS.ProcessEnv,
  ))

  const direct: ProductionPostgresConfiguration = {
    ...hyperdrive,
    hyperdriveId: null,
    transport: 'direct',
  }
  assert.doesNotThrow(() => assertHyperdriveCachingDisabledAttestation(
    direct,
    {} as unknown as NodeJS.ProcessEnv,
  ))
  assert.deepEqual(
    collectProcessSecretNeedles({
      [HYPERDRIVE_CACHE_DISABLED_ATTESTATION]: hyperdrive.hyperdriveId ?? '',
    } as unknown as NodeJS.ProcessEnv),
    [],
  )
})

test('every offline Hyperdrive production path fails closed before work without attestation', () => {
  withTempDirectory((projectDir) => {
    writePgLock(projectDir)
    writeFileSync(
      join(projectDir, POSTGRES_WRANGLER_CONFIG),
      JSON.stringify(productionPostgresConfig()),
    )
    const environment = {} as unknown as NodeJS.ProcessEnv
    for (const operation of [
      buildCloudflarePostgresArtifact,
      dryRunCloudflarePostgresDeploy,
      deployCloudflarePostgresArtifact,
    ]) {
      assert.throws(
        () => operation(projectDir, environment),
        new RegExp(HYPERDRIVE_CACHE_DISABLED_ATTESTATION),
      )
    }
  })
})

test('Hyperdrive control-plane response requires the exact ID and disabled caching', () => {
  const id = '57b7076f58be42419276f058a8968187'
  assert.doesNotThrow(() => assertHyperdriveCachingDisabledControlPlaneResponse(
    JSON.stringify({ id, caching: { disabled: true } }),
    id,
  ))
  assert.doesNotThrow(() => assertHyperdriveCachingDisabledControlPlaneResponse(
    [
      '',
      '\u2601\ufe0f wrangler 4.116.0',
      '--------------------',
      JSON.stringify({ id, caching: { disabled: true } }, null, 2),
      '',
    ].join('\n'),
    id,
  ))
  for (const response of [
    JSON.stringify({ id, caching: { disabled: false, max_age: 60 } }),
    JSON.stringify({ id, caching: {} }),
    JSON.stringify({ id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', caching: { disabled: true } }),
    JSON.stringify({ id }),
    ['wrangler banner', JSON.stringify({ id, caching: { disabled: true } }), 'trailing output'].join('\n'),
    'not-json',
    '',
  ]) {
    assert.throws(
      () => assertHyperdriveCachingDisabledControlPlaneResponse(response, id),
      /Hyperdrive/u,
    )
  }
})

test('Hyperdrive control-plane check uses captured output and never reflects diagnostics', () => {
  withTempDirectory((projectDir) => {
    const wranglerBin = join(projectDir, 'node_modules', 'wrangler', 'bin')
    mkdirSync(wranglerBin, { recursive: true })
    mkdirSync(join(projectDir, '.wrangler'))
    writeFileSync(join(projectDir, POSTGRES_WRANGLER_CONFIG), '{}')
    const cli = join(wranglerBin, 'wrangler.js')
    const id = '57b7076f58be42419276f058a8968187'
    const configuration: ProductionPostgresConfiguration = {
      configFileName: POSTGRES_WRANGLER_CONFIG,
      hyperdriveId: id,
      publicServerUrl: 'https://cms.example.com',
      transport: 'hyperdrive',
    }

    const expectedArguments = [
      'hyperdrive',
      'get',
      id,
      '--config',
      POSTGRES_WRANGLER_CONFIG,
      '--env',
      'production',
    ]
    writeFileSync(cli, [
      `const expected = ${JSON.stringify(expectedArguments)}`,
      'if (JSON.stringify(process.argv.slice(2)) !== JSON.stringify(expected)) process.exit(2)',
      "if (process.env.DATABASE_URI) process.exit(3)",
      "if (process.env.CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV !== 'false') process.exit(4)",
      `process.stdout.write(${JSON.stringify(JSON.stringify({
        id,
        caching: { disabled: true },
      }))})`,
    ].join('\n'))
    assert.doesNotThrow(() => verifyHyperdriveCachingDisabledControlPlane(
      projectDir,
      configuration,
      {
        PATH: process.env.PATH,
        DATABASE_URI: 'must-not-reach-child',
      } as unknown as NodeJS.ProcessEnv,
    ))

    writeFileSync(cli, [
      "process.stdout.write('origin-user-and-host-must-not-leak')",
      "process.stderr.write('credential-shaped-diagnostic-must-not-leak')",
      'process.exitCode = 1',
    ].join('\n'))
    assert.throws(
      () => verifyHyperdriveCachingDisabledControlPlane(
        projectDir,
        configuration,
        {} as unknown as NodeJS.ProcessEnv,
      ),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.equal(error.message, 'Cloudflare Hyperdrive cache-state verification failed')
        assert.doesNotMatch(error.message, /origin-user|credential-shaped/u)
        return true
      },
    )
  })
})

test('PostgreSQL build, deploy, and migration environments isolate database credentials', () => {
  const source = {
    PATH: '/bin',
    DATABASE_URI: 'postgresql://user:password@db.example.com/pseo?sslmode=require',
    CLOUDFLARE_API_TOKEN: 'control-plane-token',
    CMS_GITHUB_TOKEN: 'application-token',
  } as unknown as NodeJS.ProcessEnv
  const build = createSanitizedPostgresBuildEnvironment(source)
  assert.equal(build.CMS_DATABASE_ADAPTER, 'postgres')
  assert.equal(build.CMS_POSTGRES_TRANSPORT, 'direct')
  assert.equal(build.DATABASE_URI, POSTGRES_BUILD_URI_SENTINEL)
  assert.equal(build.PAYLOAD_PUBLIC_SERVER_URL, 'https://cms-build.invalid')
  assert.equal(build.CLOUDFLARE_API_TOKEN, undefined)

  const runtime = createSanitizedPostgresProductionEnvironment(
    source,
    'runtime-sentinel',
    'hyperdrive',
    'https://cms.example.com',
  )
  assert.equal(runtime.CMS_POSTGRES_TRANSPORT, 'hyperdrive')
  assert.equal(runtime.DATABASE_URI, undefined)
  assert.equal(runtime.CMS_GITHUB_TOKEN, undefined)
  assert.equal(runtime.CLOUDFLARE_API_TOKEN, 'control-plane-token')

  const migration = createSanitizedPostgresMigrationEnvironment(
    source,
    'https://cms.example.com',
  )
  assert.equal(migration.CMS_POSTGRES_TRANSPORT, 'direct')
  assert.equal(migration.DATABASE_URI, source.DATABASE_URI)
  assert.equal(migration.CLOUDFLARE_API_TOKEN, undefined)
  assert.equal(migration.CMS_GITHUB_TOKEN, undefined)

  const deploy = createSanitizedPostgresDeployEnvironment(
    source,
    '/isolated/postgres-cms',
    'hyperdrive',
    'https://cms.example.com',
  )
  assert.equal(deploy.DATABASE_URI, undefined)
  assert.equal(deploy.CMS_POSTGRES_TRANSPORT, 'hyperdrive')
  assert.equal(
    deploy[HYPERDRIVE_LOCAL_CONNECTION_STRING_ENV],
    HYPERDRIVE_LOCAL_CONNECTION_STRING_SENTINEL,
  )
  assert.equal(deploy.CI, 'true')
  assert.equal(deploy.PAYLOAD_CONFIG_PATH, '/isolated/postgres-cms/src/payload.config.ts')

  const directDeploy = createSanitizedPostgresDeployEnvironment(
    source,
    '/isolated/postgres-cms',
    'direct',
    'https://cms.example.com',
  )
  assert.equal(directDeploy[HYPERDRIVE_LOCAL_CONNECTION_STRING_ENV], undefined)
})

test('PostgreSQL migration URI and direct-runtime fallback fail closed', () => {
  const remote = 'postgresql://user:password@db.example.com/pseo?sslmode=require'
  assert.equal(assertRemotePostgresMigrationUri(remote), remote)
  for (const value of [
    undefined,
    'sqlite://example.com/db',
    'postgres://localhost/pseo',
    'postgres://127.0.0.1/pseo',
    'postgres://db.internal/pseo',
    'postgres://db.example.com/pseo?sslmode=disable',
  ]) {
    assert.throws(() => assertRemotePostgresMigrationUri(value))
  }
  assert.throws(
    () => assertDirectPostgresRuntimeSecretReady({} as unknown as NodeJS.ProcessEnv),
    /explicit confirmation/,
  )
  assert.doesNotThrow(() => assertDirectPostgresRuntimeSecretReady({
    CMS_CLOUDFLARE_DIRECT_DATABASE_READY: 'true',
  } as unknown as NodeJS.ProcessEnv))
  assert.throws(
    () => assertPostgresRuntimeBindingsReady({} as unknown as NodeJS.ProcessEnv),
    /PAYLOAD_SECRET and CMS_PUBLIC_SNAPSHOT_TOKEN/,
  )
  assert.doesNotThrow(() => assertPostgresRuntimeBindingsReady({
    CMS_CLOUDFLARE_RUNTIME_BINDINGS_READY: 'true',
  } as unknown as NodeJS.ProcessEnv))

  assert.deepEqual(
    collectProcessSecretNeedles({
      CMS_CLOUDFLARE_DIRECT_DATABASE_READY: 'true',
      CMS_CLOUDFLARE_RUNTIME_BINDINGS_READY: 'true',
    } as unknown as NodeJS.ProcessEnv),
    [],
  )
})

test('tracked Hyperdrive config is a non-deployable secret-free template', () => {
  const template = readFileSync(join(cmsRoot, 'wrangler.postgres.example.jsonc'), 'utf8')
  const config = JSON.parse(template) as {
    env: {
      production: {
        hyperdrive: Array<{ id: string }>
        limits: { cpu_ms: number }
        placement: { mode: string }
      }
    }
  }
  assert.equal(config.env.production.placement.mode, 'smart')
  assert.equal(config.env.production.limits.cpu_ms, 30_000)
  assert.equal(
    config.env.production.hyperdrive[0]?.id,
    'REPLACE_WITH_CLOUDFLARE_HYPERDRIVE_ID',
  )
  assert.doesNotMatch(template, /postgres(?:ql)?:\/\//i)

  const ignored = readFileSync(join(cmsRoot, '.gitignore'), 'utf8')
  assert.match(ignored, /^wrangler\.postgres\.jsonc$/mu)

  const packageJson = JSON.parse(readFileSync(join(cmsRoot, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>
  }
  assert.equal(
    packageJson.scripts['build:cloudflare:postgres'],
    'node --experimental-strip-types scripts/cloudflare-artifact.ts build-postgres',
  )
  assert.match(
    packageJson.scripts['deploy:cloudflare:postgres'] ?? '',
    /preflight[\s\S]*build[\s\S]*artifact:check[\s\S]*dry-run[\s\S]*migrate[\s\S]*artifact:check[\s\S]*deploy-postgres/u,
  )
  assert.match(
    packageJson.scripts['cloudflare:typegen'] ?? '',
    /CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false/u,
  )
})

test('staging copy excludes env files, development vars, caches, and prior artifacts', () => {
  withTempDirectory((directory) => {
    const source = join(directory, 'source')
    const stage = join(directory, 'stage')
    mkdirSync(source)
    mkdirSync(join(source, 'node_modules'))
    mkdirSync(join(source, 'node_modules', '.pnpm', 'example', 'node_modules', 'example'), {
      recursive: true,
    })
    symlinkSync(
      '.pnpm/example/node_modules/example',
      join(source, 'node_modules', 'example'),
    )
    mkdirSync(join(source, '.open-next'))
    mkdirSync(join(source, 'src'))
    writeFileSync(join(source, '.env'), 'PAYLOAD_SECRET=private\n')
    writeFileSync(join(source, '.env.production.local'), 'CMS_GITHUB_TOKEN=private\n')
    writeFileSync(join(source, '.dev.vars'), 'PAYLOAD_SECRET=private\n')
    writeFileSync(join(source, '.open-next', 'worker.js'), 'contaminated')
    writeFileSync(join(source, 'src', 'index.ts'), 'export {}\n')

    copyProjectToSanitizedStage(source, stage)

    assert.equal(readFileSync(join(stage, 'src', 'index.ts'), 'utf8'), 'export {}\n')
    assert.equal(
      readlinkSync(join(stage, 'node_modules', 'example')),
      '.pnpm/example/node_modules/example',
    )
    assert.throws(() => readFileSync(join(stage, '.env')))
    assert.throws(() => readFileSync(join(stage, '.env.production.local')))
    assert.throws(() => readFileSync(join(stage, '.dev.vars')))
    assert.throws(() => readFileSync(join(stage, '.open-next', 'worker.js')))
  })
})

test('deploy staging copies the scanned artifact but no local env file', () => {
  withTempDirectory((projectDir) => {
    mkdirSync(join(projectDir, 'node_modules'))
    mkdirSync(join(projectDir, '.open-next', 'cloudflare'), { recursive: true })
    writeFileSync(join(projectDir, '.env.production'), 'PAYLOAD_SECRET=private\n')
    writeFileSync(join(projectDir, 'package.json'), '{}\n')
    writeFileSync(join(projectDir, '.open-next', 'worker.js'), 'safe worker\n')
    writeFileSync(
      join(projectDir, '.open-next', 'cloudflare', 'next-env.mjs'),
      'export const production = {};\nexport const development = {};\nexport const test = {};\n',
    )

    const stage = createSanitizedStage(projectDir, true)
    try {
      assert.equal(readFileSync(join(stage.root, '.open-next', 'worker.js'), 'utf8'), 'safe worker\n')
      assert.throws(() => readFileSync(join(stage.root, '.env.production')))
    } finally {
      rmSync(stage.parent, { recursive: true, force: true })
    }
  })
})

test('artifact scan catches raw, JSON-escaped, sentinel, token, and credential URI leakage without echoing values', () => {
  withTempDirectory((projectDir) => {
    const artifactDir = join(projectDir, '.open-next')
    mkdirSync(artifactDir)
    const sourceSecret = 'private-value-with-a-"quote"-and-newline\nend'
    const envSource = `PAYLOAD_SECRET=${JSON.stringify(sourceSecret)}\n`
    const parsedSecret = parseDotEnv(envSource).get('PAYLOAD_SECRET')
    assert.ok(parsedSecret)
    writeFileSync(join(projectDir, '.env.production.local'), envSource)
    writeFileSync(join(artifactDir, 'raw.js'), parsedSecret)
    writeFileSync(join(artifactDir, 'escaped.js'), JSON.stringify(parsedSecret))
    writeFileSync(join(artifactDir, 'sentinel.js'), BUILD_SECRET_SENTINEL)
    writeFileSync(
      join(artifactDir, 'token.js'),
      ['github', 'pat', '123456789012345678901234567890'].join('_'),
    )
    writeFileSync(join(artifactDir, 'database.js'), 'postgresql://worker:password@example.invalid/cms')

    const needles = collectLocalSecretNeedles(projectDir)
    const scanNeedles = [
      ...needles,
      { label: 'build sentinel', variants: [Buffer.from(BUILD_SECRET_SENTINEL)] },
    ]
    const findings = scanCloudflareArtifact(artifactDir, scanNeedles)
    assert.ok(findings.length >= 5)

    assert.throws(
      () => assertCloudflareArtifactSafe(artifactDir, scanNeedles),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.doesNotMatch(error.message, /private-value/)
        assert.match(error.message, /values are intentionally redacted/)
        return true
      },
    )
  })
})

test('retired Git-first runtime gate scans only the build artifact and redacts matched content', () => {
  withTempDirectory((projectDir) => {
    const artifactDir = join(projectDir, '.open-next')
    mkdirSync(join(artifactDir, 'cloudflare'), { recursive: true })
    writeFileSync(
      join(artifactDir, 'cloudflare', 'next-env.mjs'),
      'export const production = {};\nexport const development = {};\nexport const test = {};\n',
    )
    writeFileSync(join(artifactDir, 'worker.js'), 'export default { fetch() {} }\n')

    // Source-only text is outside the deploy artifact and must not affect this gate.
    writeFileSync(join(projectDir, 'source-only.txt'), 'SubmitReviewButton CMS_GIT_PUBLISHER\n')
    assert.doesNotThrow(() => checkCloudflareArtifact(projectDir, { NODE_ENV: 'test' }))

    const privateContent = 'private-prompt-body-never-echo'
    writeFileSync(join(artifactDir, 'retired.js'), [
      '/internal/v1/publication-requests',
      'SubmitReviewButton',
      'GitHubGitPublisher',
      'CMS_GIT_PUBLISHER',
      privateContent,
    ].join('\n'))

    const findings = scanRetiredGitFirstRuntimeMarkers(artifactDir)
    assert.equal(findings.length, 4)
    assert.ok(findings.every((finding) => finding.file === 'retired.js'))
    assert.ok(findings.every((finding) => /^retired Git-first runtime marker \d+$/u.test(finding.label)))
    assert.throws(
      () => assertRetiredGitFirstRuntimeExcluded(artifactDir),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.match(error.message, /marker values are intentionally redacted/u)
        assert.doesNotMatch(error.message, /private-prompt-body-never-echo|SubmitReviewButton|CMS_GIT_PUBLISHER/u)
        return true
      },
    )
  })
})

test('compiled environment must already be the exact empty module', () => {
  withTempDirectory((artifactDir) => {
    mkdirSync(join(artifactDir, 'cloudflare'), { recursive: true })
    writeFileSync(
      join(artifactDir, 'cloudflare', 'next-env.mjs'),
      'export const production = {PAYLOAD_SECRET:"not-a-real-secret"};\n',
    )
    writeFileSync(join(artifactDir, 'worker.js'), 'export default { fetch() {} }\n')

    assert.throws(
      () => assertCompiledEnvironmentEmpty(artifactDir),
      /compiled environment is not the expected empty module/,
    )
    writeFileSync(
      join(artifactDir, 'cloudflare', 'next-env.mjs'),
      'export const production = {};\nexport const development = {};\nexport const test = {};\n',
    )
    assert.doesNotThrow(() => assertCompiledEnvironmentEmpty(artifactDir))
    assert.equal(
      readFileSync(join(artifactDir, 'cloudflare', 'next-env.mjs'), 'utf8'),
      'export const production = {};\nexport const development = {};\nexport const test = {};\n',
    )
    assert.doesNotThrow(() => assertCloudflareArtifactSafe(artifactDir, []))
  })
})

test('artifact scan accepts internal package links and rejects links outside the artifact', () => {
  withTempDirectory((projectDir) => {
    const artifactDir = join(projectDir, '.open-next')
    mkdirSync(artifactDir)
    writeFileSync(join(artifactDir, 'physical.js'), 'safe\n')
    symlinkSync('physical.js', join(artifactDir, 'internal.js'))
    assert.doesNotThrow(() => scanCloudflareArtifact(artifactDir, []))

    writeFileSync(join(projectDir, 'outside.js'), 'safe\n')
    symlinkSync('../outside.js', join(artifactDir, 'outside.js'))
    assert.throws(
      () => scanCloudflareArtifact(artifactDir, []),
      /symlink outside the artifact/,
    )
  })
})

test('artifact size gate rejects any traced Next OG runtime file', () => {
  withTempDirectory((artifactDir) => {
    const ogDir = join(
      artifactDir,
      'server-functions',
      'default',
      'node_modules',
      'next',
      'dist',
      'compiled',
      '@vercel',
      'og',
    )
    mkdirSync(ogDir, { recursive: true })
    writeFileSync(join(ogDir, 'resvg.wasm'), 'unused')
    assert.throws(
      () => assertUnusedNextOgRuntimeExcluded(artifactDir),
      /referencing the disabled Next OG runtime/,
    )
  })
})

test('artifact size gate rejects an inlined OG runtime recorded only in the handler metafile', () => {
  withTempDirectory((artifactDir) => {
    const handlerDir = join(artifactDir, 'server-functions', 'default')
    mkdirSync(handlerDir, { recursive: true })
    writeFileSync(join(handlerDir, 'handler.mjs'), 'export default {}')
    writeFileSync(
      join(handlerDir, 'handler.mjs.meta.json'),
      JSON.stringify({ inputs: { ['next/dist/compiled/' + '@vercel/og/index.node.js']: {} } }),
    )
    assert.throws(
      () => assertUnusedNextOgRuntimeExcluded(artifactDir),
      /referencing the disabled Next OG runtime/,
    )

    writeFileSync(join(handlerDir, 'handler.mjs.meta.json'), JSON.stringify({ inputs: {} }))
    writeFileSync(join(handlerDir, 'handler.mjs'), 'const optionalRuntime = "ImageResponse"')
    assert.throws(
      () => assertUnusedNextOgRuntimeExcluded(artifactDir),
      /referencing the disabled Next OG runtime/,
    )
  })
})
