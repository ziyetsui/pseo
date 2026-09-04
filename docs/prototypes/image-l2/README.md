# L2 image prompts — Matrix exploration

Local picker: http://127.0.0.1:8768/ (1–4 or left/right arrows; inputs retain normal typing). `?v=2` opens Matrix. Run from this directory: `node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 8768`.

This is an isolated Next/React/TypeScript/CSS prototype. No production source imports it. The sibling task-l3 exploration is unrelated and untouched. Uses the existing local Next dependencies and read-only `createFixtureCatalog` materials. X-Robots-Tag and metadata are noindex/nofollow. No CMS/publication/mirror/deploy changes.

## Directions, awaiting user choice

| View | Axis | Best at | Cost |
| --- | --- | --- | --- |
| Deck | Existing single-card interaction, unmodified live page in an iframe | Focus on one prompt | Slow to compare many images |
| Matrix | Dense model × task count table; click cells or headers to filter | Understand coverage and choose an intersection | Images sit below the table; horizontal scroll on mobile |
| Atlas | Parallel task columns containing actual result images | Compare visual output across purposes | Multi-task prompts repeat across columns; requires sideways browsing |
| Index | Compact index beside a full image and original text | Read and inspect long prompts without leaving the list | Mobile stacks the index above the reader |

The source L1 Matrix includes mixed content. This L2 exploration computes all counts from only the 23 fixture records whose declared kind is image. Beauty has 10 image records here; the mixed library's 13 also includes video. Missing tasks remain Unfiled. No classifications or numbers were invented. Multi-label row/column totals are not additive unique prompt totals.

Reference: `http://127.0.0.1:8766/proto-l1-system.html?v=5`. Baseline: `http://127.0.0.1:3000/zh-CN/prompts/image`. Reference Matrix screenshot in `evidence/reference-matrix.png`.

## Materials and craft

Inter Variable is the project's local WOFF2; neutral dark canvas/surface/card use the selected Linear tokens. Counts use tabular mono figures; saturated color is reserved for source images. No copy controls; Generate image links point to existing L4 routes. Model links in Index point to existing L3 pages. No invented generation service.

Skills applied: prototype (divergence/picker), design-foundations (hierarchy/spacing), typography (reading and data roles), color and surfaces (dark ladder and table boundaries), forms-and-inputs (persistent labels/16px inputs), animations (specific hover transitions/reduced motion), performance (bounded 23-record dataset, sized lazy media), ui-polish and touch-and-accessibility (focus and interactive states), ui-review (final checks). Picker CSS is copied verbatim from PICKER.md; its 28px harness controls are intentionally unchanged and excluded from product axe checks.

All variants remount instantly. Picker selection persists in `?v=`; number/arrows ignore input/select/contenteditable and modifiers. R remounts; there is no replay button because these variants have no entrance animation. Baseline iframe consumes its own keys (including Deck arrows); focus/click the external picker to compare variants.

## Verification

`node verify.mjs` manually exercises every variant at 1440×1000 and 375×1000, captures screenshots, checks Matrix cell counts, empty/reset states, Index selection, real L4 href shapes, no copy controls, reload persistence, keyboard picker and typing isolation. Axe excludes the fixed verbatim picker. See `evidence/verification.json` for final results. TypeScript `--noEmit` passed.

The initial mobile Index audit identified a non-focusable scrollable prompt block; it was fixed with tabindex and an accessible label before handoff. External image loading depends on source hosts; the prototype displays an explicit failure fallback.

No winner has been selected. After a user selection, record the chosen direction and rejected tradeoffs, then promote only the selected design and remove this prototype unless asked to retain it.
