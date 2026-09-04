# Style L3 compact navigation — 2026-09-04

Historical decision, superseded later on 2026-09-04 by the user's thumbnail-row request. Current behavior is documented in `thumbnail-navigation.md`; the compactNavigation prop and text-only CSS below were removed intentionally.

User requested small cards for Browse by category / task / model on Style L3 pages. StylePlate now enables HubBrowse's opt-in compactNavigation variant. Those three sections render only labels/counts/links and omit media elements entirely; no hidden image requests. Other callers keep the existing layout. Task cards without a cover can now appear as ordinary text cards. Model cards preserve family grouping and deduplicated counts.

Scoped CSS: 84px minimum card height, 3 columns on desktop, 2 below 860px, wrapped labels, 12px gaps. Plate result media, Browse by style, creator cards and footer retain their prior behavior. Contract updated in frontend/AGENTS.md.

Chrome inspected Photorealistic: category 2 cards, task 7, model 4; all three sections have zero image elements and 84px measured cards. Desktop screenshot visually inspected at the Tasks anchor. Unit 35/35 passed; visual build including TypeScript passed; static validation 77 HTML / 4506 links passed. Full E2E, root compiler and Lighthouse not rerun for this visual change.

Local visual-fixture/noindex only. CMS public, mirror and production deployment unchanged. Fixture revision: sha256:d5d7d685a3b67266f2ec317570bf2766df135c5aa9016de105f01572c3956275.

Style browser regression: 7 passed / 1 deliberate duplicate viewport skip, including desktop/mobile, scoped filters, L4 links, keyboard, no-JS, Axe and media-failure checks.
