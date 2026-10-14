# Website hierarchy implementation plan

> Execute inline using superpowers:executing-plans; continuous release already authorized.

Goal: align Website L2/L3/L4 and generate truthful Footer IA/index from the graph.
Spec: docs/superpowers/specs/2026-10-14-website-prototype-ia-{design,acceptance}.md.

1. RED tests rendering current Website shells,4Recipe steps, Footer30view URLs and index route. Add shared WebsiteDeck and typed slide model; align root/all-cases with existing Deck CSS and reachable no-JS title index.
2. Refactor existing ModelSignatureHero into shared CollectionSignatureHero with backward-compatible Prompt wrapper. Add Findings/Anthology Website results and scoped reader presentation, reuse existing styles/controls. Align WebsiteCaseDetail4steps using genuine prompt/project data. Verify graph membership unchanged.
3. Extract shared site/navigation.ts, use it in Footer and new LibraryIndex server component; add route/metadata, safe serialized index payload and deterministic library-index.json export. Static verifier binds revision/routes/Footer graph links and navigation receipt.
4. Full tests/build/static and legacy/root checks. Browser across all hierarchy types, widths, keyboard, no-JS, delayed scripts, filters/history, Footer/index. Fresh independent review, PR/CI/merge, exact merged-source beta deployment and live receipts.

Review focus: no case-to-prompt fabrication; graph scope and unique IDs through new layouts; SSR parity; baseline Recipe; global model hero regression; Footer/index completeness vs SEO noindex; inert/no-JS access; loading-safe filters.
Ledger: baseline5fde14f;159 frontend tests passing. Station index assumed, optional SEO clarification pending.
