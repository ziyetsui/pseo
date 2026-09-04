# Model sibling parity — 2026-09-04

Scope: localhost visual-fixture model pages, not CMS content or deployment.

All 11 registered concrete models and both model families already route through Anthology → AnthologyReader (signature) → ModelSignatureHero. This change locks the client reader identity to locale, concrete model/family and slug so navigation resets transient editing/type/reading state. Loaded generation type now persists alongside that model’s session draft, fixing Seedance’s Generate video becoming Generate after reload. No template, media, taxonomy or API changes.

The shared experience includes the Signature media wall and handwritten facts, editable templates and placeholder highlights, list Generate loading/focusing the hero, exact external target https://bo.ancher.ai/home, and the Weight intent gate. Empty registered models retain honest empty content. Guidance synchronized in frontend/AGENTS.md, specs/0008-prd.md and specs/0009-pseo-tech-arch.md.

Browser coverage follows every Models directory destination plus each real version link: GPT Image family, Nano Banana family, Higgsfield Soul, Kling, Seedance, Sora, Veo, Wan, GPT Image, GPT Image 2, Nano Banana, Nano Banana 2, Nano Banana Pro. Both desktop and mobile verify status, one H1/composer, real counts, no breadcrumb or entry popup, model-isolated drafts, full template loading and focus, refreshed draft/type, exact generation href, Weight dialog and Escape. Existing Signature tests cover motion, 320–1440px layout and no-JS navigation. Seedance desktop/mobile screenshots are actual rendered checks, not a pixel-diff claim.

Validation: lint has 0 errors and 13 existing img warnings; typecheck passed; 106 unit tests passed; root content validate/build and all 18 infra tests passed. Final targeted browser run: 8/8 passed across desktop and mobile (54.8s). Final build:visual passed; check:static passed for 80 HTML pages and 4,675 local links. This task does not rerun the whole site’s E2E/SEO audit.

Initial browser test fixture import failed before any test ran because Playwright’s ESM loader required JSON import attributes. The final test instead discovers real directory/version links from the browser. Visual review of the first passing run identified the refreshed generation-type loss, now covered by an explicit assertion.

Fixture revision: sha256:73d488642d1168a16137b8ec48eb567e032d2393df24c343b26720d99d993948 (unchanged).
CMS public: unchanged. Mirror: unchanged. Production deployment: not performed. No external prompt submission.
