# Editable composer placeholder colors — 2026-09-04

All model/model-family Signature composers now retain the shared amber text/background for bracket variables after list Generate loads a template. HighlightedPromptInput keeps a real labeled textarea for input, selection and draft storage, with an aria-hidden mirror for color. Font metrics, wrapping, scroll position and resize dimensions are synchronized; marks have no layout-changing padding. Forced-colors switches to visible native textarea text. Prompt bytes and the external generation contract are unchanged.

Files: src/components/HighlightedPromptInput.tsx, AnthologyReader.tsx, styles/model-signature.css, tests/e2e/composer-highlights.spec.ts; rules synchronized in frontend/AGENTS.md and specs/0008-prd.md / 0009-pseo-tech-arch.md.

Validation: lint 0 errors/13 existing img warnings; typecheck passed; 106 unit tests passed. Targeted desktop/mobile composer + Signature E2E: 8 passed (17.9s), including exact loaded value and source colors, focus, editing/removing placeholders, scrolling, resizing, reload and forced-colors. Reviewed loaded-mobile.png and scrolled-desktop.png for color, wrapping and line/caret alignment. Independent read-only subagent review found no concrete issue. Native OS IME was not manually tested; composition remains owned by the native textarea. This was not a full-site E2E or SEO audit.

Final build:visual and check:static passed (80 HTML pages, 4,675 local links); root content validate/build and 18 infra tests passed. Data fixture revision remains sha256:73d488642d1168a16137b8ec48eb567e032d2393df24c343b26720d99d993948. CMS public/mirror unchanged; production deployment not performed.
