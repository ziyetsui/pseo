# Contributing to Public Prompt Lab

Thank you for helping build a useful, attributable Prompt commons. PromptLab is
CMS-first: community Issues are reviewed intake records, Payload CMS is the
content authority, and GitHub content files are generated mirrors.

> Implementation note: these forms describe the approved policy. Intake and
> mirror automation must pass the bootstrap proof before maintainers use the
> `approved` label as an automated action.

## Before you start

- Search existing Issues and the generated catalog for duplicates.
- Never submit credentials, private URLs, personal data, confidential material
  or unlawfully obtained content.
- Preserve the Prompt's original language. A localized explanation must not be
  presented as the source author's original Prompt.
- Provide an HTTPS original source and accurate creator attribution.
- Do not claim that public visibility gives you permission to relicense a work.

## Choose exactly one rights path

### Original, authorized or compatibly licensed Prompt

Use the **Original or authorized Prompt** form only when you are the creator,
have explicit authorization, or can identify a compatible source license. You
must provide the rights basis and accept CC BY 4.0 for the material you have
authority to contribute.

After a maintainer checks the current Issue body, required attestations,
provenance and safety, they may add `approved`. A successful, idempotent sync
then creates or updates a CMS intake candidate for the `cleared` path and
records the exact Issue revision and approver. It enters an approved export
snapshot only after CMS accepts a revision-bound editorial and rights decision.

### Community Prompt nomination

Use the **Community Prompt nomination** form when you found a public Prompt but
do not own it. This is a source lead, not a license grant. Supply the original
author, author profile when available, original post and enough context to
review the nomination.

A maintainer may send it to CMS for review under the explicit
`community_attributed` policy.
Published mirrors must then show the attribution, original source, “author
retains rights” notice and takedown route, and must not claim that the third
party Prompt is CC BY 4.0. Media requires a separate permission decision.

## Corrections and translations

- A correction identifies the immutable Prompt ID and locale and supplies
  evidence for the requested change.
- A translation covers localized explanation only unless the source itself
  contains the translated Prompt. The contributor must have authority to offer
  their translation under CC BY 4.0.
- Either path remains pending until a maintainer approves the current Issue
  revision and CMS validation succeeds.

Editing an approved Issue changes its body hash and invalidates the old
approval. Replayed events must not create duplicate CMS records.

## Rights and takedown requests

Use the dedicated takedown form for attribution, permission, privacy or removal
concerns. Do not put sensitive identity evidence in a public Issue; use the
private contact configured by the repository when necessary. A verified
takedown or restriction is prioritized over the four-hour reconciliation and
must remove the record from the next CMS export snapshot.

Git cannot erase history through an ordinary commit. Requests requiring history
rewrites follow a separate owner-approved legal/security procedure.

## Pull requests

Content contributors do not edit `content/**`, `catalog.json`, locale indexes or
generated README files. The mirror bot replaces those files from one immutable
CMS snapshot and may fast-forward `main` only after the complete output passes
its allowlist and verification gates.

Pull requests remain required for code, schema, workflow, license, policy,
security and exporter changes. Use the repository pull-request template, run the
applicable checks, and do not include generated content or CMS credentials in a
control-plane PR.

## Maintainer review standard

Maintainers verify duplicate status, source authenticity, author attribution,
rights path, content and media safety, locale quality and usefulness. The
`approved` label is a privileged publication decision, not a convenience tag.
An approval is valid only for the exact Issue revision later accepted by CMS.
