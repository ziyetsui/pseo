# PromptLab CMS → GitHub live-beta handoff

Status: CMS-first approval → immutable snapshot → generated GitHub mirror →
protected exact-mirror Pages Preview has run end to end once; formal production
release receipt and CMS release projection remain incomplete

Date: 2026-09-03

## Binding publication decision

[`0011-promptlab-youmind-cms-publication.md`](../../specs/0011-promptlab-youmind-cms-publication.md)
replaces the per-content Git-first publication chain.

- Payload CMS is canonical for content, locales, taxonomy, source, rights and
  editorial decisions.
- Content does not use branch → PR → merge. A dedicated bot may update only a
  generated-only public repository by checked fast-forward to `main`.
- Code, schemas, workflows, policies, licenses and exporter changes continue to
  use normal engineering PRs.
- CMS approval, immutable public snapshot, Git mirror sync and production
  deployment are separate receipts.
- The 35 wireframe/X records remain `review_required` and excluded. There is no
  bulk rights promotion.

## Current local implementation

The active CMS now:

- mounts revision-bound prepare/approve endpoints and an **Approve revision**
  Admin action for reviewer/admin roles;
- binds approval to `contentRevision`, `sourceRevision`, independent
  `rightsRevision` and rights-policy version, and writes an append-only
  `content-approvals` audit record;
- supports fail-closed `cleared`, `community_attributed`, `restricted` and
  `takedown` rights validation; community content retains the author's rights,
  requires attribution/original source/takedown evidence and is not declared
  CC BY by the repository;
- no longer mounts the old publication-request routes, no longer constructs the
  GitHub PR publisher, and rejects `CMS_GIT_PUBLISHER=github` in active runtime.

Approval itself still has no Git, deploy or released-state side effect. The
external mirror workflow consumes the read-only approved snapshot separately.

The active CMS also exposes a default-disabled, read-only public-snapshot
endpoint. It selects exact approved revisions with closed pagination and builds
deterministic envelope/manifest bytes inside one PostgreSQL repeatable-read,
read-only transaction. Stale content/source/rights revisions are excluded from
the next full snapshot, enabling removal without publishing stale bytes.

The deployed CMS uses Neon PostgreSQL through Hyperdrive and performs snapshot
reads in one repeatable-read, read-only transaction. The retired D1 runtime
continues to fail closed with `503 SNAPSHOT_CONSISTENCY_UNAVAILABLE`; it is not
the active publication source.

`prompt-lab-template` now contains the generated-mirror **consumer** scaffold:

- a strict immutable snapshot-envelope validator and transactional tree sync;
- generated-path, hash, UTF-8, secret and executable-HTML gates;
- a four-hour/manual GitHub Action that observes `main`, validates the complete
  output, and performs a non-force fast-forward push only if the remote SHA has
  not changed;
- deterministic empty-snapshot handling that removes the last Prompt and orphan
  taxonomy while retaining safe empty locale indexes;
- no per-content PR and no persisted checkout credential.

The consumer and control plane were installed in `ziyetsui/prompt-lab` through
engineering PRs #6-#10. Run
[33761670885](https://github.com/ziyetsui/prompt-lab/actions/runs/33761670885)
prepared, pushed and post-push verified the first approved snapshot at mirror
commit `1a3352b85e5394fe899220418d9a8d8e67082661`, export revision
`sha256:7ea734603e1ca5976d0f35636cb615ffd542c572521ccece86f8eabfe5601114`
and manifest
`sha256:9fab060d9d201645ac49eeff72bd4fbbf71e9e2ef353a3cbea2d0b7ebb039ee6`.

The old `tools/content-agent` Markdown/worktree CLI and runner now fail closed
before dependency, SDK, Git or filesystem access. A CMS proposal adapter is not
implemented; Agent-assisted authoring must not fall back to editing the mirror.

Local tests cover producer/consumer compatibility, public-rights variants,
stale-revision removal, empty snapshots and mirror validation. These are local
implementation checks, not online release evidence.

## Current online checkpoint

The owner approved the golden Prompt in CMS; the other 35 wireframe/X records
remain `review_required`. Cloudflare Pages deployment `a4cb721c` was built from
the exact mirror commit and manifest above. Authenticated smoke passed the
Prompt list, detail and model routes (200), unknown Prompt (404/noindex) and CSS
(200), and verified that the detail contains the Prompt body, source evidence
and `CC BY 4.0` without a CMS Preview marker.

This remains a protected Internal Beta Preview. The engineering worktree was
dirty at build time, and there is no signed deployment callback, persistent
deployment/smoke receipt or CMS `released` projection. Do not report this as a
formal production release.

## Required completion order

1. Create a clean engineering commit and reproducible build receipt.
2. Persist mirror run, drift/retry, manifest and deployment/smoke receipts.
3. Implement the signed deployment callback and CMS release projection.
4. Complete production/indexable deployment plus same-tuple smoke.
5. Prove Issue replay protection, CAS conflict/no-op and priority takedown/
   removal deployment online.

## Existing online checkpoint — not the cutover

The following deployment predates the present changes:

- D1 `pseo-cms-beta`
  (`aeec1c88-bc9c-4d6e-a4c2-9f8bda4f7a7b`) previously read back
  36 Prompt / 36 locale / 37 source-evidence / 71 taxonomy rows with no
  foreign-key violations;
- CMS Worker `pseo-cms-beta`, version
  `18b56753-2204-4b31-b51d-313f132b1e07`, is available at
  <https://pseo-cms-beta.codex-cloudflare-20260612.workers.dev> behind
  owner-only Access;
- protected Pages preview `c75633aa` is available at
  <https://internal-beta.pseo-internal-beta-preview.pages.dev>;
- anonymous Access checks and earlier owner-authenticated Pages/CMS-shell smoke
  passed; custom DNS and a Backend/API Worker remain pending.

This is historical only and does **not** describe the current PostgreSQL CMS,
generated mirror or `a4cb721c` Preview. It remains useful as rollback/audit
context, not as release evidence.

## Historical Git-first evidence

Retain these links only to explain the retired experiment:

- [PR #2](https://github.com/ziyetsui/prompt-lab/pull/2) established the
  repository/license foundation and was merged as
  `171a5320f1dc66a2fecab3d52f501ce697d4e820`.
- [PR #3](https://github.com/ziyetsui/prompt-lab/pull/3) was the first failed CMS
  Prompt proof and is superseded — **DO NOT MERGE**.
- [PR #4](https://github.com/ziyetsui/prompt-lab/pull/4) was an old schema
  compatibility candidate.
- [PR #5](https://github.com/ziyetsui/prompt-lab/pull/5) was the corrected old
  Prompt candidate.

PRs #3/#4/#5 are not prerequisites or operating steps for the CMS-first model.
Do not merge, rebase, resubmit or reuse the retired content-PR UI procedure to
publish content. Its `publication-requests` rows remain read-only audit
evidence only.

## Operator boundary

- Do not give the CMS a GitHub mirror-write credential.
- Do not set active CMS runtime to `CMS_GIT_PUBLISHER=github`.
- Do not grant the mirror identity access beyond generated-only repository
  writes or reuse it for application/code changes.
- Treat proposal accepted, CMS approval, CMS public snapshot, mirror synced and
  production deployed as separate states in every status report.
