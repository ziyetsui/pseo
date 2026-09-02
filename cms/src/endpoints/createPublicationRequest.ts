import type { Endpoint } from 'payload'

import { hasAnyRole } from '@/access'
import {
  GitPublisherUnavailableError,
  PublicationBaseRevisionConflictError,
  PublicationContentRevisionConflictError,
  PublicationContentValidationError,
  PublicationIdempotencyConflictError,
  PublicationRequestInputError,
  type GitPublisher,
  type PublicationRequestInput,
} from '@/domain'
import {
  PayloadPublicationRequestRepository,
  PayloadDraftContentValidator,
  PublicationRequestService,
  type PayloadLocalApi,
} from '@/publication'

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function parseRequestBody(value: unknown, idempotencyKey: string | null): PublicationRequestInput {
  const body = record(value)
  if (!body) throw new PublicationRequestInputError('Request body must be a JSON object')
  if (!idempotencyKey) {
    throw new PublicationRequestInputError('Idempotency-Key header is required')
  }
  if (!Array.isArray(body.locales) || !body.locales.every((locale) => typeof locale === 'string')) {
    throw new PublicationRequestInputError('locales must be an array of locale strings')
  }
  if (
    typeof body.artifactId !== 'string' ||
    typeof body.expectedBaseSha !== 'string' ||
    typeof body.expectedContentRevision !== 'string' ||
    typeof body.expectedSourceRevision !== 'string' ||
    typeof body.commitMessage !== 'string'
  ) {
    throw new PublicationRequestInputError(
      'artifactId, expectedBaseSha, expectedContentRevision, expectedSourceRevision and commitMessage must be strings',
    )
  }
  return {
    artifactId: body.artifactId,
    expectedBaseSha: body.expectedBaseSha,
    expectedContentRevision: body.expectedContentRevision,
    expectedSourceRevision: body.expectedSourceRevision,
    commitMessage: body.commitMessage,
    locales: body.locales,
    idempotencyKey,
  }
}

function userId(user: unknown): string | null {
  const candidate = record(user)
  const id = candidate?.id
  return typeof id === 'string' || typeof id === 'number' ? String(id) : null
}

function response(status: number, code: string, detail: string): Response {
  return Response.json({ code, detail, status }, { status })
}

interface EditorialPreflight {
  readonly artifactDocumentId: string | number
}

async function preflight(
  payload: PayloadLocalApi,
  input: PublicationRequestInput,
): Promise<EditorialPreflight> {
  const artifacts = await payload.find({
    collection: 'prompt-artifacts',
    depth: 0,
    draft: true,
    limit: 2,
    overrideAccess: true,
    where: { artifactKey: { equals: input.artifactId } },
  })
  if (artifacts.docs.length !== 1) {
    throw new PublicationRequestInputError('artifactId must resolve to exactly one PromptArtifact draft')
  }
  const artifact = record(artifacts.docs[0])
  const artifactDocumentId = artifact?.id
  if (typeof artifactDocumentId !== 'string' && typeof artifactDocumentId !== 'number') {
    throw new PublicationRequestInputError('PromptArtifact draft has no valid document id')
  }
  return { artifactDocumentId }
}

/**
 * Mounted below Payload's REST prefix as POST /api/internal/v1/publication-requests.
 * The production Python API may later proxy or replace this adapter without
 * changing the GitPublisher/PublicationRequest contracts.
 */
export function createPublicationRequestEndpoint(gitPublisher: GitPublisher): Endpoint {
  return {
    path: '/internal/v1/publication-requests',
    method: 'post',
    handler: async (req) => {
      if (!req.user) return response(401, 'UNAUTHENTICATED', 'Authentication is required')
      if (!hasAnyRole(req.user, ['reviewer', 'admin'])) {
        return response(403, 'FORBIDDEN', 'Reviewer or admin role is required')
      }
      const requestedBy = userId(req.user)
      if (!requestedBy) return response(403, 'FORBIDDEN', 'Authenticated user id is missing')

      try {
        const readJson = req.json?.bind(req)
        if (!readJson) {
          throw new PublicationRequestInputError('Request body must be valid JSON')
        }
        const body = await readJson().catch(() => {
          throw new PublicationRequestInputError('Request body must be valid JSON')
        })
        const input = parseRequestBody(body, req.headers.get('idempotency-key'))
        const payload = req.payload as unknown as PayloadLocalApi
        const { artifactDocumentId } = await preflight(payload, input)
        const repository = new PayloadPublicationRequestRepository({
          artifactDocumentId,
          payload,
        })
        const contentValidator = new PayloadDraftContentValidator(payload)
        const service = new PublicationRequestService(repository, gitPublisher, contentValidator)
        const publicationRequest = await service.create(input, requestedBy)
        return Response.json({ data: publicationRequest }, { status: 202 })
      } catch (error: unknown) {
        if (error instanceof PublicationRequestInputError) {
          return response(422, error.code, error.message)
        }
        if (
          error instanceof PublicationIdempotencyConflictError ||
          error instanceof PublicationBaseRevisionConflictError ||
          error instanceof PublicationContentRevisionConflictError
        ) {
          return response(409, error.code, error.message)
        }
        if (error instanceof PublicationContentValidationError) {
          return Response.json(
            { code: error.code, detail: error.message, errors: error.issues, status: 422 },
            { status: 422 },
          )
        }
        if (error instanceof GitPublisherUnavailableError) {
          return response(503, error.code, error.message)
        }
        return response(500, 'PUBLICATION_REQUEST_FAILED', 'Publication request failed')
      }
    },
  }
}
