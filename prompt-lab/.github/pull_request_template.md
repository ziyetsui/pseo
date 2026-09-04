## Control-plane change

<!-- Describe the code, schema, workflow, policy, security or exporter change. Content submissions use Issues and CMS, not pull requests. -->

## Authority and generated-output boundary

- [ ] This PR does not treat GitHub Markdown as the content source of truth.
- [ ] I did not manually edit generated `content/**`, `README*.md`, catalog,
      locale indexes, rights projection or mirror manifest.
- [ ] The change cannot set CMS approval/rights state or invoke `released`
      without the required human and deployment evidence.
- [ ] I did not add confidential information, personal data, credentials,
      private URLs or unreviewed CMS snapshot data.

## Safety checks

- [ ] Applicable lint, typecheck, tests and deterministic verification pass.
- [ ] Intake changes re-fetch and bind the exact Issue revision, approver and
      idempotency key.
- [ ] Export changes fail closed on incomplete snapshots, rights errors,
      unexpected paths, unsafe markup, symlinks and secret-like values.
- [ ] Mirror writes are fast-forward/compare-and-swap only and cannot
      force-push, alter workflows/licenses or claim deployment success.
- [ ] `community_attributed` output preserves attribution, original source,
      author-retains-rights notice and takedown route without a CC BY claim.
- [ ] I inspected the full diff and documented remaining risks.

## Verification evidence

<!-- List exact commands and actual results. -->

## Risks or rollout notes

<!-- Include migration, credential, branch-ruleset, rollback and takedown impact. -->
