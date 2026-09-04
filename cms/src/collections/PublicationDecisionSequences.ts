import type { CollectionConfig } from 'payload'

import { canReview, denyAll } from '../access/policy.ts'
import { INTERNAL_BETA_LOCALES } from '../domain/publication.ts'

/**
 * Database-issued ordering tokens shared by approvals and withdrawals.
 *
 * The numeric document id is the only publication decision order. Human/app
 * clocks remain audit metadata and are never used to resolve a race between
 * an approval and a withdrawal. Gaps are expected when a reserved decision
 * fails before its corresponding immutable audit row is appended.
 */
export const PublicationDecisionSequences: CollectionConfig = {
  slug: 'publication-decision-sequences',
  labels: {
    singular: 'Publication Decision Sequence',
    plural: 'Publication Decision Sequences',
  },
  admin: {
    group: 'Publication audit',
    useAsTitle: 'eventKey',
    defaultColumns: ['id', 'artifactKey', 'locale', 'kind', 'decidedBy', 'decidedAt'],
    description: 'Append-only database ordering token. Direct collection writes are denied.',
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
    {
      name: 'kind',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Approval', value: 'approval' },
        { label: 'Withdrawal', value: 'withdrawal' },
      ],
    },
    { name: 'eventKey', type: 'text', required: true, unique: true, index: true },
    { name: 'decisionFingerprint', type: 'text', required: true, index: true },
    {
      name: 'decidedBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    { name: 'decidedAt', type: 'date', required: true, index: true },
  ],
}
