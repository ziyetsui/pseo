# Executable content schema

`npm run validate` is the canonical, dependency-free schema check. It calls the same closed validator in `lib/catalog.mjs` that `generate` and `check` call. There is intentionally no parallel JSON Schema artifact to drift from executable behavior.

All JSON objects are closed: fields not listed below fail validation. All required strings are non-empty.

## `content/site.json`

Required fields: `schemaVersion` (exactly `1`), `siteName`, `defaultLocale`, unique `locales`, and unique non-empty `publishedLocales`. Locale identifiers must be valid language tags under the repository's restricted locale pattern. The default and every published locale must be supported.

## Prompt Markdown frontmatter

Files live at `content/prompts/<immutable-id>/<locale>.md`. Frontmatter is JSON-compatible data between `---` markers.

Required top-level fields:

- `schemaVersion`, `id`, `type`, `locale`, `slug`, `title`, `summary`;
- `status`, `indexable`, `contentType`, `models`;
- `prompt`, `media`, `source`, `publication`, `translation`.

The ID must match `prm_[a-z0-9_]{3,64}` and its directory. Locale must match the filename and `content/site.json`. Slugs are lowercase hyphenated identifiers and unique within a locale. Status is one of `draft`, `review`, `published`, `tombstoned`.

Nested objects are closed:

- `prompt`: `language`, `text`;
- each `media` item: local relative `url`, `alt`, and optional non-empty `type`;
- `source`: required `platform`, `sourceId`, `url`, `authorHandle`; optional `publishedDate`, `observedAt`;
- `publication`: `publishedAt`, `updatedAt`;
- `translation`: required `status` and optional `reviewer`, where status is `draft`, `review`, `ready`, or `stale`.

Source URLs must be absolute HTTP(S); optional source dates are validated. Publication values are RFC 3339 UTC timestamps. A ready translation must name its reviewer. Local Markdown links must resolve to regular files inside the repository. Media must be checked into `content/**`: external media URLs, absolute paths, escapes, and symbolic links are rejected, and every accepted media file is included in the content revision. No network request is made for external source URLs.

## Taxonomies

Files live at `content/taxonomies/<axis>/<immutable-id>/<locale>.json`.

Required closed fields are `schemaVersion`, `id`, `type`, `axis`, `locale`, `slug`, `name`, `description`, `status`, `selector`, and `translation`. Supported axes are `content-type` and `model`; IDs use the corresponding `cty_` or `mdl_` prefix. Selector has only `field` and `value`; `content-type` selects `contentType` and `model` selects `models`.

ID/locale/axis must match the path. ID+locale and axis+locale+slug are unique. Every public Prompt's content type and models must resolve to reviewed taxonomy records in the same locale.

## Public admission gate

A valid record is emitted only when its locale is published, its status is `published`, and its translation status is `ready`. Drafts remain valid source candidates but cannot enter `catalog.json` or locale indexes.
