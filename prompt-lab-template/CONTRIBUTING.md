# Contributing to Public Prompt Lab

Thank you for helping build a useful, attributable Prompt commons.

## Before you start

- Search existing issues and `catalog.json` for duplicates.
- Do not submit private, confidential, personal, or unlawfully obtained material.
- Provide the original source URL and creator attribution. If you are the creator, say so.
- Only contribute material that may be redistributed under the repository's eventual content license.

## Choose a contribution path

- **New Prompt:** open the Prompt contribution issue form.
- **Correction:** report a factual, attribution, safety, or formatting problem.
- **Translation:** propose one locale for an existing immutable Prompt ID.

An issue is a review candidate, not published content. Automation must never convert an issue directly into a public catalog entry. A maintainer verifies provenance and quality, creates or approves the Git Markdown, and merges it through the protected pull-request workflow.

## Pull requests

1. Put Prompt sources in `content/prompts/<immutable-id>/<locale>.md`.
2. Keep JSON-compatible frontmatter between the `---` markers.
3. Preserve the original Prompt language. Translate the surrounding explanation, not the Prompt, unless the source itself has another language.
4. Set content to `published` and translation to `ready` only after an authorized reviewer approves it.
5. Run `npm run generate` and commit the deterministic outputs.
6. Run `npm run verify` before requesting review.

The required CI check validates schemas, immutable IDs, locale slugs, source attribution, local links, media references, taxonomy membership, and regenerated indexes.

## Review standard

Maintainers check source authenticity, contributor rights, attribution, safety, reproducibility, translation quality, and whether the Prompt adds material value. Review may reject or edit submissions. Merging a pull request is the only publication event in this repository.
