import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
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

test('removed locales are rejected as obsolete and generate prunes only managed files', async (t) => {
  const root = await copyFixture(t)
  await writeGenerated({ root })
  await writeFile(path.join(root, 'locales/zh-CN/keep.txt'), 'not managed\n')
  await writeFile(path.join(root, 'locales/zh-CN/catalog.json'), '{}\n')
  await rm(path.join(root, 'content/prompts/prm_city_postcard/zh-CN.md'))
  await rm(path.join(root, 'content/taxonomies/content-type/cty_image/zh-CN.json'))
  await rm(path.join(root, 'content/taxonomies/model/mdl_example_image/zh-CN.json'))
  const sitePath = path.join(root, 'content/site.json')
  const site = JSON.parse(await readFile(sitePath, 'utf8'))
  site.locales = ['en']
  site.publishedLocales = ['en']
  await writeFile(sitePath, `${JSON.stringify(site, null, 2)}\n`)

  await assert.rejects(checkGenerated({ root }), /obsolete managed output: .*locales\/zh-CN\/README\.md/)
  await writeGenerated({ root })
  await checkGenerated({ root })
  await assert.rejects(readFile(path.join(root, 'locales/zh-CN/README.md')), { code: 'ENOENT' })
  await assert.rejects(readFile(path.join(root, 'locales/zh-CN/catalog.json')), { code: 'ENOENT' })
  assert.equal(await readFile(path.join(root, 'locales/zh-CN/keep.txt'), 'utf8'), 'not managed\n')
})

test('absolute, escaping, and symbolic local references fail real-path containment', async (t) => {
  const root = await copyFixture(t)
  const outside = await mkdtemp(path.join(os.tmpdir(), 'prompt-lab-outside-'))
  t.after(() => rm(outside, { recursive: true, force: true }))
  await writeFile(path.join(outside, 'outside.txt'), 'outside')
  const promptDirectory = path.join(root, 'content/prompts/prm_city_postcard')
  await symlink(path.join(outside, 'outside.txt'), path.join(promptDirectory, 'linked.txt'))
  await mkdir(path.join(root, 'content/media'), { recursive: true })
  await symlink(path.join(outside, 'outside.txt'), path.join(root, 'content/media/linked.bin'))
  const promptPath = path.join(promptDirectory, 'en.md')
  const prompt = await readFile(promptPath, 'utf8')
  const links = `[absolute](/etc/passwd)\n[escape](../../../../${path.basename(outside)}/outside.txt)\n[linked](./linked.txt)\n\n`
  await writeFile(promptPath, prompt.replace('"media": []', '"media": [{"url": "media/linked.bin", "alt": "Linked output"}]').replace('\n## Source', `\n${links}## Source`))

  await assert.rejects(
    validateRepository({ root }),
    (error) => {
      assert.match(error.message, /absolute local Markdown link is forbidden/)
      assert.match(error.message, /Markdown link escapes the repository/)
      assert.match(error.message, /symbolic Markdown link is forbidden/)
      assert.match(error.message, /symbolic media reference is forbidden/)
      return true
    },
  )
})

test('accepted media bytes are included in the deterministic content revision', async (t) => {
  const root = await copyFixture(t)
  await mkdir(path.join(root, 'content/media'), { recursive: true })
  const mediaPath = path.join(root, 'content/media/example.bin')
  await writeFile(mediaPath, 'first')
  const promptPath = path.join(root, 'content/prompts/prm_city_postcard/en.md')
  const prompt = await readFile(promptPath, 'utf8')
  await writeFile(promptPath, prompt.replace('"media": []', '"media": [{"url": "media/example.bin", "alt": "Example output"}]'))

  const first = await buildCatalog({ root })
  await writeFile(mediaPath, 'second')
  const second = await buildCatalog({ root })
  assert.notEqual(first.contentRevision, second.contentRevision)
})

test('external media cannot bypass the offline media revision contract', async (t) => {
  const root = await copyFixture(t)
  const promptPath = path.join(root, 'content/prompts/prm_city_postcard/en.md')
  const prompt = await readFile(promptPath, 'utf8')
  await writeFile(promptPath, prompt.replace('"media": []', '"media": [{"url": "https://example.com/unpinned.png", "alt": "Remote output"}]'))
  await assert.rejects(validateRepository({ root }), /external media is forbidden/)
})

test('the executable schema is closed at top-level and nested objects', async (t) => {
  const root = await copyFixture(t)
  const promptPath = path.join(root, 'content/prompts/prm_city_postcard/en.md')
  const prompt = await readFile(promptPath, 'utf8')
  await writeFile(
    promptPath,
    prompt
      .replace('"schemaVersion": 1,', '"schemaVersion": 1,\n  "cmsDraft": true,')
      .replace('"platform": "web",', '"platform": "web",\n    "privateNote": "must not leak",'),
  )

  await assert.rejects(
    validateRepository({ root }),
    (error) => {
      assert.match(error.message, /unknown field cmsDraft/)
      assert.match(error.message, /source: unknown field privateNote/)
      return true
    },
  )
})
