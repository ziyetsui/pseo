import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCanonicalPromptBundle,
  canonicalRecordRevision,
} from '../src/publication/canonicalPromptBundle.ts'

const prompt = {
  schemaVersion: 1,
  id: 'prm_bundle_fixture',
  locale: 'en',
  title: 'Bundle fixture',
  publication: { sourceRevision: `sha256:${'0'.repeat(64)}` },
  translation: { status: 'draft' },
}

test('canonical bundle sorts safe paths and serializes exactly one trailing LF', () => {
  const files = buildCanonicalPromptBundle({
    prompts: [{
      bodyMarkdown: '# Bundle fixture\n\n```prompt\nA deterministic Prompt body used only by the canonical bundle unit test.\n```',
      frontmatter: prompt,
    }],
    taxonomies: [{
      axis: 'model',
      id: 'mdl_model_agnostic',
      locale: 'en',
      value: { schemaVersion: 1, id: 'mdl_model_agnostic', axis: 'model', locale: 'en' },
    }],
  })

  assert.deepEqual(files.map((file) => file.path), [
    'content/prompts/prm_bundle_fixture/en.md',
    'content/taxonomies/model/mdl_model_agnostic/en.json',
  ])
  assert.ok(files.every((file) => file.content.endsWith('\n') && !file.content.endsWith('\n\n')))
  assert.match(files[0]?.content ?? '', /^---\n\{\n/u)
})

test('canonical bundle rejects duplicate or unsafe derived paths', () => {
  assert.throws(
    () => buildCanonicalPromptBundle({
      prompts: [
        { bodyMarkdown: '# Bundle fixture', frontmatter: prompt },
        { bodyMarkdown: '# Duplicate fixture', frontmatter: { ...prompt } },
      ],
      taxonomies: [],
    }),
    /duplicate canonical publication path/u,
  )
  assert.throws(
    () => buildCanonicalPromptBundle({
      prompts: [{ bodyMarkdown: '# Unsafe fixture', frontmatter: { ...prompt, locale: '../en' } }],
      taxonomies: [],
    }),
    /invalid canonical Prompt locale/u,
  )
})

test('record revision ignores translation and its own sourceRevision but includes the body', () => {
  const first = canonicalRecordRevision(prompt, '# Body')
  const metadataOnly = canonicalRecordRevision({
    ...prompt,
    publication: { sourceRevision: `sha256:${'f'.repeat(64)}` },
    translation: { status: 'ready', reviewer: 'another-reviewer' },
  }, '# Body')
  const bodyEdit = canonicalRecordRevision(prompt, '# Edited body')

  assert.equal(first, metadataOnly)
  assert.notEqual(first, bodyEdit)
  assert.match(first, /^sha256:[a-f0-9]{64}$/u)
})
