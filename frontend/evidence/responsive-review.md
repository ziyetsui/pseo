# Responsive visual review — 2026-09-04

Reviewed the latest selected `specs/images/flow-proto-full.html` prototypes against the local Next.js implementation at three additional widths. These are local, noindex visual-fixture pages, not evidence of a CMS publication or production deployment. This review added screenshots, the capture script, and this report; it did not change application code.

All screenshots use Chromium, a light color scheme, DPR 1, and a 900 px viewport height. Reference pages came from `http://127.0.0.1:8765`, implementation pages from `http://127.0.0.1:3000`. Fonts were loaded before capture. Visible image loading was awaited with an 8-second limit.

| Capture | Reference | Implementation | Visual result |
| --- | --- | --- | --- |
| L1 first screen, 320 px | [Reference](responsive/reference-l1-320.png) | [Implementation](responsive/implementation-l1-320.png) | The two-row navigation, three-line serif heading, paragraph wrapping, and spacing align. Heading bounds match exactly: x 28, y 156.59, 264 × 138 px. Introductory body bounds also match: x 28, y 332.59, 264 × 516.56 px. |
| L2 Deck body, 768 px | [Reference](responsive/reference-l2-deck-768.png) | [Implementation](responsive/implementation-l2-deck-768.png) | The single-column card, image crop, author row, prompt text, controls, and sticky translucent navigation align. Card bounds match exactly: x 28, y 117.69, 688 × 720 px. The image area is 686 × 190 px and text panel is 686 × 528 px in both. |
| L3 first screen, 1024 px | [Reference](responsive/reference-l3-1024.png) | [Implementation](responsive/implementation-l3-1024.png) | Breadcrumbs, single-line serif heading, introduction, two-column contents, and filter placement align. Heading bounds match exactly: x 28, y 207.5, 968 × 64.47 px. Contents bounds match exactly: x 28, y 360.47, 968 × 282 px. |

## Intentional differences and limits

- L2 shows `1 of 23` rather than the prototype's `1 of 24`: the implementation strictly filters image records and excludes the prototype's one unknown-type record. The inspected card geometry is unchanged. The offscreen L2 heading position differs by 3 px after the script scrolls each page to its Deck section; this capture verifies the aligned Deck section, not full-page vertical equivalence.
- L3 contents follow the same prose-then-JSON order as the actual prompt bodies. This corrects the prototype's mismatched directory order, so individual contents entries differ while the fourteen-entry directory layout remains aligned.
- Root's WCAG AA fixes make secondary text and counters more legible. The latest changes darken L3 `.ok` green and `.varmark` amber and restore counter opacity to 1. Counter/text contrast is visible in this first-screen comparison; the below-fold green/amber prompt controls are outside this capture and were not independently contrast-tested by this screenshot task. The changes are recorded as accessibility corrections, not claimed as original prototype colors.
- L1/L2 now load the same InterVariable font locally with its OFL license. Computed font family, size, line height, and the measured text wrapping match the reference in these captures.
- This is a visual review of the specified viewport states. It does not independently establish complete pixel identity across every scroll position or replace the interaction, accessibility, and public-build checks recorded separately.

## Capture results

- Six of six pages returned HTTP 200.
- No page errors or horizontal document overflow were observed at any of the three widths.
- All four visible image occurrences (Deck main image and avatar on both pages) finished loading successfully. The captured L1/L3 first screens contain no images.
- The Chromium process was closed after capture, leaving the browser available for the parent's serial Lighthouse run.

Reproduction: `node scripts/capture-responsive-review.mjs` while the two local servers are running. Measurement data and image-loading results are in [capture.json](responsive/capture.json). Earlier 375/1440 px section comparisons are in [visual-review.md](visual-review.md).
