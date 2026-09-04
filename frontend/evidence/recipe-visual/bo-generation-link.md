# L4 generation destination — 2026-09-04

User explicitly chose https://bo.video/home for all L4 Generate CTAs. Recipe now renders a real new-tab link with noopener/noreferrer regardless of per-record tryUrl. Type-aware Generate image / Generate video / Generate labels remain. Removed the unavailable-generation notice and disabled button. This is navigation only; no prompt/variable data is appended or submitted. L1–L3 destinations and manual scratchpad behavior are unchanged.

Updated Recipe.tsx, existing journey assertions, AGENTS.md, PRD and Tech Arch. All 34 exported L4 pages verified for destination, label, target=_blank, and missing obsolete notice. 49 unit tests passed; image/video L1→L4 journeys on desktop/mobile 4/4 passed. build:visual including TypeScript passed; static check 78 HTML / 4,776 internal links passed. Visual revision unchanged. No CMS/mirror/production deployment writes.
