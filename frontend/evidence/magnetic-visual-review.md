# L1 Magnetic review — 2026-09-04

Reference: `magnetic-reference.json` (source hash, variant and user overrides). CSS is parsed and scoped from the reference's main style and Linear-dark theme; no reference JavaScript is executed for extraction. The production motion controller ports only Magnetic and Peek equations.

## Comparison

`node scripts/capture-magnetic.mjs` captures the source and implementation in Chromium at 1440×900 and 375×900, DPR 1, Linear dark, same scroll position, loaded fonts. Source picker/theme controls and signature are hidden to apply the explicit user overrides. Screenshots and title geometry are in `magnetic/`.

- All 35 title strings, sequence and bounding boxes (x/y/width/height) match exactly at both captured widths. This is measured geometry, not a claim of a global pixel-similarity percentage.
- Visually inspected desktop title field, desktop peek, mobile peek. Typography, spacing, wrapping, lines and theme match the selected design. Full opacity is captured after the 250ms entrance completes.
- Deliberate differences: removed hero signature/copy buttons; typed Generate link to each real L4; no prototype harness; brighter chip counts for AA; real source links; keyboard focus freezes a peek; closing makes it inert immediately; no-JS fallback provides real prompt links. These preserve prior explicit user decisions and accessibility.
- The source note still says the paragraph splits, while the selected v2 renders a fixed peek without reflow. Kept the exact approved copy and recorded the inconsistency rather than silently rewriting it.
- Remote media may still load after the screenshot; mobile capture shows a pending source thumbnail. Media failure has an explicit fallback. No replacement media was invented.

## Motion

Title radius 220; quadratic proximity; 13px attraction + 5px lift; spring .055/.86. Peek spring .05/.82; scale .94→1 (.12 lerp); idle freeze 450ms; hover freeze; enter 250ms, exit 150ms plus removal after 170ms. Six deposited hues persist through closing. Fixed 60Hz accumulator, cached geometry, ResizeObserver, offscreen/background suspension, cleanup on filtering/unmount. Reduced motion and touch disable pointer attraction; keyboard/touch use anchored peeks. Escape restores focus.

## Verification

- TypeScript and visual static build passed.
- Lint: 0 errors, 9 existing static-image warnings.
- Unit tests: 23 passed.
- Complete E2E: 31 passed, 1 intentionally skipped (fine-pointer test on mobile). Includes axe, no-JS, responsive layout, L1–L4 image/video journeys, query history and Magnetic keyboard/pointer checks.
- After adjusting L1's facet tie order, affected journey/Magnetic tests: 13 passed, same mobile pointer skip.
- Static export: 56 HTML pages, 3116 local links verified.
- Root compiler validation/build and all 18 infra tests passed.
- Lighthouse was not rerun for this change; prior measurements are historical.

Only local frontend engineering and isolated visual fixture output changed. Fixture revision: `sha256:268ea6de403be07d656c4c566213bd6bf6a0585cefd84d35bea8785bbcd080a4`. No CMS publication, mirror synchronization or production deployment was performed by this task.
