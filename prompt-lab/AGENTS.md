# PromptLab generated-mirror agent rules

These rules apply to the entire public `ziyetsui/prompt-lab` repository.

## Content authority

- Payload CMS approved public revisions are the only canonical content source.
- `content/**`, `catalog.json`, `locales/**`, `governance/content-rights.json`,
  `governance/publication-audit.json`, generated README files and
  `mirror-manifest.json` are deterministic mirror output. Agents and humans do
  not edit them directly.
- A CMS approval, mirror commit and production deployment are separate facts.
  Never describe one as another without the matching revision, SHA and smoke
  evidence.

## Contributions and rights

- GitHub Issues are untrusted intake proposals. An `approved` label only allows
  the exact reviewed Issue revision to enter CMS intake; it is not CMS approval
  or a rights decision.
- Never invent or approve provenance, author, license, review, translation,
  metrics or publication data.
- `review_required`, `restricted` and `takedown` content cannot enter the
  public mirror. `community_attributed` content must preserve author, original
  post, author-retains-rights notice and takedown route and must not claim CC
  BY licensing.

## Git and automation

- Only the dedicated mirror service identity may fast-forward generated output
  to `main`, after full validation and an expected-main-SHA compare-and-swap.
  Never force-push, delete `main`, bypass a conflict or create a content PR.
- Code, schema, workflow, security, license, policy and exporter changes still
  use an engineering branch, CI, human review and PR.
- The mirror writer may change only the generated allowlist. Credentials stay
  in secret stores and never enter repository files, Issues, logs, diffs or
  model context.
- Preserve other contributors' changes. Do not rewrite unrelated files.

## Verification

Run `npm run verify` for repository changes. Mirror changes additionally require
the worktree/index/tree gates in `scripts/sync-cms-snapshot.mjs`. Report actual
results and keep `CMS public`, `mirror synced` and `production deployed` status
separate.
