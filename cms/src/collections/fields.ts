import type { Field } from 'payload'

import { INTERNAL_BETA_LOCALES } from '@/domain'

export const localeOptions = INTERNAL_BETA_LOCALES.map((locale) => ({ label: locale, value: locale }))

export function createMediaFields(): Field[] {
  return [
    { name: 'assetId', type: 'text', required: true },
    { name: 'mediaType', type: 'select', required: true, options: ['image', 'video'] },
    { name: 'url', type: 'text', required: true },
    { name: 'width', type: 'number', min: 1 },
    { name: 'height', type: 'number', min: 1 },
    { name: 'alt', type: 'text', required: true },
    { name: 'posterUrl', type: 'text' },
  ]
}

export const gitPublicationField: Field = {
  name: 'gitPublication',
  type: 'group',
  admin: {
    description: 'Read-only projection of protected Git/PR state. It is never Payload publish state.',
    readOnly: true,
  },
  fields: [
    {
      name: 'state',
      type: 'select',
      required: true,
      defaultValue: 'unpublished',
      options: [
        { label: 'Unpublished', value: 'unpublished' },
        { label: 'Publication requested', value: 'request_open' },
        { label: 'PR open', value: 'pr_open' },
        { label: 'Merged', value: 'merged' },
        { label: 'Released', value: 'released' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Conflicted', value: 'conflicted' },
      ],
    },
    {
      name: 'lastRequest',
      type: 'relationship',
      relationTo: 'publication-requests',
    },
    { name: 'pullRequestNumber', type: 'number', min: 1 },
    { name: 'pullRequestUrl', type: 'text' },
    { name: 'mergeSha', type: 'text' },
    { name: 'releasedAt', type: 'date' },
  ],
}

/**
 * Wireframe-only metadata for the local beta preview. This is deliberately
 * excluded by the publication validator, which serializes an explicit
 * allowlist of editorial fields to the Git content contract.
 */
export const betaPreviewField: Field = {
  name: 'betaPreview',
  type: 'json',
  admin: {
    description: 'Local beta preview metadata. It is never publication content.',
  },
}

export const translationFields: Field[] = [
  {
    name: 'translationStatus',
    type: 'select',
    required: true,
    defaultValue: 'draft',
    options: [
      { label: 'Missing', value: 'missing' },
      { label: 'Draft', value: 'draft' },
      { label: 'In review', value: 'review' },
      { label: 'Ready for publication request', value: 'ready' },
      { label: 'Stale', value: 'stale' },
    ],
  },
  { name: 'translatedFromRevision', type: 'text' },
  { name: 'reviewer', type: 'text' },
]

export const seoFields: Field[] = [
  { name: 'title', type: 'text', maxLength: 70 },
  { name: 'description', type: 'textarea', maxLength: 180 },
  {
    name: 'robots',
    type: 'select',
    required: true,
    defaultValue: 'noindex,nofollow',
    options: [
      { label: 'Draft / no index', value: 'noindex,nofollow' },
      { label: 'Index after Git release', value: 'index,follow' },
    ],
  },
]

export function textListField(name: string, label: string): Field {
  return {
    name,
    label,
    type: 'array',
    fields: [{ name: 'value', type: 'text', required: true }],
  }
}

export const draftVersions = {
  drafts: {
    autosave: false,
    schedulePublish: false,
  },
  maxPerDoc: 50,
} as const
