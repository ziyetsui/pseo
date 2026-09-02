import type { CollectionConfig } from 'payload'

import { authenticated, denyAll } from '@/access'
import { INTERNAL_BETA_LOCALES, PUBLICATION_REQUEST_STATUSES } from '@/domain'

export const PublicationRequests: CollectionConfig = {
  slug: 'publication-requests',
  labels: { singular: 'Publication Request', plural: 'Publication Requests' },
  admin: {
    group: 'Publication audit',
    useAsTitle: 'idempotencyKey',
    defaultColumns: ['artifactKey', 'status', 'provider', 'plannedBranch', 'updatedAt'],
    description: 'Append-only audit projection. Submit via the protected endpoint; never edit directly.',
  },
  access: {
    create: denyAll,
    read: authenticated,
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
      name: 'locales',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'locale',
          type: 'select',
          required: true,
          options: INTERNAL_BETA_LOCALES.map((locale) => ({ label: locale, value: locale })),
        },
      ],
    },
    { name: 'expectedBaseSha', type: 'text', required: true },
    {
      name: 'expectedContentRevision',
      type: 'text',
      required: true,
      admin: { description: 'CMS content projection revision reviewed by the caller.' },
    },
    {
      name: 'expectedSourceRevision',
      type: 'text',
      required: true,
      admin: { description: 'Source locale revision reviewed by the caller.' },
    },
    { name: 'validatedContentRevision', type: 'text', required: true },
    { name: 'validatedSourceRevision', type: 'text', required: true },
    { name: 'commitMessage', type: 'text', required: true },
    { name: 'idempotencyKey', type: 'text', required: true, unique: true, index: true },
    { name: 'requestFingerprint', type: 'text', required: true },
    { name: 'requestedBy', type: 'relationship', relationTo: 'users', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: PUBLICATION_REQUEST_STATUSES.map((status) => ({ label: status, value: status })),
    },
    {
      name: 'provider',
      type: 'select',
      options: [
        { label: 'Safe mock', value: 'mock' },
        { label: 'GitHub', value: 'github' },
      ],
    },
    {
      name: 'plannedBranch',
      type: 'text',
      admin: { description: 'A plan only when provider=mock; no branch was created.' },
    },
    { name: 'branch', type: 'text' },
    { name: 'commitSha', type: 'text' },
    { name: 'pullRequestNumber', type: 'number', min: 1 },
    { name: 'pullRequestUrl', type: 'text' },
    {
      name: 'checks',
      type: 'array',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'status', type: 'select', required: true, options: ['pending', 'passed', 'failed'] },
      ],
    },
    { name: 'errorCode', type: 'text' },
    { name: 'errorDetail', type: 'textarea' },
    { name: 'mergeSha', type: 'text' },
    { name: 'releasedAt', type: 'date' },
  ],
}
