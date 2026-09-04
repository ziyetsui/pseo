import type { Endpoint } from 'payload'

import { hasAnyRole } from '../access/policy.ts'
import {
  ContentApprovalIdempotencyConflictError,
  ContentApprovalInputError,
  ContentApprovalRevisionConflictError,
  PublicationContentValidationError,
  type ContentApprovalClock,
  type ContentApprovalInput,
  type ContentApprovalRecord,
  type ContentApprovalRepository,
  type ContentApprovalValidator,
} from '../domain/index.ts'
import {
  ContentApprovalService,
  normalizeContentApprovalInput,
  PayloadContentApprovalRepository,
  type ContentApprovalPayloadLocalApi,
} from '../approval/index.ts'
import {
  PublicationDecisionTransactionError,
  runSerializablePayloadDecision,
  type PublicationDecisionTransactionalPayload,
} from '../decision/index.ts'
import { PayloadDraftContentValidator } from '../publication/payloadDraftContentValidator.ts'

export interface CreateContentApprovalEndpointOptions {
  readonly clock?: ContentApprovalClock
  readonly createRepository?: (payload: ContentApprovalPayloadLocalApi) => ContentApprovalRepository
  readonly createValidator?: (payload: ContentApprovalPayloadLocalApi) => ContentApprovalValidator
  readonly rightsPolicyVersion?: string
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function routeArtifactId(value: unknown): string {
  if (typeof value !== 'string') throw new ContentApprovalInputError('artifactId route parameter is required')
  return value
}

function parseRequestBody(
  artifactId: string,
  value: unknown,
  idempotencyKey: string | null,
): ContentApprovalInput {
  const body = record(value)
  if (!body) throw new ContentApprovalInputError('Request body must be a JSON object')
  if (!idempotencyKey) throw new ContentApprovalInputError('Idempotency-Key header is required')
  if (
    typeof body.locale !== 'string' ||
    typeof body.expectedContentRevision !== 'string' ||
    !Number.isSafeInteger(body.expectedDecisionSequence) ||
    Number(body.expectedDecisionSequence) < 0 ||
    typeof body.expectedRightsRevision !== 'string' ||
    typeof body.expectedSourceRevision !== 'string' ||
    typeof body.expectedRightsPolicyVersion !== 'string'
  ) {
    throw new ContentApprovalInputError(
      'locale, revision fields and expectedRightsPolicyVersion must be strings; expectedDecisionSequence must be a non-negative integer',
    )
  }
  return {
    artifactId,
    expectedContentRevision: body.expectedContentRevision,
    expectedDecisionSequence: Number(body.expectedDecisionSequence),
    expectedRightsPolicyVersion: body.expectedRightsPolicyVersion,
    expectedRightsRevision: body.expectedRightsRevision,
    expectedSourceRevision: body.expectedSourceRevision,
    idempotencyKey,
    locale: body.locale,
  }
}

function repositoryFor(
  payload: ContentApprovalPayloadLocalApi,
  options: CreateContentApprovalEndpointOptions,
): ContentApprovalRepository {
  return options.createRepository?.(payload) ?? new PayloadContentApprovalRepository(payload)
}

function serviceFor(
  payload: ContentApprovalPayloadLocalApi,
  options: CreateContentApprovalEndpointOptions,
): ContentApprovalService {
  const repository = repositoryFor(payload, options)
  const validator = options.createValidator?.(payload) ?? new PayloadDraftContentValidator(payload)
  return new ContentApprovalService(repository, validator, {
    ...(options.clock ? { clock: options.clock } : {}),
    ...(options.rightsPolicyVersion ? { rightsPolicyVersion: options.rightsPolicyVersion } : {}),
  })
}

function sameCommittedApproval(
  expected: ContentApprovalRecord,
  actual: ContentApprovalRecord | null,
): boolean {
  return actual !== null &&
    actual.id === expected.id &&
    actual.decisionFingerprint === expected.decisionFingerprint &&
    actual.decisionSequence === expected.decisionSequence &&
    actual.contentRevision === expected.contentRevision &&
    actual.sourceRevision === expected.sourceRevision &&
    actual.rightsRevision === expected.rightsRevision
}

function userId(user: unknown): string | null {
  const candidate = record(user)
  const id = candidate?.id
  return typeof id === 'string' || typeof id === 'number' ? String(id) : null
}

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

/**
 * Appends a revision-bound human approval audit. It deliberately has no Git,
 * mirror, deployment, or CMS public-state side effect.
 */
export function createContentApprovalEndpoint(
  options: CreateContentApprovalEndpointOptions = {},
): Endpoint {
  return {
    path: '/internal/v1/artifacts/:artifactId/approvals',
    method: 'post',
    handler: async (req) => {
      if (!req.user) {
        return jsonResponse({ code: 'UNAUTHENTICATED', detail: 'Authentication is required', status: 401 }, 401)
      }
      if (!hasAnyRole(req.user, ['reviewer', 'admin'])) {
        return jsonResponse({ code: 'FORBIDDEN', detail: 'Reviewer or admin role is required', status: 403 }, 403)
      }
      const approvedBy = userId(req.user)
      if (!approvedBy) {
        return jsonResponse({ code: 'FORBIDDEN', detail: 'Authenticated user id is missing', status: 403 }, 403)
      }

      try {
        const readJson = req.json?.bind(req)
        if (!readJson) throw new ContentApprovalInputError('Request body must be valid JSON')
        const body = await readJson().catch(() => {
          throw new ContentApprovalInputError('Request body must be valid JSON')
        })
        const input = normalizeContentApprovalInput(parseRequestBody(
          routeArtifactId(req.routeParams?.artifactId),
          body,
          req.headers.get('idempotency-key'),
        ))
        const payload = req.payload as unknown as PublicationDecisionTransactionalPayload
        const approval = await runSerializablePayloadDecision(
          payload,
          input.artifactId,
          async (transactionalPayload) => serviceFor(
            transactionalPayload as ContentApprovalPayloadLocalApi,
            options,
          ).approve(input, approvedBy),
          async (committedPayload, expected) => {
            const repository = repositoryFor(
              committedPayload as ContentApprovalPayloadLocalApi,
              options,
            )
            return sameCommittedApproval(
              expected,
              await repository.findByIdempotencyKey(expected.idempotencyKey),
            )
          },
        )
        return jsonResponse({ data: approval }, 201)
      } catch (error: unknown) {
        if (error instanceof ContentApprovalInputError) {
          return jsonResponse({ code: error.code, detail: error.message, status: 422 }, 422)
        }
        if (
          error instanceof ContentApprovalIdempotencyConflictError ||
          error instanceof ContentApprovalRevisionConflictError
        ) {
          return jsonResponse({ code: error.code, detail: error.message, status: 409 }, 409)
        }
        if (error instanceof PublicationContentValidationError) {
          return jsonResponse(
            { code: error.code, detail: error.message, errors: error.issues, status: 422 },
            422,
          )
        }
        if (error instanceof PublicationDecisionTransactionError) {
          return jsonResponse(
            { code: error.code, detail: error.message, status: error.httpStatus },
            error.httpStatus,
          )
        }
        return jsonResponse(
          { code: 'CONTENT_APPROVAL_FAILED', detail: 'Content approval failed', status: 500 },
          500,
        )
      }
    },
  }
}
