# Final Magnetic: homepage screens one and two

Reference: `docs/wireframes/final/L1-hub-magnetic.html?v=2`, Magnetic. Scope: homepage argument and library introduction/results only.

Restored the first screen's three reference paragraphs in `Hub.tsx`, including the italic “not editing.” The existing heading and first/second-screen CSS and Magnetic controller already match the selected reference; they were retained. The user's subsequent instruction explicitly preserves the current peek card, template highlights and Generate action. No peek/controller/Browse/Footer source was edited.

Verification script compares the reference's paragraph text and first-screen geometry at 1440, 698 and 375 pixels, with previously removed prototype signature/picker controls excluded from the comparison. It verifies the existing `.after`, navigation and footer HTML are unchanged byte-for-byte. Screenshots show the restored first screen, second screen and the user's specified portrait peek with highlighted placeholders and Generate image. The capture waits for focus-induced scrolling before opening the anchored peek, since scrolling intentionally closes it.

Checks: reference measurements passed at all three widths; 138 unit tests passed; lint had 0 errors and 13 existing image warnings; typecheck passed; accessibility/Magnetic browser tests 21 passed and 1 intentional mobile hover skip; visual build and static checks passed (80 HTML pages, 4,281 local links).

AGENTS/PRD/Tech Arch reflect the scoped restoration and retained peek. No CMS content, publication/rights state, mirror or production deployment changed. Local visual-fixture revision remains `sha256:73d488642d1168a16137b8ec48eb567e032d2393df24c343b26720d99d993948`.
