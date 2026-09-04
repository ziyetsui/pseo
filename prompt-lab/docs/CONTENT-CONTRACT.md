# Public mirror content contract

Payload CMS and its versioned approvals are the content source of truth. The
default branch contains a generated, rebuildable public mirror. Manual edits to
generated content have no authority and are replaced by the next full export.

The Prompt-only snapshot consumer and direct-main workflow contract are
implemented locally. The writer must remain disabled until the CMS immutable
snapshot producer, production migration, dedicated credentials and complete
bootstrap proof are deployed. Consumer completion is not evidence that any CMS
record, Git mirror or production release has changed.

## Admission gate

A localized Prompt may enter an export snapshot only when all of the following
are true:

- editorial state is `approved` and the approval binds the current content,
  source and rights revisions;
- rights status is `cleared` or `community_attributed` and every field required
  by that path is complete;
- translation status is ready, names an authorized reviewer and is not stale;
- immutable ID, locale, slug, source, evidence, relationships, media and safety
  checks pass;
- indexability and robots values agree with the approved public state.

`review_required`, `unknown`, `restricted` and `takedown` records never enter a
new public snapshot.

For `cleared`, the CMS decision must identify the rights basis, reviewer, UTC
time, evidence and license/permission reference. For `community_attributed`, it
must identify the author, original post, reviewer, UTC time, policy version,
risk acceptance and takedown URL. Generated community entries say “author
retains rights” and do not claim CC BY 4.0.

Prompt-text rights do not imply permission to copy third-party media. Media
without a separate acceptable decision is omitted or replaced by an approved
placeholder.

## Snapshot and generated paths

The exporter consumes one immutable, pagination-closed snapshot containing an
export revision, per-record content/source/rights revisions, approval
references, taxonomy/site/surface revisions and exporter schema version.
Revision drift or incomplete pagination invalidates the whole run.

The v1 consumer intentionally supports only these path classes:

```text
content/prompts/<id>/<locale>.md
content/taxonomies/<content-type|model>/<id>/<locale>.json
content/site.json
governance/content-rights.json
governance/publication-audit.json
README.md
README_en.md
README_zh-CN.md
catalog.json
locales/<en|zh-CN>/README.md
locales/<en|zh-CN>/index.json
locales/<en|zh-CN>/taxonomies.json
mirror-manifest.json
```

Articles, surfaces, arbitrary media paths and other locales stay fail-closed
until their schemas and rights checks are implemented. An empty Prompt tree is
valid, so a takedown can remove the last item without inventing placeholder
content.

The mirror manifest records the CMS export revision, exporter version, sorted
generated-file hashes and content counts. Time-of-run metadata must not affect
content hashes.

The publication audit projection contains one non-sensitive, closed record per
public Prompt ID/locale: approval ID/time plus content, source and rights
revisions. It contains no reviewer identity or intake idempotency key and is
empty in a complete removal snapshot.

## Deterministic publication

The same export revision and exporter version produce byte-identical output.
The exporter builds in a fresh temporary directory, removes obsolete managed
files, uses stable ordering/JSON/LF, and verifies schema, rights, locale/slug,
links, media, unsafe markup, secret patterns and manifest integrity.

Any fetch, validation, path-allowlist or compare-and-swap failure produces zero
commit and zero push. An already mirrored revision is a no-op. After all checks,
only the mirror bot may fast-forward `main`; it never force-pushes. Content does
not use per-item branches or pull requests. Control-plane changes—code, schema,
workflow, license, policy, security and exporter—still require normal PR review.

The repository script never receives a network credential or performs network
fetches. A workflow-only step validates DNS results, rejects private/special
addresses, pins them into curl, and writes a bounded temporary snapshot. A
later credential-free step validates and applies that file. The same manifest,
rights and byte verifier runs against the prospective Git index and clean HEAD
before push. It packages only a hashed, inert, one-commit Git bundle. A separate
fresh runner with no checkout validates the artifact, hard-coded repository,
base SHA, manifest paths/bytes and commit trailers using trusted inline code;
only its final system-Git step receives the mirror credential. A third fresh
runner verifies pushed `main`. Historical `CMS-Export-Revision` trailers
prevent replay; same-revision/different-manifest output is rejected as
equivocation. Approved and takedown repository-dispatch events provide the
immediate path; the schedule remains reconciliation fallback.

## Mirror is not release

A mirror commit proves only that a CMS snapshot reached GitHub. Production is
`released` only after an independently verified deployment and smoke test match
that exact commit and manifest. Deployment failure keeps the last-known-good
release.

Verified restrictions and takedowns trigger priority regeneration and removal;
the four-hour schedule is only reconciliation fallback. Ordinary removal cannot
purge Git history, which requires a separate owner-approved legal/security
process.
