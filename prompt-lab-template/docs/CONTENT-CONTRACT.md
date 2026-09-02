# Public content contract

The default branch is the public source of truth. CMS drafts and preview APIs are never build inputs.

A localized Prompt is public only when all of these conditions are true:

- its locale appears in `content/site.json` under `publishedLocales`;
- frontmatter `status` is `published`;
- `translation.status` is `ready` and names a reviewer;
- immutable ID, locale filename, slug, source attribution, links, media, and referenced taxonomy records validate;
- the pull request passes `validate / content`, receives human approval, and merges.

The canonical schema is the closed, executable offline validator in `lib/catalog.mjs`, documented in [CONTENT-SCHEMA.md](CONTENT-SCHEMA.md). This repository deliberately does not publish disconnected JSON Schema files: `npm run validate` executes the same contract that generation uses, so CI and runtime cannot silently drift.

`catalog.json`, locale README files, locale indexes, and taxonomy indexes are deterministic projections. Their `contentRevision` is a SHA-256 digest of sorted checked-in files under `content/**`, including every accepted local media file. A public build never includes wall-clock time or CMS state in that digest.

`npm run check` fails on missing, changed, or obsolete managed generated files. `npm run generate` updates current projections and removes only obsolete generated `README.md`, `catalog.json`, `index.json`, and `taxonomies.json` files under removed locale directories; unrelated files are preserved.
