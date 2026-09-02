import type { CollectionConfig, Field } from 'payload'

import { authenticated, canEditDrafts, denyAll } from '@/access'
import { enforceDraftOnly } from '@/hooks'

import {
  betaPreviewField,
  createMediaFields,
  draftVersions,
  gitPublicationField,
  localeOptions,
  textListField,
} from './fields'

const taxonomyRelationship = (name: string, label: string): Field => ({
  name,
  label,
  type: 'relationship',
  relationTo: 'taxonomies',
  hasMany: true,
})

export const PromptArtifacts: CollectionConfig = {
  slug: 'prompt-artifacts',
  labels: { singular: 'Prompt Artifact', plural: 'Prompt Artifacts' },
  admin: {
    group: 'Editorial',
    useAsTitle: 'artifactKey',
    defaultColumns: ['artifactKey', 'contentType', 'draftWorkflowState', 'updatedAt'],
    description: 'Draft projection only. The protected Git main branch is the publication authority.',
  },
  access: {
    create: canEditDrafts,
    read: authenticated,
    update: canEditDrafts,
    delete: denyAll,
  },
  hooks: { beforeChange: [enforceDraftOnly] },
  versions: draftVersions,
  fields: [
    {
      name: 'artifactKey',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Immutable domain id, for example prm_01jabcdef.' },
    },
    {
      name: 'contentType',
      type: 'select',
      required: true,
      options: ['image', 'video', 'text', 'other'],
    },
    {
      name: 'sourceLocale',
      type: 'select',
      required: true,
      options: localeOptions,
    },
    {
      name: 'draftWorkflowState',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Needs review', value: 'needs_review' },
        { label: 'Validated', value: 'validated' },
        { label: 'Conflicted', value: 'conflicted' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Archived', value: 'archived' },
      ],
      admin: { description: 'Editorial state only; deliberately has no published value.' },
    },
    {
      name: 'prompt',
      type: 'group',
      fields: [
        { name: 'language', type: 'text' },
        { name: 'text', type: 'textarea' },
        {
          name: 'variables',
          type: 'array',
          fields: [
            { name: 'key', type: 'text', required: true },
            { name: 'label', type: 'text', required: true },
            { name: 'required', type: 'checkbox', required: true, defaultValue: true },
            { name: 'defaultValue', type: 'text' },
            {
              name: 'options',
              type: 'array',
              fields: [{ name: 'value', type: 'text', required: true }],
            },
          ],
        },
      ],
    },
    {
      name: 'outcome',
      type: 'group',
      fields: [
        { name: 'outputType', type: 'select', options: ['image', 'video', 'text', 'other'] },
        textListField('platforms', 'Platforms'),
      ],
    },
    textListField('requiredInputs', 'Required inputs'),
    textListField('optionalInputs', 'Optional inputs'),
    {
      name: 'parameters',
      type: 'array',
      fields: [
        { name: 'key', type: 'text', required: true },
        { name: 'label', type: 'text', required: true },
        { name: 'value', type: 'text' },
        {
          name: 'valueType',
          type: 'select',
          required: true,
          options: ['text', 'number', 'enum', 'boolean'],
        },
        { name: 'required', type: 'checkbox', required: true, defaultValue: false },
        {
          name: 'options',
          type: 'array',
          fields: [{ name: 'value', type: 'text', required: true }],
        },
      ],
    },
    taxonomyRelationship('models', 'Models'),
    taxonomyRelationship('useCases', 'Use cases'),
    taxonomyRelationship('techniques', 'Techniques'),
    taxonomyRelationship('styles', 'Styles'),
    taxonomyRelationship('subjects', 'Subjects'),
    {
      name: 'media',
      type: 'array',
      fields: createMediaFields(),
      admin: { description: 'Git projection media. Empty is allowed only when the content contract permits it.' },
    },
    {
      name: 'metrics',
      type: 'group',
      required: true,
      fields: [
        { name: 'likes', type: 'number', min: 0 },
        { name: 'bookmarks', type: 'number', min: 0 },
        { name: 'comments', type: 'number', min: 0 },
        { name: 'reposts', type: 'number', min: 0 },
        { name: 'views', type: 'number', min: 0 },
        { name: 'observedAt', type: 'date', required: true },
      ],
    },
    {
      name: 'examples',
      type: 'array',
      fields: [
        { name: 'exampleId', type: 'text', required: true },
        { name: 'input', type: 'textarea' },
        { name: 'output', type: 'group', required: true, fields: createMediaFields() },
        { name: 'caption', type: 'text' },
      ],
    },
    {
      name: 'creator',
      type: 'relationship',
      relationTo: 'taxonomies',
      filterOptions: { axis: { equals: 'creator' } },
    },
    {
      name: 'relatedPrompts',
      type: 'relationship',
      relationTo: 'prompt-artifacts',
      hasMany: true,
    },
    {
      name: 'actions',
      type: 'group',
      required: true,
      fields: [
        { name: 'canCopy', type: 'checkbox', required: true, defaultValue: true },
        { name: 'tryUrl', type: 'text' },
      ],
    },
    {
      name: 'sourceEvidence',
      type: 'relationship',
      relationTo: 'source-evidence',
      hasMany: true,
    },
    betaPreviewField,
    gitPublicationField,
  ],
}
