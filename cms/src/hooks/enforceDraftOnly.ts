import { isDeepStrictEqual } from 'node:util'

import type { CollectionBeforeChangeHook } from 'payload'

export class DirectPayloadPublishError extends Error {
  readonly code = 'PAYLOAD_DIRECT_PUBLISH_FORBIDDEN'
  override readonly name = 'DirectPayloadPublishError'
}

export class GitProjectionMutationError extends Error {
  readonly code = 'GIT_PUBLICATION_PROJECTION_READ_ONLY'
  override readonly name = 'GitProjectionMutationError'
}

interface DraftProjectionInput {
  readonly data: Record<string, unknown>
  readonly originalDoc?: Record<string, unknown>
}

const EMPTY_GIT_PROJECTION = Object.freeze({ state: 'unpublished' })

function isInitialGitProjection(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const projection = value as Record<string, unknown>
  const members = Object.entries(projection)
  return members.length === 0 || (
    projection.state === 'unpublished' && members.every(
      ([key, member]) => key === 'state' || member === null || member === undefined,
    )
  )
}

/**
 * Payload drafts remain separate from the revision-bound CMS public projection.
 *
 * - `_status=published` is rejected even for internal callers.
 * - ordinary Admin/REST writes cannot alter the retired Git audit fields.
 * - the returned Payload version is always a draft.
 */
export function enforceDraftProjection({
  data,
  originalDoc,
}: DraftProjectionInput): Record<string, unknown> {
  if (data._status === 'published') {
    throw new DirectPayloadPublishError(
      'Payload _status cannot publish content. Use the revision-bound CMS approval and public snapshot workflow.',
    )
  }

  const previousProjection = originalDoc?.gitPublication ?? EMPTY_GIT_PROJECTION
  const incomingProjection = data.gitPublication

  // Payload normalizes group defaults before this hook and may provide an
  // empty originalDoc on create. Treat structurally different all-null
  // `unpublished` projections as the same initial state, but never as a way
  // to reset an established Git publication state.
  const ordinaryInitialProjection = isInitialGitProjection(incomingProjection) &&
    isInitialGitProjection(previousProjection)
  if (
    incomingProjection !== undefined &&
    !ordinaryInitialProjection &&
    !isDeepStrictEqual(incomingProjection, previousProjection)
  ) {
    throw new GitProjectionMutationError(
      'gitPublication is a read-only legacy audit projection.',
    )
  }

  return {
    ...data,
    _status: 'draft',
    gitPublication: originalDoc?.gitPublication ?? incomingProjection ?? EMPTY_GIT_PROJECTION,
  }
}

export const enforceDraftOnly: CollectionBeforeChangeHook = ({ data, originalDoc }) =>
  enforceDraftProjection({
    data: data as Record<string, unknown>,
    ...(originalDoc ? { originalDoc: originalDoc as Record<string, unknown> } : {}),
  })
