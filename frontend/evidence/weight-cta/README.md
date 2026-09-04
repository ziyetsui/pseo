# Weight CTA — 2026-09-04

## Implemented behavior

Applies to Prompt L1, image/video L2, model/model-family, Task and Style L3, and Recipe L4.

- New visits do not prompt. Passive eligibility requires intentional downward scrolling or Deck advancement, 45% current-content progress, 30 seconds visible time and 1.2 seconds idle. Hidden pages, editing, selected text and open previews suppress it.
- Passive result is a small Weight reminder with actual collection character count. It does not take focus, lock scroll or blur content. Editing or changing filters removes it; dismissal suppresses automatic reminders for 7 days.
- Only explicitly marked external generation links open the full Weight dialog. Internal L1–L3 navigation and model-list template loading retain their behavior. Dialog target preserves the clicked link (model hero: bo.ancher.ai/home; Recipe: bo.video/home).
- Once per session for passive reminder and once per session for explicit dialog. Dismissal bypasses subsequent dialogs during the 7-day quiet period. Continuing to bo suppresses reminders for 90 days. Storage-denied environments keep an in-memory decision for the document.
- Native modal dialog, explicit Tab wrapping, Escape/backdrop/close dismissal, exact preexisting scroll styles restored, original trigger refocused, reduced motion honored. No webdriver exemption.
- Prompt/variable text is not sent to an external URL. Numeric copy describes collection or current edited prompt text; no claims about authentication, registration totals or free generation credits.
- Replica preserves Weight's 590-weight large numeric figure, .82 line-height, -.035em tracking, 18px spacing, 8px backdrop blur and 250ms fade. The compact passive form and contextual copy are deliberate UX adaptations. The reference file was inspected as source; browser file-URL navigation was blocked by browser policy and was not bypassed. Runtime desktop/mobile screenshots were inspected.

## Files and contracts

Implementation: components/SignInGate.tsx, lib/cta/sign-in-gate.ts, styles/sign-in-gate.css. Entry wiring: Recipe.tsx, RecipeText.tsx, AnthologyReader.tsx. Tests: sign-in-gate.test.ts, e2e/weight-cta.spec.ts. Frontend AGENTS.md, PRD and Tech Arch record the new policy.

## Actual validation

- Unit: 106 tests passed, 17 files. Lint: 0 errors, 13 existing image warnings. Typecheck and final visual build passed.
- Initial targeted CTA tests: JSX syntax and an incorrect test character-count constant were corrected; subsequent 6 desktop/mobile CTA tests passed.
- Full suite: 56 passed, 3 skipped, 5 failures. Three existing navigation/filter cases hit hydration/timing failures under parallel load; two new keyboard cases exposed native dialog tabbing to browser chrome. Added explicit focus wrapping.
- Final serial affected-surface verification: 23 passed, 1 existing viewport-specific skip, covering desktop/mobile CTA policy on seven surface URLs, exact destinations, draft preservation, focus recovery, keyboard trapping, axe, image/video journeys, filters and Task pages.
- Static check: 80 HTML pages and 4,675 local links. Root compiler validate/build and 18 infra tests passed.
- Local visual-fixture revision unchanged: sha256:73d488642d1168a16137b8ec48eb567e032d2393df24c343b26720d99d993948. No CMS public/mirror/production deployment changes.
