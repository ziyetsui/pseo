import type { CollectionConfig } from 'payload'

import { canReview, denyAll } from '../access/policy.ts'
import { INTERNAL_BETA_LOCALES } from '../domain/publication.ts'

/**
 * Immutable receipt for an authenticated Agent proposal applied to CMS drafts.
 * Prompt text is deliberately absent: the versioned content collections hold
 * it, while this collection records only scope, actor, idempotency and result.
 */
export const AgentProposalAudits: CollectionConfig = {
  slug: 'agent-proposal-audits',
  labels: { singular: 'Agent Proposal Audit', plural: 'Agent Proposal Audits' },
  admin: {
    group: 'Publication audit',
    useAsTitle: 'idempotencyKey',
    defaultColumns: ['operation', 'artifactKey', 'locale', 'actor', 'createdAt'],
    description: 'Append-only receipt for bounded Agent-to-CMS draft proposals. Direct writes are denied.',
  },
  access: {
    create: denyAll,
    read: canReview,
    update: denyAll,
    delete: denyAll,
  },
  fields: [
    {
      name: 'idempotencyKey',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    { name: 'requestHash', type: 'text', required: true },
    {
      name: 'operation',
      type: 'select',
      required: true,
      options: [{ label: 'Create Prompt draft', value: 'create_prompt' }],
    },
    { name: 'artifactKey', type: 'text', required: true, index: true },
    {
      name: 'locale',
      type: 'select',
      required: true,
      index: true,
      options: INTERNAL_BETA_LOCALES.map((locale) => ({ label: locale, value: locale })),
    },
    { name: 'actor', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'artifact', type: 'relationship', relationTo: 'prompt-artifacts', required: true },
    { name: 'localeVariant', type: 'relationship', relationTo: 'locale-variants', required: true },
    { name: 'sourceEvidence', type: 'relationship', relationTo: 'source-evidence', required: true },
    {
      name: 'result',
      type: 'select',
      required: true,
      options: [{ label: 'Draft applied', value: 'draft_applied' }],
    },
  ],
}
