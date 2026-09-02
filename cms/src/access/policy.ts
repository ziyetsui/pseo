import type { Access } from 'payload'

export const CMS_ROLES = ['editor', 'reviewer', 'publisher', 'admin'] as const

export type CmsRole = (typeof CMS_ROLES)[number]

interface CmsUserLike {
  readonly id?: string | number
  readonly roles?: unknown
}

export function rolesFor(user: unknown): readonly CmsRole[] {
  if (typeof user !== 'object' || user === null) return []
  const roles = (user as CmsUserLike).roles
  if (!Array.isArray(roles)) return []
  return roles.filter((role): role is CmsRole =>
    typeof role === 'string' && (CMS_ROLES as readonly string[]).includes(role),
  )
}

export function hasAnyRole(user: unknown, allowed: readonly CmsRole[]): boolean {
  const roles = rolesFor(user)
  return roles.some((role) => allowed.includes(role))
}

export const authenticated: Access = ({ req }) => Boolean(req.user)

export const canEditDrafts: Access = ({ req }) =>
  hasAnyRole(req.user, ['editor', 'reviewer', 'admin'])

export const canReview: Access = ({ req }) =>
  hasAnyRole(req.user, ['reviewer', 'admin'])

export const adminOnly: Access = ({ req }) => hasAnyRole(req.user, ['admin'])

export const selfOrAdmin: Access = ({ req }) => {
  if (hasAnyRole(req.user, ['admin'])) return true
  if (typeof req.user !== 'object' || req.user === null || !('id' in req.user)) return false
  const id = (req.user as CmsUserLike).id
  return id === undefined ? false : { id: { equals: id } }
}

export const denyAll: Access = () => false

/**
 * Payload needs one bootstrap account. After it exists, only an admin may
 * create another user. The CMS remains behind Cloudflare Access as specified.
 */
export const adminOrFirstUser: Access = async ({ req }) => {
  if (hasAnyRole(req.user, ['admin'])) return true
  if (req.user) return false
  const result = await req.payload.count({
    collection: 'users',
    overrideAccess: true,
  })
  return result.totalDocs === 0
}
