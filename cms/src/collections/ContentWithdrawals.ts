import type { CollectionConfig } from 'payload'

import { canReview, denyAll } from '../access/policy.ts'
import { CONTENT_WITHDRAWAL_DECISIONS, INTERNAL_BETA_LOCALES } from '../domain/index.ts'

/**
 * Append-only reviewer tombstones. Each row is also the immutable urgent
 * sync-event reserved for mirror/deploy reconciliation. Automatic dispatch is
 * explicitly disabled until a durable dispatcher and delivery receipt exist.
 */
export const ContentWithdrawals: CollectionConfig = {
  slug: 'content-withdrawals',
  labels: { singular: 'Content Withdrawal', plural: 'Content Withdrawals' },
  admin: {
    group: 'Publication audit',
    useAsTitle: 'decisionFingerprint',
    defaultColumns: ['artifactKey', 'locale', 'decision', 'withdrawnBy', 'withdrawnAt'],
    description: 'Append-only artifact-wide rights tombstone. Auto-sync is disabled; direct writes are denied.',
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
      name: 'decision',
      type: 'select',
      required: true,
      index: true,
      options: CONTENT_WITHDRAWAL_DECISIONS.map((decision) => ({ label: decision, value: decision })),
    },
    { name: 'caseId', type: 'text', required: true, maxLength: 160, index: true },
    { name: 'rightsRevision', type: 'text', required: true, index: true },
    {
      name: 'withdrawnBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    { name: 'withdrawnAt', type: 'date', required: true, index: true },
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
    {
      name: 'syncDispatchMode',
      type: 'select',
      required: true,
      options: [{ label: 'Disabled', value: 'disabled' }],
      admin: {
        description: 'Fail-closed: no automatic mirror/deploy dispatch exists in this beta.',
      },
    },
    {
      name: 'syncEventType',
      type: 'select',
      required: true,
      options: [{ label: 'Public snapshot withdrawal', value: 'public_snapshot_withdrawal' }],
    },
    {
      name: 'syncPriority',
      type: 'select',
      required: true,
      options: [{ label: 'Urgent', value: 'urgent' }],
    },
    { name: 'syncRequestedAt', type: 'date', required: true, index: true },
    { name: 'syncEventRevision', type: 'text', required: true, unique: true, index: true },
  ],
}
