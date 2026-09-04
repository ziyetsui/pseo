import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import test from 'node:test'

import pg from 'pg'

import {
  MAX_CLOUDFLARE_MULTIPART_BYTES,
  createCloudflareRequestScopedPostgresRuntime,
  type CloudflareRequestExecutionContext,
  type RequestScopedPoolLike,
} from '../src/runtime/cloudflareRequestScopedPostgres.ts'

interface Deferred<T> {
  readonly promise: Promise<T>
  readonly resolve: (value: T | PromiseLike<T>) => void
}

function deferred<T = void>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

interface TestExecutionContext extends CloudflareRequestExecutionContext {
  readonly waits: Promise<unknown>[]
}

function executionContext(): TestExecutionContext {
  const waits: Promise<unknown>[] = []
  return {
    passThroughOnException: () => undefined,
    waitUntil: (promise) => {
      waits.push(Promise.resolve(promise))
    },
    waits,
  }
}

async function drainWaits(context: TestExecutionContext): Promise<void> {
  let observed = 0
  while (observed < context.waits.length) {
    const pending = context.waits.slice(observed)
    observed = context.waits.length
    await Promise.all(pending)
  }
}

class FakeClient {
  releases = 0
  readonly listeners: Array<{ readonly event: string; readonly listener: (...args: unknown[]) => void }> = []
  readonly queries: string[] = []

  prependListener(event: string, listener: (...args: unknown[]) => void): this {
    this.listeners.unshift({ event, listener })
    return this
  }

  query(query: string | { readonly text?: string }): Promise<{
    readonly command: string
    readonly fields: readonly unknown[]
    readonly rowCount: number
    readonly rows: readonly unknown[]
  }> {
    this.queries.push(typeof query === 'string' ? query : query.text ?? '')
    return Promise.resolve({ command: '', fields: [], rowCount: 0, rows: [] })
  }

  release(): void {
    this.releases += 1
  }
}

class FakePool implements RequestScopedPoolLike {
  readonly client = new FakeClient()
  connects = 0
  readonly queries: string[] = []

  connect(): Promise<FakeClient> {
    this.connects += 1
    return Promise.resolve(this.client)
  }

  query(text: string): Promise<{ rows: readonly unknown[] }> {
    this.queries.push(text)
    return Promise.resolve({ rows: [] })
  }
}

const hyperdriveEnvironment = {
  CMS_DATABASE_ADAPTER: 'postgres',
  CMS_POSTGRES_TRANSPORT: 'hyperdrive',
}

test('tracked Cloudflare configs select the request-scoped Worker entry', () => {
  for (const fileName of ['wrangler.jsonc', 'wrangler.postgres.example.jsonc']) {
    const config = JSON.parse(readFileSync(new URL(`../${fileName}`, import.meta.url), 'utf8')) as {
      readonly main?: unknown
    }
    assert.equal(config.main, 'src/worker.ts', fileName)
  }
})

test('one cached Payload pool proxy creates distinct pools for two request contexts', async () => {
  const createdPools: FakePool[] = []
  const finalized: number[] = []
  // Query-distinct module URLs model the Worker entry and Next/Payload handler
  // being emitted through separate bundler graphs. Symbol.for(globalThis)
  // must still make their AsyncLocalStorage store shared.
  const wrapperModule = await import(
    new URL('../src/runtime/cloudflareRequestScopedPostgres.ts?wrapper-graph', import.meta.url).href
  ) as typeof import('../src/runtime/cloudflareRequestScopedPostgres.ts')
  const adapterModule = await import(
    new URL('../src/runtime/cloudflareRequestScopedPostgres.ts?adapter-graph', import.meta.url).href
  ) as typeof import('../src/runtime/cloudflareRequestScopedPostgres.ts')
  const wrapperRuntime = wrapperModule.createCloudflareRequestScopedPostgresRuntime({
    createPool: () => {
      throw new Error('the wrapper-side runtime must not create adapter pools')
    },
    onRequestFinalized: ({ poolCount }) => finalized.push(poolCount),
  })
  // A second runtime instance models the separately bundled Payload adapter
  // graph. Both sides must observe the same global Symbol/ALS request store.
  const adapterRuntime = adapterModule.createCloudflareRequestScopedPostgresRuntime({
    createPool: () => {
      const pool = new FakePool()
      createdPools.push(pool)
      return pool
    },
  })
  const pool = new adapterRuntime.Pool({ connectionString: 'postgres://request-scoped.invalid/cms' })
  assert.equal(pool instanceof pg.Pool, true)
  const firstGate = deferred()
  const firstContext = executionContext()
  const secondContext = executionContext()

  const firstResponse = await wrapperRuntime.handleRequest(
    new Request('https://cms.example.invalid/api/prompt-artifacts'),
    hyperdriveEnvironment,
    firstContext,
    async (_request, _environment, trackedContext) => {
      await pool.query('request-one')
      trackedContext.waitUntil(firstGate.promise)
      return new Response('one')
    },
  )
  const secondResponse = await wrapperRuntime.handleRequest(
    new Request('https://cms.example.invalid/api/users'),
    hyperdriveEnvironment,
    secondContext,
    async () => {
      await pool.query('request-two')
      return new Response('two')
    },
  )

  assert.equal(await secondResponse.text(), 'two')
  await drainWaits(secondContext)

  assert.equal(createdPools.length, 2)
  assert.deepEqual(createdPools.map((created) => created.queries), [
    ['request-one'],
    ['request-two'],
  ])
  assert.deepEqual(finalized, [1])

  firstGate.resolve()
  await firstGate.promise
  await Promise.resolve()
  // Tracked work is done, but the first response body has not settled.
  assert.deepEqual(finalized, [1])
  assert.equal(await firstResponse.text(), 'one')
  await drainWaits(firstContext)
  assert.deepEqual(finalized, [1, 1])
})

test('only the first Payload connection probe is released and suppressed', async () => {
  const createdPools: FakePool[] = []
  const runtime = createCloudflareRequestScopedPostgresRuntime({
    createPool: () => {
      const pool = new FakePool()
      createdPools.push(pool)
      return pool
    },
  })
  const pool = new runtime.Pool({ connectionString: 'postgres://request-scoped.invalid/cms' })
  const context = executionContext()

  const response = await runtime.handleRequest(
    new Request('https://cms.example.invalid/api/users'),
    hyperdriveEnvironment,
    context,
    async () => {
      const bootstrapClient = await pool.connect()
      bootstrapClient.prependListener('error', () => undefined)
      const laterClient = await pool.connect()
      laterClient.prependListener('error', () => undefined)
      laterClient.release()
      return new Response('connected')
    },
  )

  assert.equal(await response.text(), 'connected')
  await drainWaits(context)
  assert.equal(createdPools.length, 1)
  assert.equal(createdPools[0]?.connects, 2)
  assert.equal(createdPools[0]?.client.releases, 2)
  assert.equal(createdPools[0]?.client.listeners.length, 1)
})

test('real Drizzle transactions commit and roll back on one checked-out client', async () => {
  const require = createRequire(import.meta.url)
  const adapterRequire = createRequire(require.resolve('@payloadcms/db-postgres'))
  const drizzleModule = await import(pathToFileURL(
    adapterRequire.resolve('drizzle-orm/node-postgres'),
  ).href) as { readonly drizzle: (configuration: { readonly client: pg.Pool }) => any }
  const sqlModule = await import(pathToFileURL(
    adapterRequire.resolve('drizzle-orm'),
  ).href) as { readonly sql: { readonly raw: (text: string) => unknown } }
  const createdPools: FakePool[] = []
  const runtime = createCloudflareRequestScopedPostgresRuntime({
    createPool: () => {
      const pool = new FakePool()
      createdPools.push(pool)
      return pool
    },
  })
  const pool = new runtime.Pool({ connectionString: 'postgres://request-scoped.invalid/cms' })
  const database = drizzleModule.drizzle({ client: pool })
  const context = executionContext()

  const response = await runtime.handleRequest(
    new Request('https://cms.example.invalid/api/prompt-artifacts'),
    hyperdriveEnvironment,
    context,
    async () => {
      await database.transaction(async (transaction: { execute: (query: unknown) => Promise<unknown> }) => {
        await transaction.execute(sqlModule.sql.raw('select 1'))
      })
      return new Response('committed')
    },
  )

  assert.equal(await response.text(), 'committed')
  await drainWaits(context)
  assert.equal(createdPools.length, 1)
  assert.equal(createdPools[0]?.connects, 1)
  assert.deepEqual(createdPools[0]?.client.queries, ['begin', 'select 1', 'commit'])
  assert.equal(createdPools[0]?.client.releases, 1)

  const rollbackContext = executionContext()
  const rollbackResponse = await runtime.handleRequest(
    new Request('https://cms.example.invalid/api/prompt-artifacts/rollback'),
    hyperdriveEnvironment,
    rollbackContext,
    async () => {
      await assert.rejects(
        database.transaction(async (transaction: { execute: (query: unknown) => Promise<unknown> }) => {
          await transaction.execute(sqlModule.sql.raw('select 2'))
          throw new Error('roll this transaction back')
        }),
        /roll this transaction back/u,
      )
      return new Response('rolled-back')
    },
  )

  assert.equal(await rollbackResponse.text(), 'rolled-back')
  await drainWaits(rollbackContext)
  assert.equal(createdPools.length, 2)
  assert.equal(createdPools[1]?.connects, 1)
  assert.deepEqual(createdPools[1]?.client.queries, ['begin', 'select 2', 'rollback'])
  assert.equal(createdPools[1]?.client.releases, 1)
})

test('multipart auth body and boundary survive deferred OpenNext handling', async () => {
  const createdPools: FakePool[] = []
  const wrapperRuntime = createCloudflareRequestScopedPostgresRuntime({
    createPool: () => {
      throw new Error('the wrapper-side runtime must not create adapter pools')
    },
  })
  const adapterRuntime = createCloudflareRequestScopedPostgresRuntime({
    createPool: () => {
      const pool = new FakePool()
      createdPools.push(pool)
      return pool
    },
  })
  const pool = new adapterRuntime.Pool({ connectionString: 'postgres://request-scoped.invalid/cms' })
  const form = new FormData()
  form.set('email', 'owner@example.invalid')
  form.set('password', 'not-a-real-secret')
  const request = new Request('https://cms.example.invalid/api/users/first-register', {
    body: form,
    method: 'POST',
  })
  const contentType = request.headers.get('content-type')
  const handlerGate = deferred()
  const context = executionContext()
  let forwardedContentType: string | null = null
  let forwardedBody: FormData | null = null

  const response = await wrapperRuntime.handleRequest(
    request,
    hyperdriveEnvironment,
    context,
    async (forwardedRequest, _environment, trackedContext) => {
      assert.notEqual(forwardedRequest, request)
      forwardedContentType = forwardedRequest.headers.get('content-type')
      trackedContext.waitUntil((async () => {
        await handlerGate.promise
        forwardedBody = await forwardedRequest.formData()
        await pool.query('first-user-auth')
      })())
      return new Response('accepted', { status: 202 })
    },
  )

  assert.equal(response.status, 202)
  assert.equal(request.bodyUsed, true)
  assert.equal(forwardedContentType, contentType)
  assert.match(forwardedContentType ?? '', /^multipart\/form-data;\s*boundary=/u)
  handlerGate.resolve()
  assert.equal(await response.text(), 'accepted')
  await drainWaits(context)

  const observedBody = forwardedBody as unknown as FormData
  assert.equal(observedBody.get('email'), 'owner@example.invalid')
  assert.equal(observedBody.get('password'), 'not-a-real-secret')
  assert.deepEqual(createdPools.map((created) => created.queries), [['first-user-auth']])
})

test('multipart mixed body is also materialized before deferred handling', async () => {
  const runtime = createCloudflareRequestScopedPostgresRuntime()
  const context = executionContext()
  const body = '--mixed-boundary\r\nContent-Type: text/plain\r\n\r\npart\r\n--mixed-boundary--\r\n'
  const original = new Request('https://cms.example.invalid/api/custom', {
    body,
    headers: { 'content-type': 'multipart/mixed; boundary=mixed-boundary' },
    method: 'POST',
  })
  let forwarded: Request | null = null
  const response = await runtime.handleRequest(
    original,
    hyperdriveEnvironment,
    context,
    async (request) => {
      forwarded = request
      return new Response(await request.text())
    },
  )

  assert.notEqual(forwarded, original)
  assert.equal((forwarded as unknown as Request).headers.get('content-type'),
    'multipart/mixed; boundary=mixed-boundary')
  assert.equal(await response.text(), body)
  await drainWaits(context)
})

test('oversized multipart is rejected before OpenNext or Payload sees it', async () => {
  const runtime = createCloudflareRequestScopedPostgresRuntime({
    createPool: () => new FakePool(),
  })
  let canceled = false
  const oversizedBody = new ReadableStream<Uint8Array>({
    cancel() {
      canceled = true
    },
    start(controller) {
      controller.enqueue(new Uint8Array(MAX_CLOUDFLARE_MULTIPART_BYTES))
      controller.enqueue(new Uint8Array(2))
    },
  })
  const context = executionContext()
  let called = false

  const response = await runtime.handleRequest(
    new Request('https://cms.example.invalid/api/users/first-register', {
      body: oversizedBody,
      headers: {
        'content-type': 'multipart/mixed; boundary=chunked-boundary',
      },
      method: 'POST',
      // Node requires this for a streaming request body. Workerd accepts the
      // same Fetch option even though it is not part of lib.dom RequestInit.
      ...({ duplex: 'half' } as unknown as RequestInit),
    }),
    hyperdriveEnvironment,
    context,
    async () => {
      called = true
      return new Response('unsafe')
    },
  )

  assert.equal(response.status, 413)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(called, false)
  assert.equal(canceled, true)
  await drainWaits(context)
})

test('declared oversized multipart is rejected before its body is read', async () => {
  const runtime = createCloudflareRequestScopedPostgresRuntime({
    createPool: () => new FakePool(),
  })
  const request = new Request('https://cms.example.invalid/api/users/first-register', {
    body: 'small-body-that-must-not-be-read',
    headers: {
      'content-length': String(MAX_CLOUDFLARE_MULTIPART_BYTES + 1),
      'content-type': 'multipart/form-data; boundary=declared-boundary',
    },
    method: 'POST',
  })
  const context = executionContext()

  const response = await runtime.handleRequest(
    request,
    hyperdriveEnvironment,
    context,
    async () => new Response('unsafe'),
  )

  assert.equal(response.status, 413)
  assert.equal(request.bodyUsed, false)
})

test('D1 and direct PostgreSQL bypass Hyperdrive scoping unchanged', async () => {
  for (const environment of [
    { CMS_DATABASE_ADAPTER: 'd1' },
    { CMS_DATABASE_ADAPTER: 'postgres', CMS_POSTGRES_TRANSPORT: 'direct' },
  ]) {
    const runtime = createCloudflareRequestScopedPostgresRuntime({
      createPool: () => {
        throw new Error('passthrough requests must not create a scoped pool')
      },
    })
    const context = executionContext()
    const request = new Request('https://cms.example.invalid/admin', {
      body: new FormData(),
      method: 'POST',
    })
    let observedContext: CloudflareRequestExecutionContext | null = null
    let observedRequest: Request | null = null

    const response = await runtime.handleRequest(
      request,
      environment,
      context,
      async (forwardedRequest, _environment, forwardedContext) => {
        observedRequest = forwardedRequest
        observedContext = forwardedContext
        return new Response('passthrough')
      },
    )

    assert.equal(observedRequest, request)
    assert.equal(observedContext, context)
    assert.equal(request.bodyUsed, false)
    assert.equal(await response.text(), 'passthrough')
    assert.equal(context.waits.length, 0)
  }
})

test('a thrown Hyperdrive handler still schedules request-pool cleanup', async () => {
  let finalized = 0
  const runtime = createCloudflareRequestScopedPostgresRuntime({
    createPool: () => new FakePool(),
    onRequestFinalized: ({ poolCount }) => {
      assert.equal(poolCount, 1)
      finalized += 1
    },
  })
  const pool = new runtime.Pool({ connectionString: 'postgres://request-scoped.invalid/cms' })
  const context = executionContext()

  await assert.rejects(
    runtime.handleRequest(
      new Request('https://cms.example.invalid/api/users'),
      hyperdriveEnvironment,
      context,
      async () => {
        await pool.query('before-error')
        throw new Error('synthetic handler failure')
      },
    ),
    /synthetic handler failure/u,
  )
  assert.equal(context.waits.length, 1)
  await drainWaits(context)
  assert.equal(finalized, 1)
})

test('request-scoped pool fails closed outside a Hyperdrive request', () => {
  const runtime = createCloudflareRequestScopedPostgresRuntime({
    createPool: () => new FakePool(),
  })
  const pool = new runtime.Pool({ connectionString: 'postgres://request-scoped.invalid/cms' })

  assert.throws(
    () => pool.query('outside-scope'),
    /outside an active Cloudflare request scope/u,
  )
})

test('response metadata and multiple auth cookies survive stream tracking', async () => {
  const runtime = createCloudflareRequestScopedPostgresRuntime()
  const context = executionContext()
  const response = await runtime.handleRequest(
    new Request('https://cms.example.invalid/api/users/first-register'),
    hyperdriveEnvironment,
    context,
    async () => {
      const headers = new Headers({ location: '/admin' })
      headers.append('set-cookie', 'payload-token=one; Path=/; HttpOnly')
      headers.append('set-cookie', 'payload-pref=two; Path=/; SameSite=Lax')
      return new Response('redirected', {
        headers,
        status: 307,
        statusText: 'Temporary Redirect',
      })
    },
  )

  const getSetCookie = (response.headers as Headers & {
    readonly getSetCookie?: () => string[]
  }).getSetCookie
  assert.equal(response.status, 307)
  assert.equal(response.statusText, 'Temporary Redirect')
  assert.equal(response.headers.get('location'), '/admin')
  assert.deepEqual(getSetCookie?.call(response.headers), [
    'payload-token=one; Path=/; HttpOnly',
    'payload-pref=two; Path=/; SameSite=Lax',
  ])
  assert.equal(await response.text(), 'redirected')
  await drainWaits(context)
})

test('canceling a streamed response settles and finalizes its request scope', async () => {
  let sourceCanceled = false
  let finalized = 0
  const runtime = createCloudflareRequestScopedPostgresRuntime({
    onRequestFinalized: () => {
      finalized += 1
    },
  })
  const context = executionContext()
  const response = await runtime.handleRequest(
    new Request('https://cms.example.invalid/admin'),
    hyperdriveEnvironment,
    context,
    async () => new Response(new ReadableStream<Uint8Array>({
      cancel() {
        sourceCanceled = true
      },
      start(controller) {
        controller.enqueue(new TextEncoder().encode('partial'))
      },
    })),
  )

  await response.body?.cancel('client disconnected')
  await drainWaits(context)
  assert.equal(sourceCanceled, true)
  assert.equal(finalized, 1)
})

test('deferred response stream pulls retain the originating database scope', async () => {
  const streamGate = deferred()
  const createdPools: FakePool[] = []
  const runtime = createCloudflareRequestScopedPostgresRuntime({
    createPool: () => {
      const pool = new FakePool()
      createdPools.push(pool)
      return pool
    },
  })
  const pool = new runtime.Pool({ connectionString: 'postgres://request-scoped.invalid/cms' })
  const context = executionContext()
  const response = await runtime.handleRequest(
    new Request('https://cms.example.invalid/admin'),
    hyperdriveEnvironment,
    context,
    async () => new Response(new ReadableStream<Uint8Array>({
      async pull(controller) {
        await streamGate.promise
        await pool.query('deferred-stream-pull')
        controller.enqueue(new TextEncoder().encode('streamed'))
        controller.close()
      },
    }, { highWaterMark: 0 })),
  )

  streamGate.resolve()
  assert.equal(await response.text(), 'streamed')
  await drainWaits(context)
  assert.deepEqual(createdPools.map((created) => created.queries), [['deferred-stream-pull']])
})

test('transitive waitUntil children keep the request scope active', async () => {
  const parentGate = deferred()
  const childGate = deferred()
  const childScheduled = deferred()
  const createdPools: FakePool[] = []
  let finalized = 0
  const runtime = createCloudflareRequestScopedPostgresRuntime({
    createPool: () => {
      const pool = new FakePool()
      createdPools.push(pool)
      return pool
    },
    onRequestFinalized: () => {
      finalized += 1
    },
  })
  const pool = new runtime.Pool({ connectionString: 'postgres://request-scoped.invalid/cms' })
  const context = executionContext()
  const response = await runtime.handleRequest(
    new Request('https://cms.example.invalid/api/prompt-artifacts'),
    hyperdriveEnvironment,
    context,
    async (_request, _environment, trackedContext) => {
      trackedContext.waitUntil((async () => {
        await parentGate.promise
        trackedContext.waitUntil((async () => {
          await childGate.promise
          await pool.query('transitive-child')
        })())
        childScheduled.resolve()
      })())
      return new Response('ready')
    },
  )

  assert.equal(await response.text(), 'ready')
  parentGate.resolve()
  await childScheduled.promise
  assert.equal(finalized, 0)
  childGate.resolve()
  await drainWaits(context)
  assert.equal(finalized, 1)
  assert.deepEqual(createdPools.map((created) => created.queries), [['transitive-child']])
})
