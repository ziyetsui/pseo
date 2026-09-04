# Browse by task → Findings implementation

Date: 2026-09-04. User selected Findings from `docs/wireframes/proto-l3-task.html?v=4`. SHA-256: `257f35cb61ad7a421219fccc289d2b13f476e5c182ff6907e6feb8b72c747dd8`. Selected function `variants[3]/vfd`, default `linear-dark`. Previous Matrix/Plate/Manifesto/Folio explorations are not selected production directions. This change implements Findings directly; no picker or iframe enters the app.

## Scope and routing

Only L1 Browse by task cards and lateral task links open `/{locale}/prompts/use-cases/{slug}`. Beauty opens its13 actual fixture records; Food & beverage8; Automotive1. Generic useCase refs continue to be L1 filters, and model/style/category routes retain their prior layouts. The URL follows backend `_term_href`; no invented `/tasks` API or new backend endpoint. Public taxonomy projection remains `/api/v1/categories/use-case/{slug}`. Findings consumes complete same-revision catalog records already validated by the existing public adapter; no browser CMS access or extra projection fetch was added. Task metadata uses its actual label and available entity SEO; without approved SEO it remains noindex.

New files: `TaskFindings.tsx`, `TaskFindingsReader.tsx`, `lib/catalog/task-findings.ts`, `styles/task-findings.css`, route/data/browser tests. Route helper/static params, HubBand task href, main route renderer and global CSS import changed. `frontend/AGENTS.md`, PRD and Tech Arch record the bounded selection. No content/**, CMS, backend, rights approval or deployment mutation.

## Visual review

Compared reference and implementation at1440 and375px using Chromium, DPR1, dark theme, same local fixture. Reference measurements/screenshots are alongside this report. H1: serif400, clamp40–96px, line1; opening92/42px desktop and56/30px mobile; page1024px, prose410px, specimen648px, media16:10. Maintained Task/Within control bar, numbered specimens, original text excerpt, remainder paragraph and task/model/style/creator/footer sequence. Full original prompt is server-rendered, CSS-clamped in the specimen; Read it and typed Generate actions reach complete L4. Reused local Inter Variable and system serif. Media are original references, may load remotely or show existing failure fallback.

Two visual review fixes: header frame remains1436px rather than inheriting1024px page frame; specimen notes retain sentence case. Source chips retain34px visual height with44px hit areas; scroll containers add6px per row so hit areas/focus outlines are not clipped (control bar is12px taller than prototype). Main CTA actual controls are44px tall. Existing AA text tokens are retained; copy is brighter than the source's faint presentation. No unsupported percentage-similarity claim.

## Intentional source corrections

- Replace dummy data-task/hash navigation with real locale task routes and `aria-current=page`.
- Filters use repeatable URL parameters, same-axis OR/cross-axis AND, reload/back, empty/reset; server supplies a task-restricted set so queries cannot escape it. Lateral task navigation resets filters.
- JSON shape detection is not validation: label it Structured text; do not promise valid JSON or lens/wardrobe fields from a regular expression.
- A camera tag cannot prove ordering of prompt instructions: heading/body state only the recorded technique.
- Author presence cannot prove copyright, authorship of every prompt, or permission: report recorded author attribution; remove the source's blanket “Free to copy” CTA claim in this new page.
- Singular headings and zero-result findings are handled explicitly. Specimens can repeat if a small task has several supported findings but no unused example, as in the reference. The remainder excludes already illustrated IDs; every matching prompt retains a real L4 link.
- Source attribution is clickable to actual source.url. No fabricated likes: absent values are omitted. No Copy prompt actions.

## Actual verification

- `pnpm lint`: pass,10 expected static img warnings (9 existing,1 new creator avatar); no errors.
- `pnpm typecheck`: pass.
- `pnpm test`:28 passed across5 files.
- `pnpm build:visual`, then `pnpm check:static`: final CSS included; pass,63 HTML pages and3663 local links. Visual revision `sha256:268ea6de403be07d656c4c566213bd6bf6a0585cefd84d35bea8785bbcd080a4`.
- Full `pnpm test:e2e`:37 passed,1 intentional touch-device pointer-motion skip.
- Final targeted task suite with extra320/360/768/1024 checks:7 passed,1 duplicate mobile viewport-loop skip. Desktop/mobile task navigation, filter URL/history, actual Generate→L4, singleton/empty/404, model boundary, no-JS initial content and links passed. Zero page JS errors, document overflow or Axe violations for Findings at desktop/mobile; reduced-motion interaction checked.
- Root compiler validate/build: pass; infra tests18 passed. Compiler revision `sha256:133521b6a07f71ad2455e1e4bd25634cabf3f79c5643a2e81ce87c4c90952a01`.
- Lighthouse not run this round: no installed executable/library found in the checked local paths; no Lighthouse score claimed. No new public-api build or production smoke performed this round.

CMS public: unchanged. Mirror: unchanged. Production deployment: not performed. Port3000 is the explicit local visual-fixture preview, noindex, not a production release.
