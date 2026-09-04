# Navigation and route audit — 2026-09-04

Scope: current frontend source and the existing local `visual-fixture` export. This is engineering evidence; it does not change CMS records, rights, snapshots, mirrors, or deployments. Runtime/browser and post-rebuild checks are owned by the parent task.

## Confirmed defects and fixes

1. **Task header links had no destination anchors.** `TaskFindings.tsx` used the shared hub header after its bottom browse sections were removed. `Chrome.tsx` emitted `#tasks`, `#models`, and `#styles`, none of which existed on any Task page; the empty Product marketing page also lacked `#creators`. Opening `/zh-CN/prompts/use-cases/advertising` and choosing Tasks reproduced the defect. The pre-fix HTML scan found **25 missing anchor occurrences across all 8 Task routes**. Task headers now explicitly use the library section URLs (`/zh-CN/prompts#tasks`, etc.). Hub and Style retain local section navigation; Skip to content remains local `#main`.
2. **The static link gate ignored hashes.** `scripts/check-static-output.mjs` used only the path of root-relative links and skipped same-page fragments entirely. Both `#missing` and `/other#missing` passed when the path existed. The checker now resolves internal URLs, checks destination documents and decoded IDs/named anchors, and supports same-page, cross-page, query-bearing, and root-index links. Isolated export fixtures verify these behaviors without mutating the shared export.
3. **Time-window filtering could not be cleared.** `Filters.tsx` consumed `window=7d|30d` but did not count it as active or remove it in Clear filters. With a snapshot date later than the records, zero results persisted after clearing. The window is now recognized and removed; sorting and the fixed route scope remain. Regression coverage uses a fixed Beauty catalog and checks both supported narrowing windows.
4. **Directories and Blog incorrectly marked Images as the current page.** Those callers reuse the deck header without declaring a content type. Its old default selected Images. The default was removed; only actual image/video Deck callers, which already pass their explicit type, mark that tab current.

Changed source/guard files: `src/components/Chrome.tsx`, `src/components/TaskFindings.tsx`, `src/components/Filters.tsx`, `scripts/check-static-output.mjs`.

Added regression files: `tests/navigation.test.tsx`, `tests/static-output.test.ts`, `tests/filter-reset.test.tsx`.

## Static audit observations

Baseline export revision: `sha256:d5d7d685a3b67266f2ec317570bf2766df135c5aa9016de105f01572c3956275`.

- Scanned **77 exported HTML documents and 5,015 internal anchor occurrences**, including same-page and cross-page fragments. No missing internal route paths; the 25 missing fragment targets above were the route defects found.
- No empty or `#` placeholder anchor hrefs. All **34 unique external hrefs** had structurally valid HTTPS URLs, without URL credentials. This audit did not request external destinations or claim they remain available.
- L1 category cards point to image/video Decks; task/style cards point to their distinct Findings/Plate routes. Model navigation uses family projections; exact model links on records retain exact version destinations.
- Footer tasks/styles/subjects resolve through their registered entity paths; All models and All creators resolve to separate directories. Registered empty categories render an explicit empty state.
- Anthology TOC entries and articles share immutable-id anchors; Plate TOC entries and figures share immutable-id anchors. Their visible order is derived from the same current filtered collection.
- Task, Style, Anthology, and Deck readers receive server-filtered catalog subsets. Query filtering can narrow these sets but cannot escape the fixed task/style/model/content type. Global Browse navigation intentionally links to the global destination collections; this audit did not change those counts or scopes.
- Per-record Generate/title links point to the record's actual L4 href. L4 model and related-record links derive from recorded relationships; source links derive from source records.
- Unknown locale/slug resolution calls `notFound`; this audit did not run the HTTP server to verify status codes.

## Executed verification

Failing-first checks reproduced Task header `#tasks`, both missing-anchor cases accepted by the old checker, the false current navigation item, and time-window `active=false`.

`pnpm exec vitest run tests/navigation.test.tsx tests/static-output.test.ts tests/filter-reset.test.tsx`: **3 files, 11 tests passed**.

Running the strengthened checker against the **pre-rebuild** shared export failed as expected at `out/zh-CN/prompts/use-cases/advertising.html` with `Broken internal anchor #tasks`. That export predates the header fix. The parent task must rebuild and rerun the static gate before claiming the final artifact is clean.

No builds, browser sessions, CMS writes, mirror writes, or deployment actions were performed by this audit worker.
