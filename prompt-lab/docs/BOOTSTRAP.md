# Bootstrap the public CMS mirror

This checklist installs the CMS-first publication model. Policy files alone do
not authorize a live direct-main writer.

## 1. Confirm launch decisions

- GitHub owner, repository name and public visibility;
- Payload CMS environment and reviewer/admin membership;
- MIT for code and CC BY 4.0 for authorized original content;
- explicit owner acceptance of the `community_attributed` path;
- private security and rights contacts;
- generated path allowlist and mirror repository topology;
- production deploy owner and takedown escalation path.

Replace every owner/contact placeholder before launch.

## 2. Separate authority and credentials

Payload CMS is the content authority. GitHub `main` is a rebuildable public
mirror. Configure four separate credentials:

1. an intake-only CMS credential for approved Issues;
2. a read-only, snapshot-scoped CMS export credential;
3. a dedicated, repository-scoped SSH mirror deploy key;
4. a separate production deploy credential.

The CMS is protected by Cloudflare Access, so GitHub-hosted jobs also need a
dedicated Access service token. Never reuse a human browser session or place any
credential in generated output.

## 3. Install community intake

- Create labels for Prompt submission, community nomination, needs review,
  approved, synced, sync failed, takedown request and takedown approved.
- Install the original/authorized, community, correction, translation and
  takedown Issue Forms from this template.
- Restrict `approved` and `takedown-approved` to maintainers.
- Configure the sync to re-fetch the current Issue, verify its template,
  labels, approver, required checkbox values, `updated_at` and body hash, and
  use `repository + issue + revision` as an idempotency key.
- A changed Issue invalidates the old approval. A failed or partial media step
  must not silently create an approved CMS record.

## 4. Install the deterministic mirror

The exporter reads one immutable, pagination-closed CMS snapshot and builds in
a fresh temporary directory. It may manage only:

```text
content/site.json
content/prompts/<id>/<en|zh-CN>.md
content/taxonomies/<content-type|model>/<id>/<en|zh-CN>.json
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

The same export revision and exporter version must produce byte-identical
output. A complete run validates schema, rights, locale/slug, links, media,
unsafe markup, secret patterns and the manifest before any Git write. Missing
pages, revision drift or an allowlist-external change fails with zero commit and
zero push.

The repository script deliberately does not fetch URLs or receive Bearer
tokens. The workflow validates the configured HTTPS hostname, resolves every
address, rejects private/special results, pins the approved addresses into curl,
and stores a bounded temporary file. A later credential-free invocation uses
`--snapshot-file`. Direct `--url` use fails closed. The endpoint returns one JSON
envelope:

```json
{
  "schemaVersion": 1,
  "exportRevision": "cmsrev_00000001",
  "exporterVersion": "1.0.0",
  "manifestSha256": "sha256:<64 lowercase hex characters>",
  "manifest": {
    "schemaVersion": 1,
    "exportRevision": "cmsrev_00000001",
    "exporterVersion": "1.0.0",
    "counts": { "locales": 1, "prompts": 0, "taxonomies": 0 },
    "files": [
      { "path": "README.md", "sha256": "sha256:<64 lowercase hex characters>", "bytes": 0 }
    ]
  },
  "files": [
    { "path": "README.md", "encoding": "base64", "sha256": "sha256:<64 lowercase hex characters>", "content": "" }
  ]
}
```

The two file arrays are path-sorted and identical by path, byte count and
SHA-256. They include every generated file except `mirror-manifest.json`; the
sync writes that file from the canonical manifest and verifies
`manifestSha256`. A complete snapshot always includes `README.md`,
`catalog.json`, `content/site.json` and
`governance/content-rights.json` plus the closed, non-sensitive
`governance/publication-audit.json`. Unknown envelope fields, redirects, non-HTTPS
or local/private DNS results, non-canonical base64, duplicate/case-colliding
paths, symlinks, traversal and allowlist-external paths fail before managed
output is changed.

Configure repository variable `CMS_SNAPSHOT_URL` with the immutable snapshot
endpoint and repository secret `CMS_SNAPSHOT_TOKEN` with a read-only,
snapshot-scoped token of at least 32 URL-safe characters. If the endpoint is
behind Cloudflare Access, create a dedicated Service Auth policy for the exact
CMS application and store that service token as the repository secrets
`CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET`. Configure both or neither:
the fetch fails before making a request when only one is present or either has
an invalid Cloudflare service-token format. The Access pair only crosses the
outer Access boundary; the Bearer `CMS_SNAPSHOT_TOKEN` remains mandatory and
authorizes only the immutable snapshot endpoint. Never reuse a human Access
session, and rotate or revoke the dedicated pair independently.

Enable the four-hour schedule only after the bootstrap proof. For an offline
file, `npm run sync:cms -- --snapshot-file /trusted/temp/snapshot.json` applies
it transactionally; add `--check` to verify drift without writing. `npm run
validate:mirror` and `npm run check:mirror` re-read the complete on-disk mirror.

## 5. Configure direct-main safely

Generated content does not use per-content pull requests. Configure a dedicated,
passphrase-free Ed25519 SSH deploy key that may fast-forward `main` only after
verification. Install its public key with write access on
`ziyetsui/prompt-lab` only; store its private key as the Actions repository
secret `MIRROR_DEPLOY_KEY`. Never add it as a human account key, reuse it across
repositories or expose it to CMS/deploy jobs.

Humans and general Agents remain unable to push `main`, force-push or delete the
branch. Code, schema, workflow, license, policy and exporter changes continue to
require reviewed pull requests.

GitHub write permission is repository-wide, not path-scoped. Prefer a
generated-only mirror repository. If code and mirror output share one
repository, record the owner's explicit risk acceptance and add an independent
post-push audit that freezes deployment on unexpected paths.

The bot must compare-and-swap against the observed `main` SHA, produce no commit
for an already mirrored revision, and include the CMS export revision, manifest
hash and exporter version in its commit trailers. Never force-push.

Install `.github/workflows/sync-cms-snapshot.yml` only in the generated mirror
repository. Its default permission is `contents: read`; the CMS token exists
only in the DNS-pinned curl fetch step and repository code never runs there.
The credential-free prepare job uploads a hashed inert one-commit Git bundle.
A separate fresh runner does not check out or execute repository code: it
validates the artifact and hard-coded `ziyetsui/prompt-lab` target, re-fetches
`main`, compares the observed SHA and performs a normal fast-forward push. Only
that final step receives `MIRROR_DEPLOY_KEY`, with sanitized HOME, PATH, shell
startup, SSH agent and Git configuration. It writes the private key to a
mode-0600 temporary file, accepts only an Ed25519 key, pins GitHub's published
Ed25519 host key with strict host-key checking, and removes the temporary SSH
files on exit. A third fresh runner verifies pushed `main`. Do not use
`${{ github.token }}` or a human PAT as the writer.

An SSH deploy key is scoped to one repository, but its write permission is not
path-scoped. The writer's inline verifier therefore rejects any candidate that
touches workflows, code, policy, license or other non-generated paths before
SSH is invoked. Keep this as a generated-only repository, protect `main`
against force-push/deletion, and rotate the deploy key on suspected exposure or
operator change. GitHub documents both the
[single-repository deploy-key scope](https://docs.github.com/en/rest/deploy-keys/deploy-keys)
and the [published SSH host keys](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints).

Before commit, the workflow checks the prospective Git index against every
manifest path, mode, byte count and hash. It commits and pushes with hooks
disabled, checks a clean `HEAD`, then runs the same manifest/tree/rights
verifier from a fresh clean checkout after push. First-parent revision trailers
block replay and same-revision equivocation. GitHub's documented branch-ruleset
bypass actors do not include SSH deploy keys, so do not enable a
pull-request-required rule on this generated `main`: it would block the CAS
writer. Restrict collaborators, disallow force-push and deletion, and require
linear history. If actor-level ruleset bypass becomes mandatory, replace the
deploy key with a repository-scoped GitHub App instead of weakening the
verifier. See [ruleset bypass actors](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository#granting-bypass-permissions-for-your-branch-or-tag-ruleset).

## 6. Schedule, release and takedown

- Reconcile every four hours and allow a manual run.
- Dispatch `cms-publication-approved` immediately after approval and
  `cms-publication-takedown` after a rights downgrade or takedown.
- Verify the pushed commit independently before deployment.
- Mark `released` only after the production deployment and smoke evidence match
  the exact mirror commit and manifest.
- Give verified restrictions and takedowns priority over the schedule; keep
  retrying and alerting until the public mirror and deployment are removed.

## 7. Prove the launch path

1. Sync one harmless owner-authored `cleared` fixture from an approved Issue.
2. Sync one harmless `community_attributed` fixture and verify its rights-retained
   notice and absence of a CC BY claim.
3. Confirm wrong labels, missing checkboxes, unauthorized approvers, changed
   Issue bodies and replay conflicts fail closed.
4. Export the same CMS revision twice and confirm byte-identical output and no
   second commit.
5. Confirm a failed/partial snapshot creates no Git change.
6. Apply a takedown fixture and confirm priority removal from Markdown, README,
   catalog and deployment.
7. Rotate any credential exposed outside its intended secret store.

Do not migrate the existing 35 `review_required` seed records as part of
bootstrap. They need a separate readiness report and explicit owner-approved,
per-record rights decisions.
