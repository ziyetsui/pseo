import type { CollectionConfig } from 'payload'

import { authenticated, canReview, denyAll } from '@/access'
import { enforceDraftOnly, validateLocaleVariant } from '@/hooks'

import { draftVersions, gitPublicationField, localeOptions, seoFields, textListField, translationFields } from './fields'

export const Taxonomies: CollectionConfig = {
  slug: 'taxonomies',
  labels: { singular: 'Taxonomy', plural: 'Taxonomies' },
  admin: {
    group: 'Editorial',
    useAsTitle: 'name',
    defaultColumns: ['taxonomyKey', 'axis', 'locale', 'slug', 'translationStatus'],
  },
  access: {
    create: canReview,
    read: authenticated,
    update: canReview,
    delete: denyAll,
  },
  hooks: {
    beforeValidate: [validateLocaleVariant],
    beforeChange: [enforceDraftOnly],
  },
  versions: draftVersions,
  fields: [
    { name: 'taxonomyKey', type: 'text', required: true, index: true },
    {
      name: 'axis',
      type: 'select',
      required: true,
      options: ['model', 'use_case', 'technique', 'style', 'subject', 'collection', 'creator'],
    },
    { name: 'locale', type: 'select', required: true, options: localeOptions, index: true },
    { name: 'sourceLocale', type: 'select', required: true, options: localeOptions },
    { name: 'slug', type: 'text', required: true, index: true },
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'textarea', required: true },
    { name: 'officialUrl', type: 'text' },
    textListField('capabilities', 'Capabilities'),
    textListField('inputs', 'Inputs'),
    textListField('outputs', 'Outputs'),
    textListField('limitations', 'Limitations'),
    { name: 'translation', type: 'group', fields: translationFields },
    { name: 'seo', type: 'group', fields: seoFields },
    gitPublicationField,
  ],
}
