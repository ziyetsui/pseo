# Public content contract

The default branch is the public source of truth. CMS drafts and preview APIs are never build inputs.

A localized Prompt is public only when all of these conditions are true:

- its locale appears in `content/site.json` under `publishedLocales`;
- frontmatter `status` is `published`;
- `translation.status` is `ready` and names a reviewer;
- immutable ID, locale filename, slug, source attribution, links, media, and referenced taxonomy records validate;
- the pull request passes `validate / content`, receives human approval, and merges.

`catalog.json`, locale README files, locale indexes, and taxonomy indexes are deterministic projections. Their `contentRevision` is a SHA-256 digest of sorted checked-in files under `content/**`. A public build never includes wall-clock time or CMS state in that digest.
