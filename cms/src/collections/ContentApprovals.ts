import type { CollectionConfig } from 'payload'

import { canReview, denyAll } from '../access/policy.ts'
import { INTERNAL_BETA_LOCALES } from '../domain/publication.ts'

export const ContentApprovals: CollectionConfig = {
  slug: 'content-approvals',
  labels: { singular: 'Content Approval', plural: 'Content Approvals' },
  admin: {
    group: 'Publication audit',
    useAsTitle: 'decisionFingerprint',
    defaultColumns: ['artifactKey', 'locale', 'decision', 'approvedBy', 'approvedAt'],
    description: 'Append-only, revision-bound human approval audit. Direct collection writes are denied.',
  },
  access: {
    create: denyAll,
    read: canReview,
    update: denyAll,
    delete: denyAll,
  },
  fields: [
    {
      name: 'artifact',
      type: 'relationship',
      relationTo: 'prompt-artifacts',
      required: true,
      index: true,
    },
    { name: 'artifactKey', type: 'text', required: true, index: true },
    {
      name: 'locale',
      type: 'select',
      required: true,
      index: true,
      options: INTERNAL_BETA_LOCALES.map((locale) => ({ label: locale, value: locale })),
    },
    { name: 'contentRevision', type: 'text', required: true, index: true },
    { name: 'sourceRevision', type: 'text', required: true },
    { name: 'rightsRevision', type: 'text', required: true, index: true },
    { name: 'rightsPolicyVersion', type: 'text', required: true },
    {
      name: 'decision',
      type: 'select',
      required: true,
      options: [{ label: 'Approved', value: 'approved' }],
    },
    {
      name: 'approvedBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    { name: 'approvedAt', type: 'date', required: true },
    {
      name: 'decisionSequence',
      type: 'relationship',
      relationTo: 'publication-decision-sequences',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Database-issued cross-decision order; timestamps are audit-only.' },
    },
    { name: 'decisionFingerprint', type: 'text', required: true, index: true },
    { name: 'idempotencyKey', type: 'text', required: true, unique: true, index: true },
    { name: 'fileCount', type: 'number', required: true, min: 1 },
    {
      name: 'files',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'path', type: 'text', required: true },
        { name: 'byteLength', type: 'number', required: true, min: 1 },
        { name: 'sha256', type: 'text', required: true },
      ],
    },
  ],
}
