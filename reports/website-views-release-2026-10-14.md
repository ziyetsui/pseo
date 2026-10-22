# Website views release — 2026-10-14

Live: https://beta.ancher.site/zh-CN/prompts/website
PR5: https://github.com/ziyetsui/pseo/pull/5 — merged8ddcbeb (graph views).
PR6: https://github.com/ziyetsui/pseo/pull/6 — merged5fde14fa37006327a166827f1362ca4061288af0 (filter hydration readiness).
Catalog revision: sha256:9da87b45eb6c852c5c56f0565df464e529c6d27f027ed903a222312fe678263a

## Delivered

Website entry is a server-rendered directory with zero case cards.30 independent views:6 purpose,2 model,21 technology and1 all-cases. All60 cases remain reachable, including59 imported projects. Website projection:90 nodes/238 semantic edges. Membership is exact used_for/designed_for/built_with traversal with unique object IDs, preserved original evidence and no fabricated prompts. Related-view links include both imported detail pages and the existing prompt Recipe.

Examples: /website/views/model/claude (28), /website/views/tool/three-js (36), /website/views/use-case/website-fun (19), /website/views/all (60), under /zh-CN/prompts.

Live acceptance initially exposed native form submission before hydration. PR6 disables all4filter controls until initial URL state/handlers are ready. Deterministic desktop/mobile tests held JavaScript and reproduced RED before the fix, then passed GREEN. Case content and view links remain readable without JavaScript.

## Final deployments

- Production/main: cd185d0e-517c-4955-bd5e-7b0fa1501978.
- Beta/frontend-design:36f298f1-c152-4e29-a13a-7c6efb9212e6.
- Both list exact merged source5fde14f. Local source tree clean. Existing CMS/public-api and generated mirror contracts remain independent.

## Verification

159 frontend tests, typecheck, lint0errors/17 static-image warnings. Merged beta743HTML/88,695 internal links. Local10/10 browser tests including gated-script readiness, scope/history, axe/no-JS and375/768/1440 widths. Scripts21 and infra18 plus validate/build passed. Legacy visual82HTML/4,339links and public-api21HTML/266links passed locally; final PR6 CI reran and passed the backend, compiler, visual, beta and public-api engineering chains. Independent reviews approved both graph feature and readiness fix.

Live10 scenarios verified: nine passed in the complete run; one desktop HTTP404 probe failed due a pre-TLS ECONNRESET and passed a focused rerun with supported transport retries. Live runner uses system proxy,180s test budget/30s assertions and DOM-content waits on reload/back; assertions remain unchanged. Readiness tests passed desktop13.2s/mobile6.4s; scoped navigation/history passed on both.

All30live view memberships, all60case reachability, all615detail URLs200/noindex, invalid view404 and all4SSRfilter controls disabled were independently checked at 2026-10-14T08:00:38.559Z. Transport retries3. Full evidence: reports/website-views-live-2026-10-14.json; graph:reports/website-view-graph-2026-10-14.json.

Concurrent chinese-library prototype, fonts and evidence were preserved. No CMS state, rights state, dependency, DNS or Access-policy changes.
