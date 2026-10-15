# Editorial language menu — approved option 01

The owner selected the editorial design from the interactive navigation study. This changes the shared LanguageSwitch and its styles, preserving the existing brand, route/query/hash mapping, original prompt text and content publication state.

| Before | After | Why |
| --- | --- | --- |
| Outlined Language capsule | Warm-gray Aa and current-language label, separated by a hairline | Show current state and fit the library's typography |
| Rounded dark dropdown | Paper-colored, numbered two-language index with a current-item check | Reproduce the approved editorial character |
| Same appearance for all input methods | 160ms origin-aware pointer entry; instant keyboard/reduced-motion entry | Feedback without delaying keyboard navigation |
| Mobile header wraps language onto a third row | Language aligned with brand; links on the next row | Keep the header compact and the panel inside the viewport |

Verification: 192 unit tests pass; typecheck passes; lint has zero errors and 17 existing image warnings; Git beta build and static checks pass (1,825 pages). Compiler validate/build and 18 infrastructure tests pass. Browser regression checks cover desktop/mobile language switching with query/hash preservation, menu viewport bounds, Escape/focus restoration, open-menu WCAG checks, responsive layouts, and no-JavaScript switching. Full unrelated browser suite was not run locally; CI supplies the broader engineering gates.

No CMS, source content, rights, DNS, Access or production configuration change. Git beta stays noindex. Deployment is tracked separately after the engineering PR merges.
