import type { Endpoint } from 'payload'

import { hasAnyRole } from '../access/policy.ts'
import {
  PublicationDecisionTransactionError,
  runSerializablePayloadDecision,
  type PublicationDecisionTransactionalPayload,
} from '../decision/index.ts'
import {
  normalizePromptProposal,
  PromptProposalConflictError,
  PromptProposalInputError,
  promptProposalHash,
  PromptProposalService,
  validateIdempotencyKey,
  type PromptProposalPayloadApi,
  type PromptProposalResult,
} from '../proposals/index.ts'

function userId(user: unknown): string | number | null {
  if (typeof user !== 'object' || user === null || !('id' in user)) return null
  const id = user.id
  return typeof id === 'string' || typeof id === 'number' ? id : null
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

function sameResult(expected: PromptProposalResult, actual: PromptProposalResult | null): boolean {
  return actual !== null &&
    String(actual.auditId) === String(expected.auditId) &&
    String(actual.artifactId) === String(expected.artifactId) &&
    String(actual.localeVariantId) === String(expected.localeVariantId) &&
    String(actual.sourceEvidenceId) === String(expected.sourceEvidenceId)
}

/**
 * Applies one bounded create-Prompt proposal as incomplete CMS drafts. It
 * never accepts rights, approval, public, mirror, release or deploy fields.
 */
export function createPromptProposalEndpoint(): Endpoint {
  return {
    path: '/internal/v1/agent-proposals/prompts',
    method: 'post',
    handler: async (req) => {
      if (!req.user) {
        return jsonResponse({ code: 'UNAUTHENTICATED', detail: 'Authentication is required', status: 401 }, 401)
      }
      if (!hasAnyRole(req.user, ['agent_proposer', 'editor', 'reviewer', 'admin'])) {
        return jsonResponse({ code: 'FORBIDDEN', detail: 'Agent proposer, editor, reviewer or admin role is required', status: 403 }, 403)
      }
      const actorId = userId(req.user)
      if (actorId === null) {
        return jsonResponse({ code: 'FORBIDDEN', detail: 'Authenticated user id is missing', status: 403 }, 403)
      }

      try {
        const readJson = req.json?.bind(req)
        if (!readJson) throw new PromptProposalInputError('Request body must be valid JSON')
        const body = await readJson().catch(() => {
          throw new PromptProposalInputError('Request body must be valid JSON')
        })
        const input = normalizePromptProposal(body)
        const idempotencyKey = validateIdempotencyKey(req.headers.get('idempotency-key'))
        const requestHash = promptProposalHash(input)
        const payload = req.payload as unknown as PublicationDecisionTransactionalPayload

        const existing = await new PromptProposalService(payload).findAudit(idempotencyKey)
        if (existing !== null) {
          if (existing.requestHash !== requestHash) {
            throw new PromptProposalConflictError('Idempotency-Key is already associated with a different proposal')
          }
          return jsonResponse({ data: new PromptProposalService(payload).resultFromAudit(existing, true) }, 200)
        }

        const result = await runSerializablePayloadDecision(
          payload,
          input.prompt.artifactKey,
          async (transactionalPayload) => new PromptProposalService(
            transactionalPayload as PromptProposalPayloadApi,
          ).create(input, idempotencyKey, requestHash, actorId),
          async (committedPayload, expected) => {
            const service = new PromptProposalService(committedPayload)
            const audit = await service.findAudit(idempotencyKey)
            return sameResult(expected, audit === null ? null : service.resultFromAudit(audit, false))
          },
        )
        return jsonResponse({ data: result }, 201)
      } catch (error: unknown) {
        if (error instanceof PromptProposalInputError) {
          return jsonResponse({ code: error.code, detail: error.message, status: 422 }, 422)
        }
        if (error instanceof PromptProposalConflictError) {
          return jsonResponse({ code: error.code, detail: error.message, status: 409 }, 409)
        }
        if (error instanceof PublicationDecisionTransactionError) {
          return jsonResponse({ code: error.code, detail: error.message, status: error.httpStatus }, error.httpStatus)
        }
        return jsonResponse({ code: 'PROMPT_PROPOSAL_FAILED', detail: 'Prompt proposal failed', status: 500 }, 500)
      }
    },
  }
}
