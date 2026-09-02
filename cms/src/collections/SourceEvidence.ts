import type { CollectionConfig } from 'payload'

import { authenticated, canEditDrafts, denyAll } from '@/access'
import { enforceDraftOnly, validateSourceEvidence } from '@/hooks'

import { draftVersions, gitPublicationField } from './fields'

export const SourceEvidence: CollectionConfig = {
  slug: 'source-evidence',
  labels: { singular: 'Source / Evidence', plural: 'Sources / Evidence' },
  admin: {
    group: 'Editorial',
    useAsTitle: 'sourceId',
    defaultColumns: ['recordType', 'sourcePlatform', 'sourceId', 'observedAt', 'rightsStatus'],
    description: 'Typed records keep provenance and evidence distinct at projection/export time.',
  },
  access: {
    create: canEditDrafts,
    read: authenticated,
    update: canEditDrafts,
    delete: denyAll,
  },
  hooks: {
    beforeValidate: [validateSourceEvidence],
    beforeChange: [enforceDraftOnly],
  },
  versions: draftVersions,
  fields: [
    {
      name: 'artifact',
      type: 'relationship',
      relationTo: 'prompt-artifacts',
      required: true,
      index: true,
    },
    {
      name: 'recordType',
      type: 'select',
      required: true,
      options: [
        { label: 'Source', value: 'source' },
        { label: 'Evidence', value: 'evidence' },
      ],
    },
    {
      name: 'sourcePlatform',
      type: 'select',
      options: ['x', 'rss', 'url', 'manual'],
      admin: { condition: (_, siblingData) => siblingData.recordType === 'source' },
    },
    {
      name: 'sourceUrl',
      type: 'text',
      admin: { condition: (_, siblingData) => siblingData.recordType === 'source' },
    },
    {
      name: 'sourceId',
      type: 'text',
      admin: { condition: (_, siblingData) => siblingData.recordType === 'source' },
    },
    {
      name: 'creatorHandle',
      type: 'text',
      admin: { condition: (_, siblingData) => siblingData.recordType === 'source' },
    },
    {
      name: 'sourcePublishedDate',
      type: 'date',
      admin: {
        condition: (_, siblingData) => siblingData.recordType === 'source',
        description: 'Original publication date projected to source.publishedDate in Git content.',
      },
    },
    {
      name: 'observedAt',
      type: 'date',
      admin: { condition: (_, siblingData) => siblingData.recordType === 'source' },
    },
    {
      name: 'evidenceType',
      type: 'text',
      admin: { condition: (_, siblingData) => siblingData.recordType === 'evidence' },
    },
    {
      name: 'evidenceUrl',
      type: 'text',
      admin: { condition: (_, siblingData) => siblingData.recordType === 'evidence' },
    },
    {
      name: 'confidence',
      type: 'number',
      min: 0,
      max: 1,
      admin: { condition: (_, siblingData) => siblingData.recordType === 'evidence' },
    },
    { name: 'notes', type: 'textarea' },
    {
      name: 'rightsStatus',
      type: 'select',
      required: true,
      defaultValue: 'review_required',
      options: ['unknown', 'review_required', 'cleared', 'restricted', 'takedown'],
    },
    { name: 'isPrimarySource', type: 'checkbox', defaultValue: false },
    gitPublicationField,
  ],
}
