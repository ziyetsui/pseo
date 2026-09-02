import type { CollectionConfig } from 'payload'

import { adminOnly, adminOrFirstUser, selfOrAdmin } from '@/access'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    group: 'Administration',
    useAsTitle: 'email',
  },
  access: {
    create: adminOrFirstUser,
    read: selfOrAdmin,
    update: selfOrAdmin,
    delete: adminOnly,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation !== 'create' || req.user) return data
        const count = await req.payload.count({ collection: 'users', overrideAccess: true })
        return count.totalDocs === 0 ? { ...data, roles: ['admin'] } : data
      },
    ],
  },
  fields: [
    { name: 'displayName', type: 'text', required: true },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      saveToJWT: true,
      defaultValue: ['editor'],
      options: [
        { label: 'Editor', value: 'editor' },
        { label: 'Reviewer', value: 'reviewer' },
        { label: 'Publisher', value: 'publisher' },
        { label: 'Admin', value: 'admin' },
      ],
      access: {
        update: ({ req }) => Boolean(req.user && 'roles' in req.user && Array.isArray(req.user.roles) && req.user.roles.includes('admin')),
      },
    },
  ],
}
