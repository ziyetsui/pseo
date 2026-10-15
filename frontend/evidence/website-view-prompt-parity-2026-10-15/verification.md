# Website category prompt parity

The Website category deck previously put its case count into a full-height prompt block. It now selects one real in-scope source example and keeps its cover, prompt, author, source URL and language together. Category counts remain statistics; complete bodies use the image/video PromptWords highlighting and pre.prompt layout. Missing source text has an explicit note and no fabricated prompt block.

- 42 unit test files /216 tests passed, including all Website categories in both locales and the missing-body case.
- Typecheck passed; lint0 errors (18 existing image warnings).
- Git beta export/static checks passed:1825 HTML pages /121932 links.
- Browser regression:2 desktop/mobile project tests passed, both locales at375/1440 widths, source prompt/variable display and next-card interaction checked. Screenshots attached.
- Independent code review: no actionable defect. Source graph, translations, content counts and CMS state unchanged.
