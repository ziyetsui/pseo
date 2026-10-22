# Git beta release — 2026-10-14

PR: https://github.com/ziyetsui/pseo/pull/4 (merged)
Merged source: `7e08aaea86be7dcc042782ea49e2cd510c9e5a60`
Catalog revision: `sha256:9028b46fb5a264d2944b524df63c31cb18e993398358d4c84bca1e7be0dcf129`
Live: https://beta.ancher.site/zh-CN/prompts#category

## Deployments

- Production/main: `80ed79ff-3936-443b-beee-0490dd6b7ec9`
- Beta/frontend-design alias: `8542e89d-baca-458f-9a66-7312aadeb93c`
- Both Cloudflare deployments verified against merged source `7e08aae`; beta build receipt confirms exact Git-beta catalog revision.

## Delivered

- 600 source records normalized under existing graph rules: 2,785 nodes / 6,578 edges.
- 541 image source cases preserve all 541 examples across 521 distinct new prompts; image collection now 543 prompts.
- 59 new Website projects with verified local previews; collection now 60 entries. 58 honest case-only pages and one recovered real prompt.
- All 13 image categories, graph-backed classification routes, source attribution and MIT license notice.
- Technical and quantified acceptance specs in `docs/superpowers/specs/2026-10-14-git-beta-publication-{design,acceptance}.md`.

## Validation

- Frontend: 153 tests, typecheck and lint (0 errors); scripts: 21 tests. Backend: 73 tests plus lint/mypy. Infrastructure: 18 tests plus validate/build.
- Merged static beta export: 713 HTML pages, 85,786 internal links. Legacy visual/public-api exports remain verified.
- Local browser: 6/6 tests passed (desktop/mobile, filters/history/focus, accessibility, no-JS, 375/768/1440 widths).
- Live browser: five original tests passed with the system proxy and a 120-second network budget. Mobile no-JS test initially timed out waiting for all image load events; rerun with explicit context proxy and `domcontentloaded` completed in 10.7 seconds. Content, all 60 cases and accessibility assertions unchanged. Six browser scenarios verified overall.
- Live HTTP: all 615 detail routes returned 200 and noindex; collection count60; unknown case404; license200. Receipt checked at 2026-10-14T06:46:21.248Z. Full results: `reports/git-beta-live-2026-10-14.json`.

The user explicitly authorized this batch to bypass CMS and publish to beta via Git. CMS/public-api publication remains independent. Unrelated in-progress chinese-library prototype files were preserved and excluded from release.
