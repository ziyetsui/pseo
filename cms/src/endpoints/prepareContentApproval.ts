import type { Endpoint } from 'payload'

import { hasAnyRole } from '../access/policy.ts'
import {
  ContentApprovalInputError,
  PublicationContentValidationError,
  type ContentApprovalRepository,
  type ContentApprovalValidator,
} from '../domain/index.ts'
import {
  ContentApprovalService,
  PayloadContentApprovalRepository,
  type ContentApprovalPayloadLocalApi,
} from '../approval/index.ts'
import { PayloadDraftContentValidator } from '../publication/payloadDraftContentValidator.ts'

export interface PrepareContentApprovalEndpointOptions {
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

function localeFromBody(value: unknown): string {
  const body = record(value)
  if (!body || typeof body.locale !== 'string') {
    throw new ContentApprovalInputError('Request body must contain a locale string')
  }
  return body.locale
}

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

/**
 * Re-validates one saved artifact locale and returns only immutable revisions
 * and file metadata. It has no Git dependency and performs no write.
 */
export function createPrepareContentApprovalEndpoint(
  options: PrepareContentApprovalEndpointOptions = {},
): Endpoint {
  return {
    path: '/internal/v1/artifacts/:artifactId/approvals/prepare',
    method: 'post',
    handler: async (req) => {
      if (!req.user) {
        return jsonResponse({ code: 'UNAUTHENTICATED', detail: 'Authentication is required', status: 401 }, 401)
      }
      if (!hasAnyRole(req.user, ['reviewer', 'admin'])) {
        return jsonResponse({ code: 'FORBIDDEN', detail: 'Reviewer or admin role is required', status: 403 }, 403)
      }

      try {
        const readJson = req.json?.bind(req)
        if (!readJson) throw new ContentApprovalInputError('Request body must be valid JSON')
        const body = await readJson().catch(() => {
          throw new ContentApprovalInputError('Request body must be valid JSON')
        })
        const artifactId = routeArtifactId(req.routeParams?.artifactId)
        const locale = localeFromBody(body)
        const payload = req.payload as unknown as ContentApprovalPayloadLocalApi
        const repository = options.createRepository?.(payload) ?? new PayloadContentApprovalRepository(payload)
        const validator = options.createValidator?.(payload) ?? new PayloadDraftContentValidator(payload) as unknown as ContentApprovalValidator
        const service = new ContentApprovalService(repository, validator, {
          ...(options.rightsPolicyVersion ? { rightsPolicyVersion: options.rightsPolicyVersion } : {}),
        })
        const prepared = await service.prepare(artifactId, locale)
        return jsonResponse({ data: prepared }, 200)
      } catch (error: unknown) {
        if (error instanceof ContentApprovalInputError) {
          return jsonResponse({ code: error.code, detail: error.message, status: 422 }, 422)
        }
        if (error instanceof PublicationContentValidationError) {
          return jsonResponse(
            { code: error.code, detail: error.message, errors: error.issues, status: 422 },
            422,
          )
        }
        return jsonResponse(
          { code: 'CONTENT_APPROVAL_PREPARE_FAILED', detail: 'Content approval preparation failed', status: 500 },
          500,
        )
      }
    },
  }
}
