import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { buildCatalog, checkGenerated, validateRepository, writeGenerated } from '../lib/catalog.mjs'

const fixtureRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function copyFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'prompt-lab-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(path.join(root, 'content'), { recursive: true })
  const { cp } = await import('node:fs/promises')
  await cp(path.join(fixtureRoot, 'content'), path.join(root, 'content'), { recursive: true })
  return root
}

test('build is deterministic, multilingual, and carries provenance', async () => {
  const first = await buildCatalog({ root: fixtureRoot })
  const second = await buildCatalog({ root: fixtureRoot })

  assert.deepEqual([...first.files], [...second.files])
  assert.match(first.contentRevision, /^sha256:[a-f0-9]{64}$/)
  assert.deepEqual(first.catalog.locales, ['en', 'zh-CN'])
  assert.equal(first.catalog.items.length, 2)
  assert.deepEqual(first.catalog.items.map((item) => item.locale), ['en', 'zh-CN'])
  assert.equal(first.catalog.items[0].source.url, 'https://example.com/prompts/city-postcard')
  assert.equal(first.catalog.items[0].attribution.authorHandle, 'prompt-lab-example')
  assert.equal(first.catalog.items[0].contentRevision, first.contentRevision)
  assert.ok(first.files.has('README.md'))
  assert.ok(first.files.has('locales/en/README.md'))
  assert.ok(first.files.has('locales/en/index.json'))
  assert.ok(first.files.has('locales/en/taxonomies.json'))
  assert.ok(first.files.has('locales/zh-CN/README.md'))
  assert.match(first.files.get('README.md'), /bootstrap checklist/)
})

test('draft and unreviewed documents never enter the public catalog', async (t) => {
  const root = await copyFixture(t)
  const file = path.join(root, 'content/prompts/prm_city_postcard/en.md')
  const source = await readFile(file, 'utf8')
  await writeFile(file, source.replace('"status": "published"', '"status": "draft"'))

  const result = await buildCatalog({ root })
  assert.equal(result.catalog.items.length, 1)
  assert.deepEqual(result.catalog.locales, ['en', 'zh-CN'])
  assert.equal(JSON.parse(result.files.get('locales/en/index.json')).total, 0)
})

test('schema, duplicate slugs, attribution, media, and Markdown links fail closed', async (t) => {
  const root = await copyFixture(t)
  const file = path.join(root, 'content/prompts/prm_city_postcard/en.md')
  const source = await readFile(file, 'utf8')
  await writeFile(file, source.replace('https://example.com/prompts/city-postcard', '').replace('\n## Source', '\n[missing](./missing.png)\n\n## Source'))

  await assert.rejects(
    validateRepository({ root }),
    (error) => {
      assert.match(error.message, /source\.url/)
      assert.match(error.message, /missing local Markdown link/)
      return true
    },
  )
})

test('taxonomy slugs are unique and local media cannot escape content', async (t) => {
  const root = await copyFixture(t)
  await writeFile(path.join(root, 'escape.png'), 'not-public-content')
  const promptFile = path.join(root, 'content/prompts/prm_city_postcard/en.md')
  const prompt = await readFile(promptFile, 'utf8')
  await writeFile(promptFile, prompt.replace('"media": []', '"media": [{"url": "../escape.png", "alt": "escape"}]'))

  const taxonomyDirectory = path.join(root, 'content/taxonomies/model/mdl_duplicate')
  await mkdir(taxonomyDirectory, { recursive: true })
  const taxonomy = JSON.parse(await readFile(path.join(root, 'content/taxonomies/model/mdl_example_image/en.json'), 'utf8'))
  taxonomy.id = 'mdl_duplicate'
  await writeFile(path.join(taxonomyDirectory, 'en.json'), `${JSON.stringify(taxonomy, null, 2)}\n`)

  await assert.rejects(
    validateRepository({ root }),
    (error) => {
      assert.match(error.message, /media reference must stay under content/)
      assert.match(error.message, /duplicate taxonomy slug in locale and axis/)
      return true
    },
  )
})

test('check detects stale generated files without rewriting them', async (t) => {
  const root = await copyFixture(t)
  await writeGenerated({ root })
  await checkGenerated({ root })
  await writeFile(path.join(root, 'catalog.json'), '{}\n')
  await assert.rejects(checkGenerated({ root }), /generated output is stale: catalog\.json/)
})
