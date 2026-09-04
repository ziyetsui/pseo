import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const configUrl = new URL('../src/payload.config.ts', import.meta.url)
const promptArtifactsUrl = new URL('../src/collections/PromptArtifacts.ts', import.meta.url)
const publicationRequestsUrl = new URL('../src/collections/PublicationRequests.ts', import.meta.url)

test('the active CMS composition root exposes no per-content Git PR publisher', async () => {
  const source = await readFile(configUrl, 'utf8')

  assert.doesNotMatch(source, /createPreparePublicationRequestEndpoint/u)
  assert.doesNotMatch(source, /createPublicationRequestEndpoint/u)
  assert.doesNotMatch(source, /GitHubGitPublisher/u)
  assert.doesNotMatch(source, /MockGitPublisher/u)
  assert.doesNotMatch(source, /githubToken/u)
  assert.match(source, /createPreviewCatalogEndpoint\(environment\)/u)
})

test('Prompt Artifact replaces the retired PR control with CMS revision approval', async () => {
  const source = await readFile(promptArtifactsUrl, 'utf8')

  assert.doesNotMatch(source, /SubmitReviewButton/u)
  assert.match(source, /ApproveContentButton/u)
  assert.match(source, /beforeDocumentControls/u)
  assert.match(source, /content PR publication is retired/u)
})

test('legacy PublicationRequest records are hidden read-only audit evidence', async () => {
  const source = await readFile(publicationRequestsUrl, 'utf8')

  assert.match(source, /hidden: true/u)
  assert.match(source, /retired per-content PR experiment/u)
  assert.match(source, /create: denyAll/u)
  assert.match(source, /update: denyAll/u)
  assert.match(source, /delete: denyAll/u)
})
