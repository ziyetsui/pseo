# Generated mirror schema

Payload CMS owns the approved content and revisions. This repository contains a
generated public view. `scripts/sync-cms-snapshot.mjs` now implements the v1
Prompt-only consumer, closed contract validation, transactional replacement and
worktree/Git-tree verification. It does not make the CMS snapshot producer,
production D1 migration, release receipt or takedown edge suppression complete;
keep the scheduled writer disabled until those components pass the bootstrap
proof.

`lib/catalog.mjs` remains only for the checked-in pre-migration example through
the explicitly named `*:legacy` commands. `npm run verify` selects the active
repository mode: it uses the exact mirror verifier whenever a manifest exists,
and Git history prevents a migrated mirror from falling back to legacy mode.
The mirror gates are `npm run validate:mirror`, `npm run check:mirror`,
`--verify-git-index` and `--verify-git-tree`.

All JSON objects described below are closed. Unknown or missing fields fail the
entire snapshot.

## V1 generated paths

The exact supported path classes are:

```text
README.md
README_en.md
README_zh-CN.md
catalog.json
content/site.json
content/prompts/<prm_[a-z0-9_]{8,64}>/<en|zh-CN>.md
content/taxonomies/<content-type|model>/<matching cty_|mdl_ id>/<en|zh-CN>.json
governance/content-rights.json
governance/publication-audit.json
locales/<en|zh-CN>/README.md
locales/<en|zh-CN>/index.json
locales/<en|zh-CN>/taxonomies.json
mirror-manifest.json
```

Every segment beginning with `.`, including `.git*`, is forbidden. Articles,
surfaces, arbitrary media files, other locales and other extensions are not yet
verified and are excluded rather than accepted loosely.

## Site and public Prompt

`content/site.json` has exactly `schemaVersion`, `siteName`, `defaultLocale`,
`locales` and `publishedLocales`. Locales are currently `en` and `zh-CN`.
`publishedLocales` may be empty so the last takedown can produce a valid empty
Prompt mirror; every emitted Prompt locale must nevertheless be listed there.

Prompt Markdown uses JSON frontmatter and the full canonical rich contract from
`schemas/content.schema.json`: `sourceLocale`, all five taxonomy dimensions,
`outcome`, `metrics`, `inputs`, `parameters`, `examples`, `workflow`, `creator`,
`relatedPromptIds`, `actions`, `evidence`, `seo`,
`publication.sourceRevision` and `translation.translatedFromRevision` are not
discarded. Objects and nested objects are closed.

Within a locale, Prompt slugs are unique. All public locales for the same
Prompt ID must name the same source locale and source revision; a translated
variant's `translatedFromRevision` must equal that source revision.

The public renderer may make only explicit public-state projections after the
bound approval: Prompt `status=published`, `indexable=true`,
`seo.robots=index,follow`, a non-null UTC `publication.publishedAt`, and
`translation.status=ready` with a reviewer. For v1, `media`, `examples` and
`relatedPromptIds` must be empty because their independent rights/link
projections are not implemented. Markdown links may be anchors or safe HTTPS
URLs only; local links are rejected so removal cannot leave a dangling target.
Generated root and locale READMEs may use relative links, but every such target
must resolve to an allowlisted file in the same manifest.

## Taxonomies and indexes

Taxonomy JSON uses the full closed taxonomy contract. A v1 taxonomy is
`published` but remains `indexable=false` and `noindex,nofollow`; it is Prompt
dependency metadata, not a separately approved indexable surface. Every Prompt
content type and model must resolve to exactly one selector in the same locale.
Duplicate identity, slug or selector and orphan taxonomies fail the snapshot.
All locale variants of one taxonomy ID share `sourceLocale` and
`publication.sourceRevision`; a translated variant's
`translatedFromRevision` equals that source revision.

`catalog.json` has exactly `schemaVersion`, `exportRevision`, `total`, `items`.
Each item has exactly `id`, `locale`, `path`, `slug`, `title`, `summary`,
`sourceUrl`, `rightsStatus` and must equal its Prompt and rights record.
`locales/<locale>/index.json` adds `locale` and is the exact locale-filtered
catalog. `locales/<locale>/taxonomies.json` has
`schemaVersion`, `exportRevision`, `locale`, `total`, `items`; each item is
`{path, ...the complete taxonomy record}` and must equal that file. Its stable
order is taxonomy `axis`, then `slug`, then path.

## Rights projection

`governance/content-rights.json` has exactly:

```text
schemaVersion, exportRevision, total, items
```

There is exactly one path-sorted item for every public Prompt ID and locale and
no orphan item. Common item fields are `id`, `locale`, `status`,
`rightsRevision`, `sourceUrl`, `reviewedAt`.

- `cleared` adds exactly `basis`, `evidenceUrl`, `licenseReference`.
- `community_attributed` adds exactly `authorName`, nullable `authorUrl`,
  `originalPostUrl`, `policyVersion`, `riskAcceptanceRevision`, `takedownUrl`,
  `notice`; it cannot contain a license field.

The community source and original-post URLs must agree. Its Prompt Markdown and
locale README must contain the public author, source, exact locale-specific
author-retains-rights notice and takedown URL, and cannot contain a CC BY claim.
`unknown`, `review_required`, `restricted` and `takedown` never serialize.

`governance/publication-audit.json` has exactly `schemaVersion`,
`exportRevision`, `total`, `items`. There is one ID/locale-sorted item per
public Prompt with exactly `approvalId`, `approvedAt`, `contentRevision`, `id`,
`locale`, `rightsRevision`, `sourceRevision`. It binds the Prompt approval time
and source revision and the rights registry revision. Reviewer identity and
idempotency keys are deliberately excluded. The list may be empty for a
complete removal snapshot.

## Envelope, manifest and replay rules

The immutable envelope and its manifest have exact fields. Manifest counts are
exactly `locales`, `prompts`, `taxonomies`; its file list is path-sorted and
matches envelope bytes and hashes. `mirror-manifest.json` is canonical JSON
created from that manifest, so the manifest does not hash itself.
`exportRevision` identifies the closed CMS approval input and is not derived
from generated output; `manifestSha256` binds the final generated bytes.

The same current revision with the same manifest is a no-op. The same revision
with different bytes is equivocation and fails. A revision already seen in the
first-parent `main` trailers cannot replace a newer mirror. The prospective Git
index and clean pre/post-push `HEAD` must contain exactly the manifest paths,
regular `100644` modes and matching bytes.

The reusable producer/consumer fixture is
`tests/fixtures/cms-public-snapshot-fixture.mjs`; the authoritative validator
exports are `validateSnapshotEnvelope`, `validatePublicMirrorFileMap` and
`verifyMirrorDirectory` from `scripts/sync-cms-snapshot.mjs`.
