import { timingSafeEqual } from 'node:crypto'

import type { Endpoint } from 'payload'

import type { CmsEnvironment } from '../config/env.ts'
import {
  PayloadPublicSnapshotSource,
  PublicSnapshotError,
  PublicSnapshotService,
  type PublicSnapshotEnvelope,
  type PublicSnapshotPayloadApi,
} from '../snapshot/index.ts'

export interface PublicSnapshotEndpointOptions {
  readonly buildSnapshot?: (payload: PublicSnapshotPayloadApi) => Promise<PublicSnapshotEnvelope>
}

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

function authorized(header: string | null, expected: string): boolean {
  if (!header?.startsWith('Bearer ')) return false
  const supplied = header.slice('Bearer '.length)
  const suppliedBytes = Buffer.from(supplied, 'utf8')
  const expectedBytes = Buffer.from(expected, 'utf8')
  return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes)
}

function safeSnapshotError(error: PublicSnapshotError): {
  readonly code: string
  readonly detail: string
  readonly status: number
} {
  const code = /^[A-Z][A-Z0-9_]{2,63}$/u.test(error.code)
    ? error.code
    : 'PUBLIC_SNAPSHOT_FAILED'
  const detail = error.httpStatus === 409
    ? 'Current CMS state is not eligible for an immutable public snapshot'
    : error.httpStatus === 503
      ? 'Immutable public snapshot reading is currently unavailable'
      : 'Public snapshot export failed its safety validation'
  return { code, detail, status: error.httpStatus }
}

/**
 * Read-only transport for the external generated-mirror worker. The endpoint
 * has no Git, PR, deployment, or CMS write side effect.
 */
export function createPublicSnapshotEndpoint(
  environment: Pick<
    CmsEnvironment,
    'databaseAdapter' | 'publicSnapshotEnabled' | 'publicSnapshotToken'
  >,
  options: PublicSnapshotEndpointOptions = {},
): Endpoint {
  return {
    path: '/internal/v1/public-snapshot',
    method: 'get',
    handler: async (req) => {
      if (!environment.publicSnapshotEnabled || environment.publicSnapshotToken === null) {
        return jsonResponse(
          { code: 'PUBLIC_SNAPSHOT_DISABLED', detail: 'Public snapshot export is disabled', status: 404 },
          404,
        )
      }
      if (!authorized(req.headers.get('authorization'), environment.publicSnapshotToken)) {
        return jsonResponse(
          { code: 'UNAUTHENTICATED', detail: 'A valid snapshot Bearer token is required', status: 401 },
          401,
        )
      }

      try {
        const payload = req.payload as unknown as PublicSnapshotPayloadApi
        const envelope = options.buildSnapshot
          ? await options.buildSnapshot(payload)
          : await new PublicSnapshotService(
              new PayloadPublicSnapshotSource(payload, environment.databaseAdapter),
            ).build()
        return jsonResponse(envelope, 200)
      } catch (error: unknown) {
        if (error instanceof PublicSnapshotError) {
          const safe = safeSnapshotError(error)
          return jsonResponse(safe, error.httpStatus)
        }
        return jsonResponse(
          { code: 'PUBLIC_SNAPSHOT_FAILED', detail: 'Public snapshot export failed', status: 500 },
          500,
        )
      }
    },
  }
}
