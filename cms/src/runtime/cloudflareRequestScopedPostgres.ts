import { AsyncLocalStorage } from 'node:async_hooks'

import pg from 'pg'
import type { PoolClient, PoolConfig } from 'pg'

const REQUEST_SCOPE_STORAGE = Symbol.for('pseo.cms.cloudflare-postgres-request-scope.v1')

export const MAX_CLOUDFLARE_MULTIPART_BYTES = 1024 * 1024

export interface CloudflareRequestExecutionContext {
  readonly passThroughOnException?: () => void
  readonly waitUntil: (promise: Promise<unknown>) => void
}

export interface RequestScopedPoolLike {}

interface RequestScope {
  active: boolean
  readonly pending: Set<Promise<void>>
  readonly pools: Map<object, RequestScopedPoolLike>
}

interface RuntimeDependencies {
  readonly createPool?: (options: PoolConfig) => RequestScopedPoolLike
  readonly onRequestFinalized?: (summary: { readonly poolCount: number }) => void
}

type WorkerHandler<Environment> = (
  request: Request,
  environment: Environment,
  context: CloudflareRequestExecutionContext,
) => Promise<Response>

function requestScopeStorage(): AsyncLocalStorage<RequestScope> {
  const existing = Reflect.get(globalThis, REQUEST_SCOPE_STORAGE) as unknown
  if (existing) return existing as AsyncLocalStorage<RequestScope>

  const storage = new AsyncLocalStorage<RequestScope>()
  Object.defineProperty(globalThis, REQUEST_SCOPE_STORAGE, {
    configurable: false,
    enumerable: false,
    value: storage,
    writable: false,
  })
  return storage
}

function requiredMethod(
  target: object,
  name: string,
): (...arguments_: unknown[]) => unknown {
  const method = Reflect.get(target, name) as unknown
  if (typeof method !== 'function') {
    throw new Error(`Request-scoped PostgreSQL pool does not implement ${name}`)
  }
  return method.bind(target) as (...arguments_: unknown[]) => unknown
}

function wrapConnectedClient(
  value: unknown,
  claimBootstrapProbe: () => boolean,
): unknown {
  if (!value || typeof value !== 'object') return value

  const client = value as PoolClient
  let released = false
  let proxy: PoolClient
  proxy = new Proxy(client, {
    get(target, property) {
      if (property === 'prependListener') {
        return (event: string | symbol, listener: (...arguments_: unknown[]) => void) => {
          // Payload's PostgreSQL adapter performs a bootstrap `pool.connect()`
          // only to attach this error listener. It otherwise never releases the
          // client. Releasing this exact probe prevents request finalization
          // from retaining a checked-out socket. Drizzle transaction clients do
          // not use this probe pattern and remain checked out until `release()`.
          if (event === 'error' && !released && claimBootstrapProbe()) {
            released = true
            target.release()
            // Do not retain Payload's reconnect listener on a client returned
            // to a request-local pool. If it fired after finalization it would
            // retry through setTimeout outside any active request scope.
            return proxy
          }
          const result = target.prependListener(event, listener)
          return result === target ? proxy : result
        }
      }
      if (property === 'release') {
        return (...arguments_: unknown[]) => {
          if (released) return
          released = true
          Reflect.apply(target.release, target, arguments_)
        }
      }
      const result = Reflect.get(target, property, target) as unknown
      return typeof result === 'function' ? result.bind(target) : result
    },
  })
  return proxy
}

function contentLength(request: Request): number | null {
  const value = request.headers.get('content-length')
  if (value === null) return null
  if (!/^\d+$/u.test(value)) return Number.NaN
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : Number.NaN
}

function isMultipart(request: Request): boolean {
  // Payload 3.88 routes every multipart subtype through its Fetch multipart
  // reader, not only form-data. Keep this boundary aligned so multipart/mixed
  // cannot bypass request-scope-safe materialization.
  return /^multipart\/[^;\s]+(?:\s*;|$)/iu.test(
    request.headers.get('content-type') ?? '',
  )
}

function multipartError(status: 400 | 413, code: string): Response {
  return Response.json({ code, message: 'Multipart request could not be accepted' }, {
    headers: {
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
    status,
  })
}

async function materializeMultipartRequest(
  request: Request,
): Promise<Request | Response> {
  if (!isMultipart(request) || request.method === 'GET' || request.method === 'HEAD') {
    return request
  }

  const declaredLength = contentLength(request)
  if (Number.isNaN(declaredLength)) {
    return multipartError(400, 'INVALID_MULTIPART_LENGTH')
  }
  if (declaredLength !== null && declaredLength > MAX_CLOUDFLARE_MULTIPART_BYTES) {
    return multipartError(413, 'MULTIPART_TOO_LARGE')
  }
  if (!request.body || request.bodyUsed) {
    return multipartError(400, 'INVALID_MULTIPART_BODY')
  }

  const chunks: Uint8Array[] = []
  const reader = request.body.getReader()
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_CLOUDFLARE_MULTIPART_BYTES) {
        await reader.cancel('multipart request exceeds the CMS limit')
        return multipartError(413, 'MULTIPART_TOO_LARGE')
      }
      chunks.push(value)
    }
  } catch {
    return multipartError(400, 'INVALID_MULTIPART_BODY')
  } finally {
    reader.releaseLock()
  }

  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }

  // Constructing from the original request preserves its exact multipart
  // Content-Type (including boundary), cookies, signal and Cloudflare metadata.
  // The replacement body is memory-backed, so OpenNext may safely defer its
  // Payload handler through waitUntil without crossing a request-stream scope.
  return new Request(request, { body })
}

function trackResponseBody(
  response: Response,
  storage: AsyncLocalStorage<RequestScope>,
  scope: RequestScope,
): {
  readonly response: Response
  readonly settled: Promise<void>
} {
  if (!response.body) return { response, settled: Promise.resolve() }

  const reader = response.body.getReader()
  let resolveSettled!: () => void
  const settled = new Promise<void>((resolve) => {
    resolveSettled = resolve
  })
  let didSettle = false
  const settle = () => {
    if (didSettle) return
    didSettle = true
    resolveSettled()
  }
  const body = new ReadableStream<Uint8Array>({
    async cancel(reason) {
      try {
        await storage.run(scope, () => reader.cancel(reason))
      } finally {
        settle()
      }
    },
    async pull(controller) {
      try {
        // Streaming render work can lazily touch Payload after fetch() has
        // returned its headers. Re-enter the same request scope for every read.
        const next = await storage.run(scope, () => reader.read())
        if (next.done) {
          controller.close()
          settle()
          return
        }
        controller.enqueue(next.value)
      } catch (error) {
        controller.error(error)
        settle()
      }
    },
  })
  return {
    response: new Response(body, {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
    }),
    settled,
  }
}

function trackedExecutionContext(
  context: CloudflareRequestExecutionContext,
  scope: RequestScope,
): CloudflareRequestExecutionContext {
  return new Proxy(context, {
    get(target, property) {
      if (property === 'waitUntil') {
        return (promise: Promise<unknown>) => {
          const original = Promise.resolve(promise)
          target.waitUntil(original)
          const observed = original.then(
            () => undefined,
            () => undefined,
          )
          scope.pending.add(observed)
          void observed.then(() => scope.pending.delete(observed))
        }
      }
      const value = Reflect.get(target, property, target) as unknown
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

async function drainTrackedWork(scope: RequestScope): Promise<void> {
  do {
    const pending = [...scope.pending]
    if (pending.length > 0) await Promise.all(pending)
    // A settled parent may register one last child waitUntil in its final
    // microtask. Yield once before deciding that the scope is drained.
    await Promise.resolve()
  } while (scope.pending.size > 0)
}

function usesHyperdrive(environment: object): boolean {
  return Reflect.get(environment, 'CMS_DATABASE_ADAPTER') === 'postgres'
    && Reflect.get(environment, 'CMS_POSTGRES_TRANSPORT') === 'hyperdrive'
}

export function createCloudflareRequestScopedPostgresRuntime(
  dependencies: RuntimeDependencies = {},
) {
  const storage = requestScopeStorage()
  const createPool = dependencies.createPool
    ?? ((options: PoolConfig) => new pg.Pool(options))

  class CloudflareRequestScopedPool extends pg.Pool {
    #bootstrapProbeAvailable = true
    readonly #identity = {}
    readonly #options: PoolConfig

    constructor(options: PoolConfig) {
      // pg.Pool does not create a socket until connect/query. Extending it is
      // intentional: Drizzle selects its safe, single-client transaction path
      // with `instanceof Pool`, which must remain true after bundling/minifying.
      super(options)
      this.#options = { ...options }
      return new Proxy(this, {
        get: (target, property) => {
          if (property === 'connect') return target.#connect.bind(target)
          if (property === 'query') {
            return (...arguments_: unknown[]) => (
              requiredMethod(target.#currentPool(), 'query')(...arguments_)
            )
          }
          if (property === 'end') {
            return (...arguments_: unknown[]) => (
              requiredMethod(target.#currentPool(), 'end')(...arguments_)
            )
          }
          const own = Reflect.get(target, property, target) as unknown
          return typeof own === 'function' ? own.bind(target) : own
        },
      })
    }

    #currentPool(): RequestScopedPoolLike {
      const scope = storage.getStore()
      if (!scope?.active) {
        throw new Error(
          'Hyperdrive PostgreSQL pool used outside an active Cloudflare request scope',
        )
      }
      let pool = scope.pools.get(this.#identity)
      if (!pool) {
        pool = createPool(this.#options)
        scope.pools.set(this.#identity, pool)
      }
      return pool
    }

    #connect(...arguments_: unknown[]): unknown {
      const connect = requiredMethod(this.#currentPool(), 'connect')
      const claimBootstrapProbe = () => {
        if (!this.#bootstrapProbeAvailable) return false
        this.#bootstrapProbeAvailable = false
        return true
      }
      const callback = arguments_[0]
      if (typeof callback === 'function') {
        return connect((error: unknown, client: unknown, done: unknown) => {
          callback(
            error,
            error ? client : wrapConnectedClient(client, claimBootstrapProbe),
            done,
          )
        })
      }
      return Promise.resolve(connect()).then((client) => (
        wrapConnectedClient(client, claimBootstrapProbe)
      ))
    }
  }

  async function handleRequest<Environment extends object>(
    request: Request,
    environment: Environment,
    context: CloudflareRequestExecutionContext,
    handler: WorkerHandler<Environment>,
  ): Promise<Response> {
    if (!usesHyperdrive(environment)) {
      return handler(request, environment, context)
    }
    const materialized = await materializeMultipartRequest(request)
    if (materialized instanceof Response) return materialized

    const scope: RequestScope = {
      active: true,
      pending: new Set(),
      pools: new Map(),
    }
    const trackedContext = trackedExecutionContext(context, scope)
    let response: Response
    try {
      response = await storage.run(
        scope,
        () => handler(materialized, environment, trackedContext),
      )
    } catch (error) {
      const finalize = drainTrackedWork(scope).finally(() => {
        const poolCount = scope.pools.size
        scope.active = false
        scope.pools.clear()
        dependencies.onRequestFinalized?.({ poolCount })
      })
      context.waitUntil(finalize)
      throw error
    }

    const trackedBody = trackResponseBody(response, storage, scope)
    const finalize = (async () => {
      await trackedBody.settled
      await drainTrackedWork(scope)
      const poolCount = scope.pools.size
      scope.active = false
      // Cloudflare automatically tears down the Worker-to-Hyperdrive edge
      // connection at invocation end. Dropping every strong reference here is
      // safer than awaiting pg.Pool.end(), which can hang on a leaked client.
      scope.pools.clear()
      dependencies.onRequestFinalized?.({ poolCount })
    })()
    // Use the original context so this finalizer does not track itself.
    context.waitUntil(finalize)
    return trackedBody.response
  }

  return {
    Pool: CloudflareRequestScopedPool as unknown as typeof pg.Pool,
    handleRequest,
  }
}

const productionRuntime = createCloudflareRequestScopedPostgresRuntime()

export const cloudflareRequestScopedPg = {
  ...pg,
  Pool: productionRuntime.Pool,
} as typeof pg

export const handleCloudflareCmsRequest = productionRuntime.handleRequest
