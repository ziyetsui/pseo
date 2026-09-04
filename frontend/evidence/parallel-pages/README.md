# Same-type page parity — 2026-09-04

Scope: the current localhost visual-fixture Prompt site. All 72 Prompt product routes were inventoried: L1 (1), image/video L2 (2), model/model-family L3 (13), Task L3 (8), Style L3 (7), Subject listings (5), directories (2), and Prompt L4 (34). Entry aliases, error pages, Blog and experimental prototypes are outside this product parity matrix.

## Applied changes

- Shared collection statistics use `isStructuredPrompt`; a leading `[SUBJECT]` is no longer misclassified as JSON. Copy says structured text.
- Deck media count badges reflect the actual assets: PHOTO, VIDEO or MEDIA. Prompt generation type remains independent of preview asset type.
- Single-result Task/browse counts use the singular form.
- Empty Task/Style collections provide a working library link. A populated collection with no filter matches retains Clear filters and its original scope.
- Shared creator matching prefers an explicit id/slug reference, with nonempty normalized handle fallback only when no reference exists. Cards, avatars and footer eligibility now use the same match.
- Frontend AGENTS and the PRD/Tech Arch record that a confirmed change applies to every sibling of the same page type through shared components. Distinct approved page layouts retain their own design.

## Verification actually performed

| Check | Result |
| --- | --- |
| `pnpm --dir frontend lint` | 0 errors; 13 existing `no-img-element` warnings |
| `pnpm --dir frontend typecheck` | Passed |
| `pnpm --dir frontend test` | 22 files, 138 tests passed |
| `pnpm --dir frontend exec playwright test --workers=1` | 75 passed, 3 intentional skips; desktop and mobile; 3.8 minutes |
| `pnpm --dir frontend build:visual` | Passed |
| `pnpm --dir frontend check:static` | 80 HTML files, 4,281 local links passed |
| `node infra/bin/content.mjs validate` | Passed |
| `node infra/bin/content.mjs build --output infra/generated/static` | Passed |
| `node --test infra/tests/*.test.mjs` | 18 passed |

The three Playwright skips are the fine-pointer hover test on touch and duplicate Style/Task viewport matrices that run once under the desktop project. They are not unexpected failures. The complete run includes every model/model-family route's Signature/refill/draft/Weight flow and every one of the 34 L4 routes' choice, fill, reset and generation-link flow in both desktop and mobile projects. It also covers no-JavaScript content, accessibility, filter history, layout overflow, footer destinations and all L1–L4 journeys.

Detailed final static inventory: [static-audit.md](./static-audit.md).

## Publication boundary

This is a local frontend engineering change. The visual fixture revision remains `sha256:73d488642d1168a16137b8ec48eb567e032d2393df24c343b26720d99d993948`. The root compiler fixture revision remains `sha256:133521b6a07f71ad2455e1e4bd25634cabf3f79c5643a2e81ce87c4c90952a01`. No CMS proposal/public state, rights approval, content mirror publication or production deployment was performed. No content or source attribution was fabricated or changed.
