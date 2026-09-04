# Selected prototype visual review

Date: 2026-09-04. Scope: the lower portions of L1 Quotations, L2 Deck, and L3 Anthology. The parent task separately reviews all five first screens and L4 Recipe. These are local, noindex visual-fixture comparisons; they do not establish CMS approval, snapshot publication, mirror synchronization, or production deployment.

Post-review note: the user removed the L1 Hero signature (`35 prompts · every one credited · every one links to its source`) in a browser comment on 2026-09-04. Earlier screenshots retain it as historical comparison evidence; the current implementation no longer renders it.

The user subsequently selected Linear dark mode as the site default on the same date. Current pages use the reference's dark tokens even when the operating system prefers light mode. The light screenshots below remain the original layout-comparison evidence, not the current default appearance.

## Method and evidence

The reference is the selected page from `specs/images/flow-proto-full.html`, decoded without evaluation and served from `http://127.0.0.1:8765`. The React implementation was served from port 3000. `scripts/capture-sections.mjs` captures corresponding anchors in light mode at 1440 × 900 and 375 × 900, with device scale 1. It waits for viewport images, including the active Deck card, for at most eight seconds. Images were loaded from their original public source URLs; no substitute image or permanent cache was introduced.

There are **28 screenshots: seven sections × two viewports × two implementations**. The machine-readable measurements are in [sections/capture.json](sections/capture.json). Across this set, all **54 inspected image occurrences loaded successfully**; none of the screenshots had horizontal document overflow. This is a count of image occurrences across screenshots, not 54 unique assets. Remote availability can change after this capture.

| Area | Reference | Implementation | Review |
| --- | --- | --- | --- |
| L1 reading column | [1440](sections/reference-l1-results-1440.png) · [375](sections/reference-l1-results-375.png) | [1440](sections/implementation-l1-results-1440.png) · [375](sections/implementation-l1-results-375.png) | Matching quotation width, serif/JSON treatment, thumbnail scale, metadata, disclosure placement, line wrapping, and separators. |
| L1 category/browse bands | [1440](sections/reference-l1-browse-1440.png) · [375](sections/reference-l1-browse-375.png) | [1440](sections/implementation-l1-browse-1440.png) · [375](sections/implementation-l1-browse-375.png) | Matching category crops, two-column/stacked geometry, band spacing, and representative images. |
| L1 footer | [1440](sections/reference-l1-footer-1440.png) · [375](sections/reference-l1-footer-375.png) | [1440](sections/implementation-l1-footer-1440.png) · [375](sections/implementation-l1-footer-375.png) | Five columns and all 36 reference links retained in the visual fixture. |
| L2 active Deck | [1440](sections/reference-l2-deck-1440.png) · [375](sections/reference-l2-deck-375.png) | [1440](sections/implementation-l2-deck-1440.png) · [375](sections/implementation-l2-deck-375.png) | Matching 520px desktop / 720px mobile card, image crop, readable internal prompt, layers, controls, and compact metrics. The real image classification has 23 records versus the prototype's 24. |
| L2 footer | [1440](sections/reference-l2-footer-1440.png) · [375](sections/reference-l2-footer-375.png) | [1440](sections/implementation-l2-footer-1440.png) · [375](sections/implementation-l2-footer-375.png) | Five columns, eight model entries, and all 33 reference links retained. |
| L3 full-text entry | [1440](sections/reference-l3-body-1440.png) · [375](sections/reference-l3-body-375.png) | [1440](sections/implementation-l3-body-1440.png) · [375](sections/implementation-l3-body-375.png) | Matching reading column, numbered entry, right-floating desktop image, stacked mobile image, untruncated text, variable treatment, and actions. |
| L3 scratchpad/creators | [1440](sections/reference-l3-scratchpad-1440.png) · [375](sections/reference-l3-scratchpad-375.png) | [1440](sections/implementation-l3-scratchpad-1440.png) · [375](sections/implementation-l3-scratchpad-375.png) | Matching composer dimensions, wrapped mobile actions, creator order and grid. Unavailable actions are visibly disabled. |

## Corrections made after looking at the rendered pages

- Scoped `overflow-x: hidden` had turned L1/L2 into scroll containers and broken viewport sticky navigation. `overflow-x: clip` restores the reference scrolling behavior without adding horizontal overflow.
- The bundled stylesheet pipeline dropped the reference's adjacent standard/legacy-prefixed `backdrop-filter` declarations. A separate standard declaration restores the measured `blur(20px)`; this was checked in the browser, not inferred from the CSS file.
- L1 video duration now uses the actual supplied media label. Excerpt wrapping follows the original whitespace-condensation rule; Copy continues to use the untouched full source string.
- Browse image assignment now gives categories with fewer image candidates first choice, matching the reference's distinct-thumbnail allocation.
- L2 metrics use the original compact formatting, such as `3.8K` and `2.4K`. L2 uses the reference `ph` placeholder class and L3 uses `varmark`; the initial unstyled yellow browser highlight was removed.
- L3 restores the exact `Copy prompt` label. Its textarea had introduced an extra 6.25px anonymous baseline row in the React rendering; a block textarea restores the reference spacing.
- The footer owner restored per-level source order, exact static labels, and all reference link slots. Unregistered visual-fixture labels point to real search URLs rather than fabricated taxonomy detail pages.

## Explicit differences retained for correct behavior

These are documented differences, not a claim of zero pixel differences:

- Images uses the backend's strict image classification: **23 image prompts**. The source Deck's `kind !== "video"` accidentally included one unknown-type record. Its removal also changes the corresponding tag counts and the availability of the Automotive image filter.
- Videos retains the same Deck design but corrects the source's leftover Image labels, search placeholder, breadcrumb, counts, and accessible name.
- L3's index and body use the same grouped ordering; the prototype numbered the index in one order and the body in another. Counts, shortest/longest text, and creator totals are computed from the supplied records.
- Public source names and body languages are explicit. Prompt titles use their record locale and prompt bodies use their source language; the fixed English interface copy remains English.
- The parent task raised low-contrast caption/filter text for accessibility, so those tones are darker than the raw L3 reference. Disabled Copy/Generate actions also intentionally differ from the prototype's always-active mock controls.
- No valid global `Generate in bo` URL is supplied. The original label is retained with an unavailable state. Scratchpad generation remains unavailable unless an actual matching `actions.tryUrl` is present. Clipboard success is only reported after a successful write.
- For a public catalog with no image or no matching taxonomy/creator, the page shows a truthful empty state and retains navigable section targets. It does not remove header destinations or substitute fixture media. This public-data empty state is not shown in the populated visual-fixture screenshots.

## Interaction verification

`tests/e2e/journey.spec.ts` passed **10/10 checks** in Chromium across desktop and mobile: both image and video L1 → L2 → L3 → L4 journeys; Deck keyboard movement, inactive-card inertness, boundaries and empty-state recovery; same-axis OR/cross-axis AND URL filters with Back and reload; consistent Anthology numbering; and scratchpad persistence across filtering, Back and reload.

The page shells and initial full prompt text render in the server output. This review does not claim that remote source links, bo generation, CMS release, or a production deployment were exercised.
