import type { CollectionConfig } from 'payload'

import { canEditDrafts, canReadEditorial, denyAll } from '@/access'
import {
  enforceDraftOnly,
  rightsDecisionFieldAccess,
  rightsEvidenceUrlFieldAccess,
  validateSourceEvidence,
} from '@/hooks'

import { betaPreviewField, draftVersions, gitPublicationField } from './fields'

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
    read: canReadEditorial,
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
        date: { pickerAppearance: 'dayOnly' },
        description: 'Original calendar date, normalized to UTC midnight and projected to source.publishedDate in Git content.',
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
      access: rightsEvidenceUrlFieldAccess,
      admin: {
        condition: (_, siblingData) =>
          siblingData.recordType === 'evidence' || siblingData.recordType === 'source',
        description: 'Evidence URL for evidence rows; human permission/reuse evidence for source rows.',
      },
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
      access: rightsDecisionFieldAccess,
      options: [
        'unknown',
        'review_required',
        'cleared',
        'community_attributed',
        'restricted',
        'takedown',
      ],
    },
    {
      name: 'basis',
      type: 'textarea',
      minLength: 12,
      maxLength: 500,
      access: rightsDecisionFieldAccess,
      admin: {
        condition: (_, siblingData) => siblingData.recordType === 'source',
        description: 'Human-supplied rights basis. Agents must not infer or approve this value.',
      },
    },
    {
      name: 'reviewedBy',
      type: 'text',
      maxLength: 100,
      access: rightsDecisionFieldAccess,
      admin: {
        condition: (_, siblingData) => siblingData.recordType === 'source',
        description: 'Identity of the human who reviewed content reuse rights.',
      },
    },
    {
      name: 'reviewedAt',
      type: 'date',
      access: rightsDecisionFieldAccess,
      admin: {
        condition: (_, siblingData) => siblingData.recordType === 'source',
        description: 'RFC 3339 timestamp recorded by the human rights review.',
      },
    },
    {
      name: 'licenseReference',
      type: 'text',
      maxLength: 240,
      access: rightsDecisionFieldAccess,
      admin: {
        condition: (_, siblingData) => siblingData.recordType === 'source',
        description: 'Human-supplied license or permission reference, for example CC BY 4.0.',
      },
    },
    {
      name: 'authorName',
      type: 'text',
      maxLength: 160,
      access: rightsDecisionFieldAccess,
      admin: {
        condition: (_, siblingData) =>
          siblingData.recordType === 'source' &&
          siblingData.rightsStatus === 'community_attributed',
        description: 'Public author attribution for the community-attributed rights path.',
      },
    },
    {
      name: 'authorHandle',
      type: 'text',
      maxLength: 160,
      access: rightsDecisionFieldAccess,
      admin: {
        condition: (_, siblingData) =>
          siblingData.recordType === 'source' &&
          siblingData.rightsStatus === 'community_attributed',
        description: 'Public author handle. Either this field or authorUrl is required.',
      },
    },
    {
      name: 'authorUrl',
      type: 'text',
      maxLength: 2048,
      access: rightsDecisionFieldAccess,
      admin: {
        condition: (_, siblingData) =>
          siblingData.recordType === 'source' &&
          siblingData.rightsStatus === 'community_attributed',
        description: 'HTTPS author profile. Either this field or authorHandle is required.',
      },
    },
    {
      name: 'originalPostUrl',
      type: 'text',
      maxLength: 2048,
      access: rightsDecisionFieldAccess,
      admin: {
        condition: (_, siblingData) =>
          siblingData.recordType === 'source' &&
          siblingData.rightsStatus === 'community_attributed',
        description: 'HTTPS URL of the original community post.',
      },
    },
    {
      name: 'policyVersion',
      type: 'text',
      maxLength: 100,
      access: rightsDecisionFieldAccess,
      admin: {
        condition: (_, siblingData) =>
          siblingData.recordType === 'source' &&
          siblingData.rightsStatus === 'community_attributed',
        description: 'Version of the approved notice-and-takedown policy used for this decision.',
      },
    },
    {
      name: 'riskAcceptedBy',
      type: 'text',
      maxLength: 100,
      access: rightsDecisionFieldAccess,
      admin: {
        condition: (_, siblingData) =>
          siblingData.recordType === 'source' &&
          siblingData.rightsStatus === 'community_attributed',
        description: 'Authorized human who accepted the community-publication risk.',
      },
    },
    {
      name: 'riskAcceptedAt',
      type: 'date',
      access: rightsDecisionFieldAccess,
      admin: {
        condition: (_, siblingData) =>
          siblingData.recordType === 'source' &&
          siblingData.rightsStatus === 'community_attributed',
        description: 'UTC timestamp of the human risk-acceptance decision.',
      },
    },
    {
      name: 'takedownUrl',
      type: 'text',
      maxLength: 2048,
      access: rightsDecisionFieldAccess,
      admin: {
        condition: (_, siblingData) =>
          siblingData.recordType === 'source' &&
          siblingData.rightsStatus === 'community_attributed',
        description: 'Public HTTPS request route for correction or removal.',
      },
    },
    {
      name: 'takedownCaseId',
      type: 'text',
      maxLength: 160,
      access: rightsDecisionFieldAccess,
      admin: {
        condition: (_, siblingData) =>
          siblingData.recordType === 'source' && siblingData.rightsStatus === 'takedown',
        description: 'Immutable case identifier for this takedown decision.',
      },
    },
    {
      name: 'takedownHandledBy',
      type: 'text',
      maxLength: 100,
      access: rightsDecisionFieldAccess,
      admin: {
        condition: (_, siblingData) =>
          siblingData.recordType === 'source' && siblingData.rightsStatus === 'takedown',
        description: 'Authorized human who handled the takedown decision.',
      },
    },
    {
      name: 'takedownHandledAt',
      type: 'date',
      access: rightsDecisionFieldAccess,
      admin: {
        condition: (_, siblingData) =>
          siblingData.recordType === 'source' && siblingData.rightsStatus === 'takedown',
        description: 'UTC timestamp of the takedown decision.',
      },
    },
    {
      name: 'takedownScope',
      type: 'textarea',
      minLength: 3,
      maxLength: 500,
      access: rightsDecisionFieldAccess,
      admin: {
        condition: (_, siblingData) =>
          siblingData.recordType === 'source' && siblingData.rightsStatus === 'takedown',
        description: 'Exact content IDs, locales, routes, or media covered by the decision.',
      },
    },
    { name: 'isPrimarySource', type: 'checkbox', defaultValue: false },
    betaPreviewField,
    gitPublicationField,
  ],
}
