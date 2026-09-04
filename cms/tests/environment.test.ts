import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CMS_POSTGRES_POOL_MAX,
  CmsConfigurationError,
  readCmsEnvironment,
} from '../src/config/env.ts'

const validEnvironment: NodeJS.ProcessEnv = {
  DATABASE_URI: 'postgres://payload:payload@127.0.0.1:5432/pseo_cms',
  NODE_ENV: 'test',
  PAYLOAD_PUBLIC_SERVER_URL: 'http://localhost:3001/',
  PAYLOAD_SECRET: '01234567890123456789012345678901',
}

test('active CMS environment has no Git publisher state and needs no legacy base SHA', () => {
  const environment = readCmsEnvironment(validEnvironment)
  assert.equal(environment.databaseAdapter, 'postgres')
  assert.equal(environment.databaseUri, validEnvironment.DATABASE_URI)
  assert.equal(environment.deploymentEnvironment, 'local')
  assert.equal(environment.postgresTransport, 'direct')
  assert.equal(environment.publicServerUrl, 'http://localhost:3001')
  assert.equal('gitPublisherMode' in environment, false)
  assert.equal('githubToken' in environment, false)
  assert.equal('mockGitBaseSha' in environment, false)
  assert.equal(environment.publicSnapshotEnabled, false)
  assert.equal(environment.publicSnapshotToken, null)
})

test('D1 mode does not require a PostgreSQL URI', () => {
  const environment = readCmsEnvironment({
    ...validEnvironment,
    CMS_DATABASE_ADAPTER: 'd1',
    DATABASE_URI: undefined,
  })
  assert.equal(environment.databaseAdapter, 'd1')
  assert.equal(environment.databaseUri, null)
  assert.equal(environment.postgresTransport, null)
})

test('production Postgres requires an explicit direct or Hyperdrive transport', () => {
  assert.throws(
    () => readCmsEnvironment({
      ...validEnvironment,
      CMS_DEPLOYMENT_ENV: 'production',
    }),
    /CMS_POSTGRES_TRANSPORT must be explicit/u,
  )
  const direct = readCmsEnvironment({
    ...validEnvironment,
    CMS_DEPLOYMENT_ENV: 'production',
    CMS_POSTGRES_TRANSPORT: 'direct',
    PAYLOAD_PUBLIC_SERVER_URL: 'https://cms.example.invalid',
  })
  assert.equal(direct.postgresTransport, 'direct')
  assert.equal(direct.databaseUri, validEnvironment.DATABASE_URI)

  assert.throws(
    () => readCmsEnvironment({
      ...validEnvironment,
      CMS_DEPLOYMENT_ENV: 'production',
      CMS_POSTGRES_TRANSPORT: 'direct',
    }),
    /PAYLOAD_PUBLIC_SERVER_URL must use https/u,
  )

  assert.throws(
    () => readCmsEnvironment({
      ...validEnvironment,
      CMS_POSTGRES_TRANSPORT: 'tunnel',
    }),
    /CMS_POSTGRES_TRANSPORT must be direct or hyperdrive/u,
  )
})

test('Hyperdrive resolves only the server-side binding and caps the Worker pool', () => {
  const hyperdriveEnvironment: NodeJS.ProcessEnv = {
    ...validEnvironment,
    CMS_POSTGRES_TRANSPORT: 'hyperdrive',
  }
  delete hyperdriveEnvironment.DATABASE_URI
  const connectionString = 'postgresql://hyperdrive.internal/pseo_cms'
  const environment = readCmsEnvironment(hyperdriveEnvironment, {
    hyperdrive: { connectionString },
  })

  assert.equal(environment.databaseAdapter, 'postgres')
  assert.equal(environment.postgresTransport, 'hyperdrive')
  assert.equal(environment.databaseUri, connectionString)
  assert.equal(CMS_POSTGRES_POOL_MAX, 5)

  assert.throws(
    () => readCmsEnvironment(hyperdriveEnvironment),
    /Cloudflare HYPERDRIVE binding/u,
  )
  assert.throws(
    () => readCmsEnvironment(hyperdriveEnvironment, {
      hyperdrive: { connectionString: 'https://not-postgres.example.invalid' },
    }),
    /PostgreSQL connection string/u,
  )
  assert.throws(
    () => readCmsEnvironment({
      ...hyperdriveEnvironment,
      DATABASE_URI: validEnvironment.DATABASE_URI,
    }, {
      hyperdrive: { connectionString },
    }),
    /DATABASE_URI must be absent/u,
  )
})

test('D1 rejects every PostgreSQL transport setting', () => {
  for (const transport of ['direct', 'hyperdrive', ''] as const) {
    assert.throws(
      () => readCmsEnvironment({
        ...validEnvironment,
        CMS_DATABASE_ADAPTER: 'd1',
        CMS_POSTGRES_TRANSPORT: transport,
        DATABASE_URI: undefined,
      }),
      /CMS_POSTGRES_TRANSPORT is accepted only/u,
    )
  }
})

test('database configuration fails closed for missing PostgreSQL or insecure production D1', () => {
  assert.throws(
    () => readCmsEnvironment({ ...validEnvironment, DATABASE_URI: undefined }),
    CmsConfigurationError,
  )
  assert.throws(
    () => readCmsEnvironment({ ...validEnvironment, CMS_DATABASE_ADAPTER: 'sqlite' }),
    CmsConfigurationError,
  )
  assert.throws(
    () => readCmsEnvironment({
      ...validEnvironment,
      CMS_DATABASE_ADAPTER: 'd1',
      CMS_DEPLOYMENT_ENV: 'production',
      DATABASE_URI: undefined,
    }),
    /PAYLOAD_PUBLIC_SERVER_URL must use https/u,
  )
})

test('active CMS runtime rejects every retired Git publication variable, including legacy mock', () => {
  for (const retired of [
    { CMS_GIT_PUBLISHER: 'mock' },
    { CMS_GIT_PUBLISHER: 'github' },
    { CMS_GITHUB_REPOSITORY: 'ziyetsui/prompt-lab' },
    { CMS_GITHUB_TOKEN: 'must-not-enter-active-runtime' },
    { CMS_MOCK_GIT_BASE_SHA: '0'.repeat(40) },
  ]) {
    assert.throws(
      () => readCmsEnvironment({ ...validEnvironment, ...retired }),
      /Retired CMS Git publication environment variables/u,
    )
  }
})

test('public snapshot Bearer access is disabled by default and validates explicit opt-in', () => {
  assert.throws(
    () => readCmsEnvironment({
      ...validEnvironment,
      CMS_PUBLIC_SNAPSHOT_ENABLED: 'true',
    }),
    /CMS_PUBLIC_SNAPSHOT_TOKEN/u,
  )
  assert.throws(
    () => readCmsEnvironment({
      ...validEnvironment,
      CMS_PUBLIC_SNAPSHOT_ENABLED: 'sometimes',
    }),
    /CMS_PUBLIC_SNAPSHOT_ENABLED/u,
  )
  assert.throws(
    () => readCmsEnvironment({
      ...validEnvironment,
      CMS_PUBLIC_SNAPSHOT_ENABLED: 'true',
      CMS_PUBLIC_SNAPSHOT_TOKEN: `${'x'.repeat(40)}\n`,
    }),
    /CMS_PUBLIC_SNAPSHOT_TOKEN/u,
  )
  const environment = readCmsEnvironment({
    ...validEnvironment,
    CMS_PUBLIC_SNAPSHOT_ENABLED: 'true',
    CMS_PUBLIC_SNAPSHOT_TOKEN: 'snapshot-token-with-at-least-32-characters',
  })
  assert.equal(environment.publicSnapshotEnabled, true)
  assert.equal(environment.publicSnapshotToken, 'snapshot-token-with-at-least-32-characters')
})
