# Language menu local verification — 2026-10-14

Updated shared LanguageSwitch and CSS: Language disclosure, English/中文 same-page links, current-language check, local preference storage, Escape/focus restore and outside-pointer dismissal. Native details/links work without JavaScript. Mobile popup aligns with its trigger to stay within the viewport.

Local dev service restarted in git-beta mode at http://127.0.0.1:3016; HTTP 200 confirmed. Desktop/mobile screenshots inspected.

Validation:
- pnpm lint: 0 errors, 20 existing image warnings.
- pnpm typecheck: passed, including after final changes.
- pnpm test: 34 files / 181 tests passed.
- pnpm build:beta: passed (before the final mobile-only popup alignment correction).
- pnpm check:static: passed, 1826 HTML pages / 125292 local links.
- Root compiler validate/build: passed; compiler tests 18/18 passed. Build written to OS temp directory.
- Chrome bilingual e2e: route/query/hash/back navigation passed on desktop and mobile; bilingual content passed on both; mobile accessibility/layout/no-JS passed.
- Menu viewport/Escape/focus e2e passed on desktop and mobile. Manual keyboard activation, preference persistence and outside click verified.
- Desktop accessibility/layout suite initially interrupted by dev hot reload, then exceeded its default 30-second budget; rerun with a 120-second budget passed in 20.6 seconds. All eight bilingual/menu project cases passed across the completed runs.

Only local UI changed. No CMS public state, mirror publication or production deployment was performed. Existing concurrent changes to Browse, TaskFindings and specs were preserved.
