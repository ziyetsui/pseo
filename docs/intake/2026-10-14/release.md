# Website / image intake release receipt — 2026-10-14

## Engineering release

- Engineering PR: https://github.com/ziyetsui/pseo/pull/2 — merged 2026-10-14T05:00:01Z.
- Deployed application source: `0b78c664872775d7ac0232e3d5760cdce01e2d1b`.
- Existing Cloudflare account/project: `9e27095eb80b9e4ffd09d8b590759311` / `pseo-internal-beta-preview`.
- Pages production slot (`main`): deployment `6e8c752b-d67b-492c-b9bf-31e133dd4fbe`.
- Existing beta alias (`frontend-design`): deployment `f81c5386-290f-4359-a871-5c62292c6e2d`; https://f81c5386.pseo-internal-beta-preview.pages.dev.
- Actual user URL: https://beta.ancher.site/zh-CN/prompts/website — HTTP 200, Website Findings heading and real source/detail links verified. Hub has all three category tiles. Both deployment slots use the same merged artifact; no DNS or Access configuration was changed.
- Beta reports `mode=visual-fixture`, revision `sha256:73d488642d1168a16137b8ec48eb567e032d2393df24c343b26720d99d993948`, `productionRelease=false`; all checked routes retain noindex/nofollow. Cloudflare's production slot is not evidence of CMS content release.

## Measured acceptance results

| Gate | Actual result |
|---|---|
| DATA-01/02 | 59/59 reviewed website projects + 541/541 gallery records processed; 13/13 category mappings; unreviewed search-result imports 0 |
| GRAPH-01/02 | 2,785 unique nodes; 6,578 unique edges; dangling endpoints 0; every artifact has source evidence; status markers are case-only |
| PROPOSAL-01 | 522 unique proposals pass the actual CMS normalizer: 521 image prompts + 1 exact-source recovered website prompt; contract rejects 0 |
| Missing/duplicate evidence | 58 website projects without actual prompt remain cases; 20 duplicate records reconciled; 35 distinct-prompt/same-post conflicts flagged; 179 records lack an identified original X post; 30 lack a confirmed X creator handle |
| Media | All 541 pinned image files exist upstream; original media URLs retained; third-party binary media has not been copied into public assets |
| RIGHTS-01 | New CMS public/cleared/community_attributed decisions made by Agent: 0 |
| IDEM-01 | Two complete runs produced byte-identical graph/proposals/reviews/manifest; upstream pinned bytes match SHA-256; all four input checksums retained |
| UI-01/02 | Images/Videos/Website links resolve; Website count is 1 from the current deployed catalog, independently of media kind; intake counts are not shown as published counts |
| UI-03 | 375/768/1440 widths pass overflow checks; local navigation/a11y/no-JS browser suite 11 passed, 1 existing mobile skip; live Website suite 4/4 passed |
| QA-01 | Frontend 143 tests, lint 0 errors (13 existing image warnings), typecheck, build/static passed; visual export 81 HTML pages / 4,338 local links; public-api engineering export 20 HTML pages / 265 links passed |
| Backend/infrastructure | Backend lint/typecheck + 73 tests passed (1 existing deprecation warning); infra validate/build + 18 tests; scripts 21 tests passed |
| RELEASE-01 | PR #2 merged, all CI checks passed, both Pages deployment receipts bind the merged source, actual beta HTTP + live browser smoke passed |
| RELEASE-02 | CMS accepted=0, new CMS public=0, new content mirror synced=false, new content released=false; engineering/beta UI deployment=true |

Independent review found two important extraction defects (status markers treated as prompt text; non-X labels treated as X handles). Both were fixed and independently rechecked with no remaining material findings. CI also exposed the missing backend publication-artifact preparation and Website navigation surface classification; both now have green checks/regression coverage.

## Outstanding content publication dependencies

The requested **new content appearing on the website is not complete**. The deployed create-prompt API allows prompt/locale/source only, does not apply taxonomy/media graph relations, and cannot create the 58 case-only objects. This environment has no configured CMS proposal API identity. The complete source-backed intake and 522 validated draft requests are committed; no direct DB write or generated mirror authoring was used.

Next required steps are authenticated draft submission; reviewed CMS contracts for graph/media proposals and Website Case objects; revision-bound human editorial/rights review; immutable public snapshot; mirror sync; same-snapshot frontend build/deployment and smoke. The user's authorization to implement/merge/deploy does not supply missing credentials or missing source rights evidence. The existing publishing boundaries remain enforced.

This receipt records deployment of the application source above. Subsequent documentation-only commits do not change the deployed application artifact.
