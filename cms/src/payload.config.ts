import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { buildConfig } from 'payload'

import {
  LocaleVariants,
  PromptArtifacts,
  PublicationRequests,
  SourceEvidence,
  Taxonomies,
  Users,
} from '@/collections'
import { readCmsEnvironment } from '@/config/env'
import { createPreviewCatalogEndpoint, createPublicationRequestEndpoint } from '@/endpoints'
import { MockGitPublisher } from '@/publication'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const environment = readCmsEnvironment()

const gitPublisher = new MockGitPublisher({
  expectedBaseSha: environment.mockGitBaseSha,
})

export default buildConfig({
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: ' · PSEO draft editor',
    },
  },
  collections: [
    Users,
    PromptArtifacts,
    LocaleVariants,
    Taxonomies,
    SourceEvidence,
    PublicationRequests,
  ],
  cors: [environment.publicServerUrl],
  csrf: [environment.publicServerUrl],
  db: postgresAdapter({
    pool: { connectionString: environment.databaseUri },
  }),
  endpoints: [
    createPublicationRequestEndpoint(gitPublisher),
    createPreviewCatalogEndpoint(environment),
  ],
  secret: environment.payloadSecret,
  serverURL: environment.publicServerUrl,
  telemetry: false,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
