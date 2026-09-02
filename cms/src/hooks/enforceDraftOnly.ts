import { isDeepStrictEqual } from 'node:util'

import type { CollectionBeforeChangeHook } from 'payload'

export const GIT_PROJECTION_CONTEXT_KEY = 'allowGitPublicationProjection'

export class DirectPayloadPublishError extends Error {
  readonly code = 'PAYLOAD_DIRECT_PUBLISH_FORBIDDEN'
  override readonly name = 'DirectPayloadPublishError'
}

export class GitProjectionMutationError extends Error {
  readonly code = 'GIT_PUBLICATION_PROJECTION_READ_ONLY'
  override readonly name = 'GitProjectionMutationError'
}

interface DraftProjectionInput {
  readonly context?: Record<string, unknown>
  readonly data: Record<string, unknown>
  readonly originalDoc?: Record<string, unknown>
}

const EMPTY_GIT_PROJECTION = Object.freeze({ state: 'unpublished' })

function isInitialGitProjection(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const projection = value as Record<string, unknown>
  return projection.state === 'unpublished' && Object.entries(projection).every(
    ([key, member]) => key === 'state' || member === null || member === undefined,
  )
}

/**
 * Payload is an editing projection, never the publication authority.
 *
 * - `_status=published` is rejected even for internal callers.
 * - ordinary Admin/REST writes cannot alter Git-derived publication fields.
 * - the returned Payload version is always a draft.
 */
export function enforceDraftProjection({
  context = {},
  data,
  originalDoc,
}: DraftProjectionInput): Record<string, unknown> {
  if (data._status === 'published') {
    throw new DirectPayloadPublishError(
      'Payload cannot publish content. Submit a publication request and merge its protected Git PR.',
    )
  }

  const gitSync = context[GIT_PROJECTION_CONTEXT_KEY] === true
  const previousProjection = originalDoc?.gitPublication ?? EMPTY_GIT_PROJECTION
  const incomingProjection = data.gitPublication

  // Payload normalizes group defaults before this hook and may provide an
  // empty originalDoc on create. Treat structurally different all-null
  // `unpublished` projections as the same initial state, but never as a way
  // to reset an established Git publication state.
  const ordinaryInitialProjection = isInitialGitProjection(incomingProjection) &&
    isInitialGitProjection(previousProjection)
  if (
    !gitSync &&
    incomingProjection !== undefined &&
    !ordinaryInitialProjection &&
    !isDeepStrictEqual(incomingProjection, previousProjection)
  ) {
    throw new GitProjectionMutationError(
      'gitPublication is read-only and may only be updated from a verified Git merge projection.',
    )
  }

  return {
    ...data,
    _status: 'draft',
    ...(gitSync
      ? {}
      : { gitPublication: originalDoc?.gitPublication ?? incomingProjection ?? EMPTY_GIT_PROJECTION }),
  }
}

export const enforceDraftOnly: CollectionBeforeChangeHook = ({ context, data, originalDoc }) =>
  enforceDraftProjection({
    context,
    data: data as Record<string, unknown>,
    ...(originalDoc ? { originalDoc: originalDoc as Record<string, unknown> } : {}),
  })
