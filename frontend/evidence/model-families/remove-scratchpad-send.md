# Remove Send to the scratchpad — 2026-09-04

User requested uniform removal of the entry action. AnthologyReader now removes this button on both exact-model and family pages, together with its unused staging, author-loaded state and textarea focus logic. Manual scratchpad input/session persistence remains; placeholder now says “Write or paste your prompt here.” A manually entered draft has no supplied generation URL, so its action stays disabled. Generate image/video entry links, source links and index links remain.

AGENTS.md updated; existing journey test now asserts the removed action is absent and verifies manually entered draft survival through filtering, Back and reload.

49/49 unit tests passed; desktop/mobile Anthology journeys 2/2 passed; build:visual including TypeScript passed. Static check: 78 HTML / 4,776 internal links passed. The concurrent model-hero prototype is now buildable and contributes the extra route; it was not edited in this change. Visual fixture revision unchanged. No CMS, mirror or deployment writes.
