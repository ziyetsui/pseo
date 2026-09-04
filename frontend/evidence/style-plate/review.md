# Browse by style → L3 Plate

2026-09-04. User selected the Plate direction from `docs/wireframes/proto-l1-editorial.html?v=3`, `variants[2]/vpl`. Reference SHA-256: `9dd72a802aa8750d6656b7ac90e3e4f318183e998870c138d0273aece6b94c4a`.

## Scope

Browse by style cards now use `/{locale}/prompts/styles/{styleSlug}`, the existing backend `_term_href` path. `styleHref`, `styleForPath`, static params and metadata resolve only real styles. Ordinary style query refs remain unchanged; Task Findings and model Anthology keep their existing route/rendering behavior. No new endpoint or public adapter was added: the page reads the existing complete, validated same-revision catalog and fixes its subset by actual style id/slug before client enhancement. No CMS/content/mirror edits.

Added StylePlate (server shell), StylePlateReader (search, facets, plates), scoped style-plate.css, route and browser tests. Updated the route renderer, site/routes, query helper, Browse by style card href and CSS import. Documented the route and exclusive visual contract in frontend/AGENTS.md and PRD/Tech Arch. The existing task route test was narrowed to accept the newly selected style card route while retaining its generic-filter checks.

## Reference adaptation

Preserved Plate's serif 34–58px title, 88/44px titlepage spacing, three-column numbered list (two at1000px, one at620px), 268px marginal caption, 78px bands, alternating recto/verso, up to three actual media assets, uncropped contain rendering and 860px mobile stack with48px bands below620px. Added the actual style name above the original “One prompt, one plate.” title; search is explicitly within this style. Source chrome and complete browse/footer remain available.

Photorealistic renders27 actual fixture records; Cinematic14. Numbering and TOC are generated from the same ordered result list, with immutable-id anchors. Prompt bodies retain their exact text in initial HTML, clamped visually to reference excerpt lengths; real Full record/Generate links open L4. No Copy prompt, fake href, iframe or picker. Blank/no-media records use a text plate; source failure uses the existing media fallback. Actual video assets retain native playback controls. The media count is the actual catalog media count; unavailable source frame-duration fields are not invented.

Accessibility corrections: controls and source/index links have44px hit targets; control scrollers include padding for focus rings. The caption offset accounts for both sticky header and search bar. Original source image containment relied on percentage dimensions in a flex mount; absolute media sizing inside a definite aspect-ratio mount preserves the uncropped work and prevents tall intrinsic media from expanding the band. Native text preserves whitespace instead of the prototype's collapsed excerpt. Existing dark AA tokens and local Inter/system serif are reused.

Screenshots reviewed at1440×900 and375×900; reference screenshots at1440×1000 and375×1000, Chromium/DPR1/dark. Viewport widths320,360,768,1024 also checked. Reference and app datasets differ intentionally: reference is the entire library, app fixes the chosen style. No pixel-similarity percentage is claimed. Images load from the original reference URLs; failure handling was exercised deliberately.

## Validation

- lint: pass,10 pre-existing static img warnings,0 errors.
- typecheck: pass, including new browser tests.
- unit tests:31/31 across6 files.
- build:visual: pass,71 generation entries; check:static:69 HTML pages and4263 local links pass.
- visual revision: `sha256:268ea6de403be07d656c4c566213bd6bf6a0585cefd84d35bea8785bbcd080a4`.
- Style browser suite:7 pass,1 redundant mobile viewport-loop skip. Actual card→Plate→L4, TOC, filters/reload/back, unknown style404, style boundary, non-Style pages, mobile/narrow/tablet layouts, keyboard/reduced motion, no-JS text/links and image failure passed. No page errors, horizontal overflow or Axe violations detected on tested Style surfaces.
- Initial full browser run:43 pass,2 Magnetic journey click timeouts,3 intentional skips. Targeted reproduction suggested a test scrolling race: anchored peeks close on scroll, and the test could open one before scroll events settled. Updated only the test setup to scroll instantly and wait two animation frames; all original click/navigation assertions remain. The four targeted image/video journeys then passed. No Magnetic product code was changed.
- Final full browser run:44 pass,1 failure,3 intentional skips. The remaining desktop video journey timed out waiting for the L1 peek's Generate video link after keyboard opening. All Style tests passed again. The test setup change does not fully resolve the intermittent Magnetic failure; its root cause remains unconfirmed. The full browser gate is therefore not passing.
- Root compiler validate/build pass; infra tests18/18 pass. Compiler revision `sha256:133521b6a07f71ad2455e1e4bd25634cabf3f79c5643a2e81ce87c4c90952a01`.
- Lighthouse was not run; no score claimed. No public-api build or production smoke performed in this round.

CMS public: unchanged. Mirror: unchanged. Production deployment: not performed. Port3000 remains the explicit noindex local visual fixture preview, not a production release.
