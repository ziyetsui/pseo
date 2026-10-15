# Website spotlight caption alignment

Browser: system Chrome, DPR 2; viewports 375×900 and 1440×900. Before/after use the current Beta page with the proposed CSS injected for preview, then disable/restore the count indent. Fonts are awaited before capture.

At both widths, heading ink begins at x=30 within the caption screenshot. Count ink starts at x=31 before and x=30 after the 0.5 CSS px optical correction. Two-line layout, FLORIA cover, caption and actual case URL remain unchanged. English has zero text indent.

Focused independent code review: no important or serious findings. Lint: zero errors, 18 existing image warnings. Typecheck passed. Tests: 219 passed across 43 files with one worker and 60s timeout, after an initial run under concurrent machine load timed out. Local build concurrency is temporarily reduced to two workers for memory pressure; the build-only config is restored afterward.
