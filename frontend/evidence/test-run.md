# Task 9 — E2E / axe / responsive / screenshots / static-output gate

Run date: **2026-09-02**. Machine: macOS (darwin 25.3.0), Node v24.14.0, pnpm 11.7.0,
Playwright 1.62.1 + `@axe-core/playwright` 4.13.0, Chromium installed with
`pnpm exec playwright install chromium` (exit code 0).

Everything below is the real, trimmed console output of the commands as run from
`frontend/`. Nothing is summarised as "passed" without its numbers.

---

## 1. Commands and results

| Command | Result |
| --- | --- |
| `pnpm lint` | exit 0, no findings |
| `pnpm typecheck` | exit 0 |
| `pnpm test` | 34 files, **324 tests passed** |
| `pnpm build` | exit 0, **55 static pages** into `out/` |
| `pnpm check:static` | **PASSED** (exit 0) |
| `pnpm test:e2e` | **36 passed, 6 failed, 12 skipped** — all 6 failures are the product findings in §5 |
| `pnpm screenshots` | **9 passed, 1 skipped** (blog is desktop-only) |

### 1.1 `pnpm build`

```text
$ next build
▲ Next.js 16.3.4 (Turbopack)
✓ Compiled successfully in 373ms
  Running TypeScript ...
✓ Generating static pages using 11 workers (55/55) in 395ms
Route (app)
┌ ○ /_not-found
├   /[locale]                       └ ● /zh-CN
├   /[locale]/blog                  └ ● /zh-CN/blog
├   /[locale]/blog/[slug]           ● 3 paths
├   /[locale]/blog/category/[slug]  ● 2 paths
├   /[locale]/prompts               └ ● /zh-CN/prompts
├   /[locale]/prompts/[promptSlug]  ● 35 paths
├   /[locale]/prompts/image         └ ● /zh-CN/prompts/image
└   /[locale]/prompts/models/[modelSlug]  ● 9 paths
```

### 1.2 `pnpm check:static`

```text
$ node scripts/check-static-output.mjs
check-static-output: 55 html file(s) in out/, 105 source file(s) in src/

1. required routes in out/
  ok    8 required route files present
  ok    3 blog article page(s)

2a. forbidden patterns in out/**/*.html
  ok    0 iframe / srcdoc / location.hash in 55 file(s)

2b. forbidden patterns in src/
  ok    0 iframe / srcdoc / location.hash in 105 file(s)

3. fragment hrefs point at ids in the same document
        fragments seen: #main ×55, #all-prompts ×9
  ok    64 fragment href(s), all resolved in-document

4. no `#` placeholder hrefs in src/
        in-page anchor  src/components/layout/SiteShell.tsx: #main
        in-page anchor  src/features/model/ModelBrowse.tsx: #${ALL_PROMPTS_ID}
  ok    0 placeholder hrefs in src/ (2 real in-page anchor(s))

5. no en hreflang in the export
        hreflang values: none
  ok    0 en hreflang tags

6. no prototype-declared counts in the export
  ok    0 occurrences of 982 / 324 条 / 136 条

check-static-output: PASSED
```

Every `href="#…"` in the export is verified against the ids present **in the same
document**, so `#main` (skip link) and `#all-prompts` (L3 in-page jump) pass while a
bare `href="#"` would always fail. `982` is grepped as a bare number and currently has
zero occurrences anywhere in `out/**/*.html`; `_next/…` asset URLs are stripped before
that scan so a build-hash digit can never fake a hit.

### 1.3 `pnpm test:e2e`

```text
$ playwright test --project=desktop --project=mobile
Running 54 tests using 9 workers
…
  6 failed
    [desktop] › tests/e2e/a11y.spec.ts:33:3 › axe: L3 模型页 has no critical or serious violations
    [desktop] › tests/e2e/no-js.spec.ts:21:3 › without JavaScript › L1 still lists prompts and offers a working GET search form
    [desktop] › tests/e2e/no-js.spec.ts:54:3 › without JavaScript › the golden L4 page still publishes the prompt verbatim
    [desktop] › tests/e2e/responsive.spec.ts:19:3 › L3 模型页 never scrolls horizontally
    [mobile] › tests/e2e/no-js.spec.ts:21:3 › without JavaScript › L1 still lists prompts and offers a working GET search form
    [mobile] › tests/e2e/no-js.spec.ts:54:3 › without JavaScript › the golden L4 page still publishes the prompt verbatim
  12 skipped
  36 passed (14.0s)
```

The 12 skips are deliberate project scoping, not silent holes:
`filters.spec.ts` (5 tests) is desktop-only, `mobile-nav.spec.ts` (3) is mobile-only,
`responsive.spec.ts` (4) drives its own viewport widths so it runs once. 5 + 3 + 4 = 12.

---

## 2. Per-spec results

| Spec | desktop | mobile | Covers |
| --- | --- | --- | --- |
| `journey.spec.ts` (2) | 2 pass | 2 pass | L1→L2→L3→L4 by clicking real `<main>` links; one `<h1>` and a working `#main` skip link on all five pages; the three L3 generate controls are `aria-disabled` with a stated reason |
| `filters.spec.ts` (5) | 5 pass | skipped | GET search writes `q`; same-axis OR; cross-axis AND; `role="status"` count == rendered cards; removal link; reload; back/forward; unknown value and unknown param both reported with a recovery link |
| `copy.spec.ts` (2) | 2 pass | 2 pass | clipboard grant + `readText()`; France substitution; rejected `writeText` shows 复制失败 and never 已复制 |
| `not-found.spec.ts` (2) | 2 pass | 2 pass | unknown slug → HTTP 404 + H1 页面不存在; `/404.html` recovery links resolve 200 |
| `mobile-nav.spec.ts` (3) | skipped | 3 pass | `aria-expanded` toggle, Enter/Space/Escape, focus return, panel links navigate |
| `a11y.spec.ts` (7) | 6 pass / **1 fail** | 7 pass | axe on L1–L4 + blog list + blog article + 404 |
| `responsive.spec.ts` (4) | 3 pass / **1 fail** | skipped | 320/375/768/1024/1440 × L1–L4 |
| `no-js.spec.ts` (2) | **2 fail** | **2 fail** | `javaScriptEnabled: false` on L1 and the golden L4 |

### 2.1 Filter contract, measured

The OR/AND assertions are relative, not hardcoded to fixture counts: the spec reads the
model axis's own chip hrefs, applies value A alone, value B alone, then both, and requires
`count(A∪B) ≥ count(A)` and `≥ count(B)`; adding a style chip must give `count ≤ count(A∪B)`.
After every change the `role="status"` number is compared against
`section[aria-labelledby="prompt-explorer-results"] ul > li` — the announced count and the
rendered cards cannot drift apart without failing.

---

## 3. axe results per page

`@axe-core/playwright` with tags `wcag2a, wcag2aa, wcag21a, wcag21aa`. Full output is
attached to each test as `axe-<page>`; the console lines are reproduced verbatim.

```text
[axe] desktop L1 提示词库:    0 violation(s)
[axe] desktop L2 图片提示词:  0 violation(s)
[axe] desktop L3 模型页:      1 violation(s)
serious	scrollable-region-focusable	1 node(s)
[axe] desktop L4 提示词详情:  0 violation(s)
[axe] desktop Blog 列表:      0 violation(s)
[axe] desktop Blog 文章:      0 violation(s)
[axe] desktop 404:            0 violation(s)

[axe] mobile L1 提示词库:     0 violation(s)
[axe] mobile L2 图片提示词:   0 violation(s)
[axe] mobile L3 模型页:       0 violation(s)
[axe] mobile L4 提示词详情:   0 violation(s)
[axe] mobile Blog 列表:       0 violation(s)
[axe] mobile Blog 文章:       0 violation(s)
[axe] mobile 404:             0 violation(s)
```

13 of 14 page × viewport combinations are clean at every impact level — not just clean of
critical/serious. The single violation is Finding 2 below; it appears only at 1440px,
because that is the width at which the offending `<pre>` actually becomes scrollable.

---

## 4. Screenshots

`pnpm screenshots` → `evidence/screenshots/`, captured with `scale: "css"` so the PNG is
1440 or 375 CSS px wide (the Pixel 7 profile's 2.625 DPR would otherwise make ~7× larger
files of the same picture).

| File | Size (px) |
| --- | --- |
| `l1-desktop.png` | 1440 × 7482 |
| `l1-mobile.png` | 375 × 14207 |
| `l2-desktop.png` | 1440 × 8928 |
| `l2-mobile.png` | 375 × 10858 |
| `l3-desktop.png` | 1440 × 11351 |
| `l3-mobile.png` | **714** × 26129 — the width itself is Finding 3 |
| `l4-desktop.png` | 1440 × 4895 |
| `l4-mobile.png` | 375 × 5890 |
| `blog-desktop.png` | 1440 × 2096 (bonus) |
| `finding-1-l1-no-js.png` | 1440 × 1200 — evidence for Finding 1, not a level shot |

`l3-mobile.png` is 714px wide at a 375px viewport. That is not a capture setting; it is the
page genuinely being 714px wide, which is Finding 3 rendered as a picture.

---

## 5. Findings for the controller

Three genuine product defects. Per the task rules I did **not** touch page code; each one
is left as a failing test because it violates a global constraint.

### Finding 1 — the export ships its page body inside `<div hidden>`; with JS off there is only a skeleton (violates global constraint 11)

**Severity: high.** This is the SEO/no-JS guarantee of the whole project.

- **Files:** `src/app/[locale]/prompts/loading.tsx`, `.../prompts/image/loading.tsx`,
  `.../prompts/models/[modelSlug]/loading.tsx`, `.../prompts/[promptSlug]/loading.tsx`,
  `.../blog/loading.tsx`, `.../blog/[slug]/loading.tsx` (route-level Suspense fallbacks),
  plus whatever makes those page components resolve after React's first flush.
- **Reproduce:**
  ```bash
  pnpm build
  grep -o '<main[^>]*>.\{0,60\}' out/zh-CN/prompts.html
  # <main id="main" class="flex-1"><!--$?--><template id="B:0"></template><div class="mx-auto …
  grep -c 'div hidden id="S:0"' out/zh-CN/prompts.html   # → 1
  ```
  or in a browser with JavaScript disabled, open `/zh-CN/prompts`:
  `document.querySelectorAll('main h1').length === 0`, and `main.innerText === "加载中"`.
  Screenshot: `evidence/screenshots/finding-1-l1-no-js.png`.
- **Expected:** the H1, the summary, the first screenful of the listing and the internal
  links are rendered by RSC **into `<main>`** in the exported HTML.
- **Actual:** `<main>` contains only the route's `loading.tsx` skeleton (`加载中`). The real
  page is appended at the end of `<body>` inside `<div hidden id="S:0">` and only moved into
  place by React's inline `$RC(...)` bootstrap script. Without JavaScript it is never shown.
- **Scope, measured over the 8 sampled routes:**

  | Page | body parked in `<div hidden>` | `BAILOUT_TO_CLIENT_SIDE_RENDERING` templates |
  | --- | --- | --- |
  | `out/zh-CN.html` | no | 0 |
  | `out/zh-CN/prompts.html` | **yes** | 2 |
  | `out/zh-CN/prompts/image.html` | **yes** | 1 |
  | `out/zh-CN/prompts/models/nano-banana-pro.html` | **yes** | 1 |
  | `out/zh-CN/prompts/country-miniature-stamp-poster.html` | **yes** | 0 |
  | `out/zh-CN/blog.html` | **yes** | 0 |
  | `out/zh-CN/blog/stamp-poster-case-study.html` | **yes** | 0 |
  | `out/zh-CN/blog/category/guides.html` | no | 0 |
  | `out/404.html` | no | 0 |

  `blog/category/guides` has a `loading.tsx` like the others yet resolved inside the first
  flush, so this is **build-timing dependent**: a rebuild can move a page between the two
  states. Do not treat "it looked fine on my build" as a fix.
- **Suggested direction (controller's call, not mine):** in a static export nothing loads at
  request time, so the route-level `loading.tsx` files buy nothing and are exactly what
  non-JS readers end up seeing. Removing them (or otherwise ensuring the page's data is
  resolved before the shell is flushed) should put the RSC output back inside `<main>`.
  Note the two `BAILOUT_TO_CLIENT_SIDE_RENDERING` templates on L1 are a separate, expected
  consequence of `useSearchParams` in `PromptExplorer`; its own `Suspense fallback={browse}`
  is designed to cover that, and would work once the outer boundary stops swallowing the page.
- **Failing tests:** `tests/e2e/no-js.spec.ts` (both tests, both projects).

### Finding 2 — a scrollable `<pre>` on prompt cards has no keyboard access (violates global constraint 8; axe *serious*)

- **File:** `src/features/prompt/PromptText.tsx:21-29` — the `<pre>` gets
  `overflow-x-auto` but no `tabIndex`. (`PromptSourceText.tsx` on L4 does set `tabIndex={0}`,
  which is why L4 is clean.)
- **Reproduce:** open `/zh-CN/prompts/models/nano-banana-pro` at 1440×1200, run axe.
  ```text
  VIOLATION serious scrollable-region-focusable | Scrollable region must have keyboard access
    target: ["#model-all-2060557083679076537"]
    html:   <pre id="model-all-2060557083679076537" class="overflow-x-auto border-2 … whitespace-pre-wrap select-text md:text-sm">
    msg:    Element should have focusable content; Element should be focusable
  ```
- **Expected:** 0 critical/serious violations; a region a mouse can scroll must be reachable
  by keyboard.
- **Actual:** 1 serious violation. A keyboard-only reader cannot scroll that prompt.
- **Note:** the same component is used by every card on L1/L2/L3, so this will surface
  wherever a card's prompt happens to overflow; L3 at 1440px is simply where it does today.
- **Failing test:** `tests/e2e/a11y.spec.ts` — `axe: L3 模型页` (desktop project).

### Finding 3 — L3's prompt grid forces a 714px page at 320px and 375px (violates global constraint 8)

- **File:** `src/features/model/ModelBrowse.tsx:57` and `:81` —
  `<ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">`.
- **Reproduce:** open `/zh-CN/prompts/models/nano-banana-pro` at a 320px or 375px viewport.
  ```text
  Error: /zh-CN/prompts/models/nano-banana-pro horizontal overflow
    + "320px: scrollWidth 714 > clientWidth 320",
    + "375px: scrollWidth 714 > clientWidth 375",
  ```
  The computed grid track is the giveaway: with the `<ul>` itself only 288px wide,
  `getComputedStyle(ul).gridTemplateColumns === "697.594px"`. The single implicit column is
  sized to its items' min-content instead of being clamped to the container.
- **Expected:** `document.documentElement.scrollWidth <= clientWidth` at all of
  320/375/768/1024/1440. L1, L2 and L4 all pass.
- **Actual:** the page is 714px wide at both mobile widths, so the whole document scrolls
  sideways. Visible in `evidence/screenshots/l3-mobile.png` (714px wide at a 375px viewport).
- **Likely cause:** a grid item cannot shrink below its content's min-content size unless the
  track is `minmax(0, 1fr)` (or the item gets `min-w-0`). The prompt `<pre>` inside the card
  supplies a very large min-content width.
- **Watch out:** `src/features/search/PromptResults.tsx:41` uses the same
  `grid gap-6 …-cols-2 …-cols-3` shape for L1/L2/L3 *filter results*. Those results only
  render once a filter is active, so the responsive spec (which loads the unfiltered page)
  does not exercise them — the same defect may well be there. Worth checking while fixing L3.
- **Failing test:** `tests/e2e/responsive.spec.ts` — `L3 模型页 never scrolls horizontally`.

---

## 6. Notes, limits and concerns

- **The suite is red on purpose.** All 6 failures map 1:1 to the three findings above. Once
  they are fixed the expected result is 42 passed / 0 failed / 12 skipped. Nothing was
  marked `test.fixme`, because every finding breaks a stated global constraint rather than
  being a nice-to-have.
- **Serving.** The default `serve out -l 3100` resolves `/zh-CN/prompts` → `prompts.html`
  and `/zh-CN/prompts/image` → `image.html` correctly with its built-in clean-URL handling,
  and answers unknown paths with `out/404.html` at a real HTTP 404. No `serve.json` was
  needed. `/404.html` 301-redirects to `/404`; Playwright follows it, so the spec asserts on
  the page it lands on.
- **Clipboard.** `context.grantPermissions(['clipboard-read','clipboard-write'])` is
  Chromium-specific; both projects are Chromium, so the copy spec runs in both. The failure
  case does not need any permission — it replaces `navigator.clipboard` via `addInitScript`.
- **Variable substitution is measured, not assumed.** The copy test counts `[COUNTRY]` in the
  published `<pre>` (currently 7) and `France` in the same text (currently 0), then requires
  the clipboard content to contain 0 tokens, `0 + 7` occurrences of `France`, and to equal
  `source.split('[COUNTRY]').join('France')` exactly. No count is hardcoded.
- **Screenshots are excluded from `pnpm test:e2e`** (separate Playwright projects), so a
  normal test run never rewrites committed PNGs.
- **Not covered here.** Real-device browsers (only Chromium is installed), Firefox/WebKit,
  visual regression diffing, and the L1/L2 filter-result grid at mobile widths (see the
  Finding 3 note).
