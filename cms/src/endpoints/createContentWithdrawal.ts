import type { Endpoint } from 'payload'

import { hasAnyRole } from '../access/policy.ts'
import {
  ContentWithdrawalIdempotencyConflictError,
  ContentWithdrawalInputError,
  ContentWithdrawalRevisionConflictError,
  type ContentWithdrawalClock,
  type ContentWithdrawalInput,
  type ContentWithdrawalRecord,
  type ContentWithdrawalRepository,
  type ContentWithdrawalRightsReader,
} from '../domain/index.ts'
import {
  ContentWithdrawalService,
  normalizeContentWithdrawalInput,
  PayloadContentWithdrawalRepository,
  PayloadContentWithdrawalRightsReader,
  type ContentWithdrawalPayloadLocalApi,
} from '../withdrawal/index.ts'
import {
  PublicationDecisionTransactionError,
  runSerializablePayloadDecision,
  type PublicationDecisionTransactionalPayload,
} from '../decision/index.ts'

export interface ContentWithdrawalEndpointOptions {
  readonly clock?: ContentWithdrawalClock
  readonly createRepository?: (
    payload: ContentWithdrawalPayloadLocalApi,
  ) => ContentWithdrawalRepository
  readonly createRightsReader?: (
    payload: ContentWithdrawalPayloadLocalApi,
  ) => ContentWithdrawalRightsReader
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function routeArtifactId(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ContentWithdrawalInputError('artifactId route parameter is required')
  }
  return value
}

function userId(user: unknown): string | null {
  const id = record(user)?.id
  return typeof id === 'string' || typeof id === 'number' ? String(id) : null
}

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

async function requestBody(req: Parameters<Endpoint['handler']>[0]): Promise<Record<string, unknown>> {
  const readJson = req.json?.bind(req)
  if (!readJson) throw new ContentWithdrawalInputError('Request body must be valid JSON')
  const body = record(await readJson().catch(() => {
    throw new ContentWithdrawalInputError('Request body must be valid JSON')
  }))
  if (!body) throw new ContentWithdrawalInputError('Request body must be a JSON object')
  return body
}

function authorized(req: Parameters<Endpoint['handler']>[0]): Response | null {
  if (!req.user) {
    return jsonResponse({ code: 'UNAUTHENTICATED', detail: 'Authentication is required', status: 401 }, 401)
  }
  if (!hasAnyRole(req.user, ['reviewer', 'admin'])) {
    return jsonResponse({ code: 'FORBIDDEN', detail: 'Reviewer or admin role is required', status: 403 }, 403)
  }
  return null
}

function repositoryFor(
  payload: ContentWithdrawalPayloadLocalApi,
  options: ContentWithdrawalEndpointOptions,
): ContentWithdrawalRepository {
  return options.createRepository?.(payload) ?? new PayloadContentWithdrawalRepository(payload)
}

function serviceFor(
  payload: ContentWithdrawalPayloadLocalApi,
  options: ContentWithdrawalEndpointOptions,
): ContentWithdrawalService {
  const repository = repositoryFor(payload, options)
  const rightsReader = options.createRightsReader?.(payload) ?? new PayloadContentWithdrawalRightsReader(payload)
  return new ContentWithdrawalService(repository, rightsReader, {
    ...(options.clock ? { clock: options.clock } : {}),
  })
}

function sameCommittedWithdrawal(
  expected: ContentWithdrawalRecord,
  actual: ContentWithdrawalRecord | null,
): boolean {
  return actual !== null &&
    actual.id === expected.id &&
    actual.decisionFingerprint === expected.decisionFingerprint &&
    actual.decisionSequence === expected.decisionSequence &&
    actual.rightsRevision === expected.rightsRevision &&
    actual.syncEventRevision === expected.syncEventRevision
}

function errorResponse(error: unknown): Response {
  if (error instanceof ContentWithdrawalInputError) {
    return jsonResponse({ code: error.code, detail: error.message, status: 422 }, 422)
  }
  if (
    error instanceof ContentWithdrawalIdempotencyConflictError ||
    error instanceof ContentWithdrawalRevisionConflictError
  ) {
    return jsonResponse({ code: error.code, detail: error.message, status: 409 }, 409)
  }
  if (error instanceof PublicationDecisionTransactionError) {
    return jsonResponse(
      { code: error.code, detail: error.message, status: error.httpStatus },
      error.httpStatus,
    )
  }
  return jsonResponse(
    { code: 'CONTENT_WITHDRAWAL_FAILED', detail: 'Content withdrawal failed', status: 500 },
    500,
  )
}

/** Returns the revision a reviewer must echo when appending a tombstone. */
export function createPrepareContentWithdrawalEndpoint(
  options: ContentWithdrawalEndpointOptions = {},
): Endpoint {
  return {
    path: '/internal/v1/artifacts/:artifactId/withdrawals/prepare',
    method: 'post',
    handler: async (req) => {
      const denied = authorized(req)
      if (denied) return denied
      try {
        const body = await requestBody(req)
        const payload = req.payload as unknown as ContentWithdrawalPayloadLocalApi
        const prepared = await serviceFor(payload, options).prepare(
          routeArtifactId(req.routeParams?.artifactId),
          body.locale,
          body.decision,
          body.caseId,
        )
        return jsonResponse({ data: prepared }, 200)
      } catch (error: unknown) {
        return errorResponse(error)
      }
    },
  }
}

/**
 * Appends an immutable reviewer tombstone and a disabled outbox source event.
 * No automatic Git/mirror/deploy dispatcher exists in this beta.
 */
export function createContentWithdrawalEndpoint(
  options: ContentWithdrawalEndpointOptions = {},
): Endpoint {
  return {
    path: '/internal/v1/artifacts/:artifactId/withdrawals',
    method: 'post',
    handler: async (req) => {
      const denied = authorized(req)
      if (denied) return denied
      const withdrawnBy = userId(req.user)
      if (!withdrawnBy) {
        return jsonResponse({ code: 'FORBIDDEN', detail: 'Authenticated user id is missing', status: 403 }, 403)
      }
      try {
        const body = await requestBody(req)
        const idempotencyKey = req.headers.get('idempotency-key')
        if (!idempotencyKey) {
          throw new ContentWithdrawalInputError('Idempotency-Key header is required')
        }
        for (const field of ['locale', 'decision', 'caseId', 'expectedRightsRevision']) {
          if (typeof body[field] !== 'string') {
            throw new ContentWithdrawalInputError(
              'locale, decision, caseId and expectedRightsRevision must be strings',
            )
          }
        }
        if (!Number.isSafeInteger(body.expectedDecisionSequence) || Number(body.expectedDecisionSequence) < 0) {
          throw new ContentWithdrawalInputError(
            'expectedDecisionSequence must be a non-negative integer',
          )
        }
        const input = normalizeContentWithdrawalInput({
          artifactId: routeArtifactId(req.routeParams?.artifactId),
          caseId: String(body.caseId),
          decision: String(body.decision),
          expectedDecisionSequence: Number(body.expectedDecisionSequence),
          expectedRightsRevision: String(body.expectedRightsRevision),
          idempotencyKey,
          locale: String(body.locale),
        } satisfies ContentWithdrawalInput)
        const payload = req.payload as unknown as PublicationDecisionTransactionalPayload
        const withdrawal = await runSerializablePayloadDecision(
          payload,
          input.artifactId,
          async (transactionalPayload) => serviceFor(
            transactionalPayload as ContentWithdrawalPayloadLocalApi,
            options,
          ).withdraw(input, withdrawnBy),
          async (committedPayload, expected) => {
            const repository = repositoryFor(
              committedPayload as ContentWithdrawalPayloadLocalApi,
              options,
            )
            return sameCommittedWithdrawal(
              expected,
              await repository.findByIdempotencyKey(expected.idempotencyKey),
            )
          },
        )
        return jsonResponse({ data: withdrawal }, 201)
      } catch (error: unknown) {
        return errorResponse(error)
      }
    },
  }
}
