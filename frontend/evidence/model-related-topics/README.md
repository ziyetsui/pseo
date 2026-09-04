# Model Related topics — 2026-09-04

Replaced the three About this model/model family explanation panels in shared Anthology with real thumbnail navigation. ModelRelatedTopics is server-rendered, takes the current model/family Prompt subset, derives Task/Style/Subject relationships, deduplicates immutable IDs and ranks by model relevance. Up to six topics; covers belong to the current model and topic, are real img values, and avoid duplicate covers when possible. No candidate without a preview is fabricated. Counts describe the full target taxonomy across the catalog, not just this model. Task and Style links use their Findings/Plate routes; Subject retains its supplied route. Creator section and footer remain.

Cards use a 16:10 cover, fixed 200px width and horizontal scroll on narrow screens. PromptMedia receives a thumbnail-only projection so no video controls are nested in links. Desktop/mobile screenshots were inspected; no page overflow or stacked large cards. Existing prototype CSS remains historical reference; About markup is removed from production Anthology.

Files: src/components/Anthology.tsx, ModelRelatedTopics.tsx, styles/model-related-topics.css, tests/model-related-topics.test.tsx, tests/e2e/model-related-topics.spec.ts. Rules synchronized in frontend/AGENTS.md and specs/0008-prd.md / 0009-pseo-tech-arch.md. Work split between component/unit subagent and parent integration/browser verification.

Validation: 109 unit tests in 18 files passed (3 new relationship/count/link tests); lint 0 errors / 13 existing img warnings; typecheck passed. Targeted browser tests: 2 passed (10.8s), each covers Nano family, Seedance and GPT family: no About, bounded real images, no video controls, single row, narrow-screen scrolling, every card href HTTP 200 and actual first-card navigation. Final visual build passed; static check passed for 80 HTML pages and 4,729 local links. Root content validate/build and 18 infra tests passed. Whole-site E2E/SEO audit not rerun.

Data revision unchanged: sha256:73d488642d1168a16137b8ec48eb567e032d2393df24c343b26720d99d993948. No taxonomy/content/CMS publication changes, mirror unchanged, no production deployment.
