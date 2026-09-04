import type { CollectionConfig } from 'payload'

import { canEditDrafts, canReadEditorial, denyAll } from '@/access'
import { enforceDraftOnly, validateLocaleVariant } from '@/hooks'

import {
  betaPreviewField,
  draftVersions,
  gitPublicationField,
  localeOptions,
  seoFields,
  textListField,
  translationFields,
} from './fields'

export const LocaleVariants: CollectionConfig = {
  slug: 'locale-variants',
  labels: { singular: 'Locale Variant', plural: 'Locale Variants' },
  admin: {
    group: 'Editorial',
    useAsTitle: 'title',
    defaultColumns: ['title', 'locale', 'slug', 'translationStatus', 'updatedAt'],
    description: 'Localized page copy. Prompt source text remains on the parent artifact.',
  },
  access: {
    create: canEditDrafts,
    read: canReadEditorial,
    update: canEditDrafts,
    delete: denyAll,
  },
  hooks: {
    beforeValidate: [validateLocaleVariant],
    beforeChange: [enforceDraftOnly],
  },
  versions: draftVersions,
  fields: [
    {
      name: 'localeVariantKey',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Stable import identity: <artifactKey>:<locale>.' },
    },
    {
      name: 'artifact',
      type: 'relationship',
      relationTo: 'prompt-artifacts',
      required: true,
      index: true,
    },
    { name: 'locale', type: 'select', required: true, options: localeOptions, index: true },
    { name: 'sourceLocale', type: 'select', required: true, options: localeOptions },
    {
      name: 'slug',
      type: 'text',
      required: true,
      index: true,
      admin: { description: 'Unique together with locale; enforced again by the publication compiler.' },
    },
    { name: 'title', type: 'text', required: true },
    { name: 'summary', type: 'textarea' },
    {
      name: 'indexable',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Editorial indexing intent only; Git status and release gates remain authoritative.' },
    },
    {
      name: 'bodyMarkdown',
      type: 'textarea',
      required: true,
      admin: { description: 'Internal beta deliberately uses Markdown textarea, not Lexical.' },
    },
    {
      name: 'localizedOutcome',
      type: 'group',
      fields: [
        { name: 'purpose', type: 'textarea' },
        textListField('characteristics', 'Characteristics'),
      ],
    },
    {
      name: 'workflow',
      type: 'array',
      fields: [
        { name: 'position', type: 'number', min: 1, required: true },
        { name: 'title', type: 'text', required: true },
        { name: 'body', type: 'textarea', required: true },
      ],
    },
    {
      name: 'translation',
      type: 'group',
      required: true,
      fields: translationFields,
    },
    {
      name: 'seo',
      type: 'group',
      required: true,
      fields: seoFields,
      admin: { description: 'Canonical URL and hreflang are compiler-owned, not edited here.' },
    },
    betaPreviewField,
    gitPublicationField,
  ],
}
