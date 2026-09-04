# Footer populated destinations — 2026-09-04

Shared SiteFooter now filters model families, tasks, styles and subjects by actual catalog Prompt relationships, ignoring stale Ref.count. Model-family counts use the deduplicated member union. Image/video Browse entries require that real kind; All prompts/models/creators require actual corresponding content. Empty columns are hidden. Text-only prompts remain legitimate content even without previews. All footer callers were checked: each receives the complete locale catalog, not reader filter/pagination subsets.

Removed from the current visual-fixture footer: Kling, Veo, Sora, Wan, Anime / illustrated, Surreal / fantasy. Routes and taxonomy registry remain intact. The other 27 links remain and are listed in desktop-links.json / mobile-links.json.

Scope: components/Chrome.tsx SiteFooter, tests/footer-nonempty.test.tsx, e2e/footer-nonempty.spec.ts, one explanatory comment in lib/catalog/fixture.ts; guidance synchronized in frontend/AGENTS.md and specs/0008-prd.md / 0009-pseo-tech-arch.md. Subagent implemented/filter-tested the footer; parent checked callers, real browser targets and screenshots. No changes to SiteHeader or SignInGate. The screenshot’s old JSX syntax error was not present in current source; current typecheck, runtime pages and build pass.

Validation: 123 unit tests in 20 files passed; lint 0 errors / 13 existing img warnings; typecheck passed. Targeted browser tests: 2 passed (8.7s), desktop/mobile, checking consistent footer hrefs on Beauty, L1, L2, Nano family, Style and L4. Each of 27 destinations returned HTTP 200 and contained real prompt rows or nonempty directory entries. Mobile footer screenshot inspected. Final visual build/static validation: 80 HTML pages, 4,279 local links passed. Root content validate/build and 18 infra tests passed. Whole-site E2E/SEO audit not rerun.

Data revision unchanged: sha256:73d488642d1168a16137b8ec48eb567e032d2393df24c343b26720d99d993948. CMS public and mirror unchanged; production deployment not performed.
