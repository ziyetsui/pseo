# Creator profile navigation — 2026-09-04

User requested Creator cards open the author's X profile. Browse/Creators (Hub, Style and Anthology), TaskFindings, and the All creators directory now prioritize the supplied creator.url. External profiles open in a new tab with nofollow/noopener/noreferrer. Missing profile URLs retain the supplied internal route; no account is invented from a display name. Ordinary creator query filters and the footer's All creators directory remain available. AGENTS.md updated.

Files: components/Browse.tsx, TaskFindings.tsx, Directory.tsx, app/[locale]/[[...path]]/page.tsx. No taxonomy, author identity, source-post URL, CMS or public snapshot changes.

Runtime HTML verification: Hub 8, Beauty 8, Nano Banana Pro 7, Photorealistic 8, creator directory 21 cards (52 occurrences). All five pages returned 200; every checked Creator card points to https://x.com/ with target=_blank and noopener. First examples resolve to https://x.com/KeorUnreal and https://x.com/AIWithRay.

49/49 unit tests passed. Full build remains blocked by unrelated concurrent proto/model-hero/variants.tsx strict errors (possibly undefined seed); not modified here. No successful new export or deployment claimed.
