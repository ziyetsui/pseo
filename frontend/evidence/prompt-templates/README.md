# Editable Prompt templates — 2026-09-04

用户最终裁定：页面正文直接使用可编辑模板，不提供作者原文对照入口。

## Scope and data

- Local visual-fixture only: 34/34 prompts covered, 94 exact source-slice edits; existing native tokens retained, long isometric placeholders normalized.
- Data: `src/data/wireframe/prompt-templates.json`, typed export in `prompt-templates.ts`; per-record review in `catalog-review.md`.
- One fixture projection supplies template text and variable metadata to L1 preview, image/video Deck, model/Task/Style L3, Recipe L4 and model hero loading. Public API adapter and CMS records are unchanged.
- Shared bracket highlighting; L4 nonrecursive repeated-token replacement, JSON-safe escaping, reset. No original-text panel. Controlled inputs remain disabled until hydrated so early mobile input cannot disappear.
- Template source defaults are input hints. Attribution/source links and navigation remain. The sample result image shows the source example, not a promise of output for arbitrary new variable values.
- AGENTS.md, PRD and Tech Arch updated. Existing noindex fixture boundary retained; no CMS approval/publication, mirror sync or deployment performed.
- Fixture and export receipt revision: `sha256:73d488642d1168a16137b8ec48eb567e032d2393df24c343b26720d99d993948`.

## Actual validation

- Final typecheck, build:visual and static checks passed: 80 HTML pages, 4,675 local links.
- Lint: zero errors, 13 existing image warnings.
- Unit: 105/105 across 17 files. Includes all-record coverage, valid JSON, literal replacement and reset.
- Full E2E initial run: 54 passed, 3 skipped, one hub-video initialization timing failure. First recheck: 13 passed, one fast mobile L4 input failed; fixed controlled-input hydration readiness in RecipeText.
- Final targeted E2E: 14/14 desktop/mobile journeys and template scenarios passed. Other full-suite cases are recorded in the initial log, not claimed as rerun after the final control change.
- All 34 exported L4 bodies compared to the reviewed template projection; all have highlighted variables and no original-text panel (`template-output.log`).
- Mobile poster screenshot visually checked: bounded text layout, legible amber bracket values and preserved typography. Desktop/mobile screenshots are included.
- Root compiler validate/build and 18 infra tests passed.
- Early build attempt failed on new test tuple/nullability types; corrected before final build.
