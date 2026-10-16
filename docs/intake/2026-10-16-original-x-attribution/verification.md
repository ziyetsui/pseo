# Original X source attribution — 2026-10-16

Replaced all 814 imported YouMind card attributions with 814 distinct X post URLs and matching @handles, shared by English and Chinese. No unresolved mappings. Screenshot example: [@MyWestLord](https://x.com/MyWestLord/status/2063321372789465409).

Evidence: every source page exposes a unique explicit original-post header link. Recommendation links were excluded. The screenshot post was additionally fetched through twitter-cli, confirming West Lord / MyWestLord and the matching article title. The remaining mappings establish the source curator’s original-post attribution; they do not independently prove image authorship. Full source-page hashes are recorded per mapping, with a dataset hash in manifest.json. Re-running the committed resolver against cached evidence reproduced all 814 records exactly.

Implementation: immutable capture retained; validated display overlay binds each correction to its original record ID, source URL and source update timestamp. Missing, duplicate, stale, invalid-host and mismatched-account mappings fail closed. Other platforms, content identities, templates and media are preserved. Attribution participates in catalog and export revision. No CMS/rights status changes; beta remains noindex.

Validation performed:

- Frontend unit tests: 56 files, 260 tests passed. New regressions failed before the fix.
- Typecheck passed; lint passed with 19 existing image optimization warnings and no errors.
- Git beta production build passed: revision sha256:c46e51d0049c9eee2bad342189c1c71c2d55a2aa7a3eb761b267bd746189c46d.
- Static validation passed: 4,485 HTML pages and 219,486 local links.
- Original attribution validator passed on all 1,628 bilingual detail pages, checking the matching author, exact X post anchor and absence of YouMind anchors in main content.
- Targeted Playwright checks: 8 passed across desktop/mobile and en/zh-CN, covering the screenshot card, detail navigation, image library L1–L4, placeholder editing and accessibility. Initial generic serve preview lacked Cloudflare's existing .txt rewrite and failed four legacy-route checks; rerun with those exact two rewrites emulated passed all eight. No application routing change was needed.
- Root compiler validate/build passed; 18 infra tests passed.
- Independent read-only review: no critical/important findings. Minor failed-cache cleanup in the research resolver was corrected.

Delivery: local branch codex/queenie-x-attribution. No push, CMS publication, merge or production deployment performed. Existing live site has not been changed by this local work.
