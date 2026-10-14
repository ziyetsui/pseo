# Website hierarchy implementation plan

> Execute inline using superpowers:executing-plans; continuous release already authorized.

Goal: align Website L2/L3/L4 and generate truthful Footer IA/index from the graph.
Spec: docs/superpowers/specs/2026-10-14-website-prototype-ia-{design,acceptance}.md.

1. RED tests rendering current Website shells,4Recipe steps, Footer30view URLs and index route. Add shared WebsiteDeck and typed slide model; align root/all-cases with existing Deck CSS and reachable no-JS title index.
2. Refactor existing ModelSignatureHero into shared CollectionSignatureHero with backward-compatible Prompt wrapper. Add Findings/Anthology Website results and scoped reader presentation, reuse existing styles/controls. Align WebsiteCaseDetail4steps using genuine prompt/project data. Verify graph membership unchanged.
3. Extract shared site/navigation.ts, use it in Footer and new LibraryIndex server component; add route/metadata, safe serialized index payload and deterministic library-index.json export. Static verifier binds revision/routes/Footer graph links and navigation receipt.
4. Full tests/build/static and legacy/root checks. Browser across all hierarchy types, widths, keyboard, no-JS, delayed scripts, filters/history, Footer/index. Fresh independent review, PR/CI/merge, exact merged-source beta deployment and live receipts.

Review focus: no case-to-prompt fabrication; graph scope and unique IDs through new layouts; SSR parity; baseline Recipe; global model hero regression; Footer/index completeness vs SEO noindex; inert/no-JS access; loading-safe filters.
Ledger: baseline5fde14f;159 frontend tests passing. User clarified SEO scope and selected ancher.ai.

Ruling: use /zh-CN/prompts/library-index rather than /prompts/index; index.html has directory-index semantics in static hosting and collides with the hub. User selected formal SEO origin https://ancher.ai; beta remains noindex. Existing ancher.ai marketing site is served by Google Frontend; PSEO prefix404. Owner says formal source is under stremifyone and connection can wait. Complete beta now; preserve current formal homepage and record SEO integration policy/handoff.

Validation ledger (2026-10-14):167 frontend unit tests pass; typecheck pass; lint0errors/18 existing/static-image warnings. Beta export744HTML/114951local links; Libraryindex719unique routes bound to revision and SHA256, all30Website views and615unique detail URLs covered. Hierarchy browser16/16passed, followed by6/6focused rerun including last Deck boundary and computed reduced-motion state. Legacy visual export82HTML/4443links; Image/Video/model/task/Website/Footer browser31passed/1intentionally skipped/2load timeouts on first sweep; all6tests in the two affected specs passed with120s allowance (no assertion changes). Engineering scripts/infra39tests pass; intake59websites/541images/2785nodes/6578edges valid. Independent reviewer found no remaining Critical/Important issues after scoped link selector and coverage fixes. Formalancher.ai hosting remains deferred; see SEO handoff.
Public-api compatibility: repository-backed API/integration/export chain passed;21HTML/278links and3verified feeds. This remains engineering-fixture evidence, not a CMS or formal-host publication.
