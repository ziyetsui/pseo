# Merged and deployed — 2026-10-16

PR [#50](https://github.com/ziyetsui/pseo/pull/50) merged into codex/cms-preview-integration at 8570bbcb1cba83d8bc56a82d8e163fd79bb1c21b. Reapplied only the attribution change to the latest integration tree, preserving the merged browse rail/task layouts. Documentation conflicts were resolved without bringing the unmerged ocean-current feature into this release. The merged tree is byte-identical to the locally tested release candidate.

All four GitHub CI jobs passed. Integration validation: 259 frontend tests (the separate unmerged ocean-current test is outside this release), typecheck, lint with 19 existing warnings, beta build, 4,485 HTML pages / 232,216 local links, all 1,628 attribution detail checks, and 8 local browser tests passed.

Existing Cloudflare Pages project pseo-internal-beta-preview, account 9e27095eb80b9e4ffd09d8b590759311. Production deployment beaac11a-1619-4cd1-91e5-59e0239e546f and existing frontend-design alias deployment 1e835c73-9593-41a2-a067-55a53d9671e2 both bind the exact merged source with commit_dirty=false. No DNS/Access/configuration changes.

The first smoke run occurred during propagation and saw the previous catalog. Once both deployments completed, https://beta.ancher.site/frontend-build.json matched the verified artifact revision. A fresh live smoke run passed all 8 tests in 46.7s across both locales and desktop/mobile, including original X source links, screenshot-card detail navigation, L1–L4 image library flow, placeholders and accessibility. Response retains X-Robots-Tag: noindex, nofollow.

All 814 intermediary attributions now project original X handles/post links. Screenshot source: https://x.com/MyWestLord/status/2063321372789465409. Raw captures and CMS/rights status are unchanged. This is an authorized Git-beta deployment, not a CMS public release. See deployment-receipt.json for precise deployment records.
