import assert from 'node:assert/strict'
import test from 'node:test'

import { createPublicSnapshotEndpoint } from '../src/endpoints/publicSnapshot.ts'
import {
  PublicSnapshotError,
  snapshotSha256,
  stableSnapshotJson,
  type PublicSnapshotEnvelope,
} from '../src/snapshot/index.ts'

const TOKEN = 'public-snapshot-token-with-32-characters'

function emptyEnvelope(): PublicSnapshotEnvelope {
  const contents = new Map([
    ['README.md', '# PromptLab\n'],
    ['catalog.json', '{"items":[]}\n'],
    ['content/site.json', '{"schemaVersion":1}\n'],
    ['governance/content-rights.json', '{"items":[]}\n'],
  ])
  const files = [...contents]
    .sort(([left], [right]) => left.localeCompare(right, 'en'))
    .map(([path, content]) => ({
      content: Buffer.from(content).toString('base64'),
      encoding: 'base64' as const,
      path,
      sha256: snapshotSha256(content),
    }))
  const exportRevision = `sha256:${'a'.repeat(64)}`
  const manifest = {
    counts: { locales: 2, prompts: 0, taxonomies: 0 },
    exporterVersion: 'cms-public-snapshot-v1',
    exportRevision,
    files: files.map((file) => ({
      bytes: Buffer.from(file.content, 'base64').length,
      path: file.path,
      sha256: file.sha256,
    })),
    schemaVersion: 1 as const,
  }
  return {
    exporterVersion: 'cms-public-snapshot-v1',
    exportRevision,
    files,
    manifest,
    manifestSha256: snapshotSha256(stableSnapshotJson(manifest)),
    schemaVersion: 1,
  }
}

function request(authorization?: string): never {
  const headers = new Headers()
  if (authorization !== undefined) headers.set('authorization', authorization)
  return { headers, payload: {} } as never
}

async function body(response: unknown): Promise<Record<string, unknown>> {
  assert.ok(response instanceof Response)
  return await response.json() as Record<string, unknown>
}

test('snapshot endpoint is absent-by-policy when export is not explicitly enabled', async () => {
  let builds = 0
  const endpoint = createPublicSnapshotEndpoint({
    databaseAdapter: 'postgres',
    publicSnapshotEnabled: false,
    publicSnapshotToken: null,
  }, {
    buildSnapshot: async () => {
      builds += 1
      return emptyEnvelope()
    },
  })
  const response = await endpoint.handler(request(`Bearer ${TOKEN}`))
  assert.ok(response instanceof Response)
  assert.equal(response.status, 404)
  assert.equal((await body(response)).code, 'PUBLIC_SNAPSHOT_DISABLED')
  assert.equal(builds, 0)
})

test('snapshot endpoint requires an exact Bearer token before reading CMS', async () => {
  let builds = 0
  const endpoint = createPublicSnapshotEndpoint({
    databaseAdapter: 'postgres',
    publicSnapshotEnabled: true,
    publicSnapshotToken: TOKEN,
  }, {
    buildSnapshot: async () => {
      builds += 1
      return emptyEnvelope()
    },
  })
  for (const authorization of [undefined, 'Basic value', 'Bearer wrong-token']) {
    const response = await endpoint.handler(request(authorization))
    assert.ok(response instanceof Response)
    assert.equal(response.status, 401)
    assert.equal((await body(response)).code, 'UNAUTHENTICATED')
  }
  assert.equal(builds, 0)
})

test('authorized snapshot endpoint returns the closed envelope with no-store headers', async () => {
  const envelope = emptyEnvelope()
  const endpoint = createPublicSnapshotEndpoint({
    databaseAdapter: 'postgres',
    publicSnapshotEnabled: true,
    publicSnapshotToken: TOKEN,
  }, { buildSnapshot: async () => envelope })
  const response = await endpoint.handler(request(`Bearer ${TOKEN}`))
  assert.ok(response instanceof Response)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  assert.deepEqual(await body(response), envelope)
})

test('snapshot endpoint returns only safe errors and never echoes the Bearer token', async () => {
  const endpoint = createPublicSnapshotEndpoint({
    databaseAdapter: 'd1',
    publicSnapshotEnabled: true,
    publicSnapshotToken: TOKEN,
  }, {
    buildSnapshot: async () => {
      throw new PublicSnapshotError(
        'SNAPSHOT_CONSISTENCY_UNAVAILABLE',
        `Unsafe internal detail containing ${TOKEN}`,
        503,
      )
    },
  })
  const response = await endpoint.handler(request(`Bearer ${TOKEN}`))
  assert.ok(response instanceof Response)
  assert.equal(response.status, 503)
  const result = await body(response)
  assert.equal(result.code, 'SNAPSHOT_CONSISTENCY_UNAVAILABLE')
  assert.doesNotMatch(JSON.stringify(result), new RegExp(TOKEN))
})
