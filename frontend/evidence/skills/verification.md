# PSEO Skills verification — 2026-09-16

## Source and scope

Reference: `pseo-agents/specs/images/proto-skills-pseo-linear-dark.html`, SHA-256 `49bf0ebd58556cddde6bf68cb51943710efe97fc542b8aabd5b4e7c113a76f50`.

The main column, dark palette, grouped rows and wording follow this reference. Owner-requested differences: reuse the library header, omit the prototype masthead, provide a real complete install command and agent instructions. Details are a derived reading layout. No claim of pixel-perfect similarity. Desktop 1440×900 and mobile 375×900 screenshots are recorded here, with the local Inter font, Chromium, dark default and DPR 1. Responsive/overflow checks include 320, 375, 768, 1024 and 1440px. Skills UI stays English; original skill bodies stay Chinese.

The 25-entry allowlist includes 21 general workflow skills and four clearly marked PromptLab adapters. ZIP includes all 37 required files; original sources and every bundled relative Markdown reference are preserved. Design-craft dependencies have an explicit self-contained fallback.

## Checks performed

- Frontend lint: 0 errors; 13 existing image-element warnings.
- TypeScript: passed.
- Unit tests: 143 passed (23 files), including clipboard hydration readiness, success/rejection and safe Markdown rendering tests.
- Static build: 132 HTML routes and 5,036 valid local links, including both Skills locale routes and all details.
- Static artifact Skills + accessibility E2E: 26 passed, including clipboard exact values, mobile widths, keyboard, no-JS, all detail paths, 404s, and axe serious/critical checks.
- Generator: 2 tests passed; deterministic archive and stale asset check passed.
- Actual local HTTP archive install with `skills@1.5.26`: 25 skills installed in a new temporary project, all 37 files match manifest SHA-256. The installed wireframe CLI generated 10 files from the bundled outdoor example.
- Root compiler validate/build passed; 18 infra tests passed. The compiler fixture is not the deployed Beta data.

A first full E2E run against Next development server passed 82 tests, skipped three touch-inapplicable cases, and observed one transient HTTP 500 on the disabled `/en/prompts` route. The same route returns the expected 404 in the static export; the complete static Skills/accessibility rerun passed all 26 checks. A full-suite static rerun is recorded in the delivery receipt.

Full static E2E rerun: 83 passed, three intentionally skipped on touch devices. Initial live smoke identified a clipboard hydration race on mobile; copy buttons now remain disabled until their client event handlers are attached. A dedicated SSR-to-hydration unit test verifies this behavior.

## Content and release boundary

Existing Beta content revision is retained exactly: `sha256:73d488642d1168a16137b8ec48eb567e032d2393df24c343b26720d99d993948`. The build remains `visual-fixture`, noindex/nofollow, `productionRelease=false`. CMS approval, content mirror and production released status are unchanged.

Public archive: `/skills/pseo-skills-580cbb1da78f1812.zip`; SHA-256 `580cbb1da78f1812fd24ec05c9548e6d9ee874be4ccade4df8d00905b3f0f978`. Node.js22.20.0+, npm, network access, and a compatible Coding Agent are required. Installation is not a grant of publishing rights. Public URL install and deployment smoke are checked after upload; local checks alone do not prove deployment.

Lighthouse performance/SEO scoring was not run in this change; no score is claimed. The intended noindex Beta state is preserved.
