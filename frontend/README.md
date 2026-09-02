# pseo frontend

Next.js 16 (App Router) static export for the SEO-first prompt/blog site.
Everything under `frontend/` is owned by the frontend agent; see `AGENTS.md`
in this directory for the binding collaboration rules.

## Commands

Package manager is **pnpm** (`pnpm-lock.yaml` is the source of truth — do not
mix in npm/yarn/bun). Run everything from `frontend/`.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Local dev server on http://localhost:3000 |
| `pnpm build` | `next build` → static export into `out/` |
| `pnpm lint` | ESLint flat config (`eslint-config-next` 16) |
| `pnpm typecheck` | `tsc --noEmit`, strict + `noUncheckedIndexedAccess` |
| `pnpm test` | Vitest (jsdom + Testing Library) unit tests |
| `pnpm test:e2e` | Playwright against the built `out/` served on :3100 |
| `pnpm check:static` | Static-output gate over `out/` + `src/` (routes, iframe/srcdoc/hash, `#` links, hreflang, prototype counts) |
| `pnpm screenshots` | Full-page PNGs of L1–L4 at 1440×1200 and 375×812 into `evidence/screenshots/` |
| `pnpm build:bauhaus` | The comparison theme, exported to `out-bauhaus/`; `out/` is put back exactly as it was |
| `pnpm screenshots:bauhaus` | The same PNGs for that theme, into `evidence/screenshots/bauhaus/` |

Gate before any delivery: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

### `NEXT_PUBLIC_THEME` — which visual system a build ships

The site has two complete themes and one set of token names.

| Value | Theme |
| --- | --- |
| *(unset)* | **`neutral`** — the default and the direction: the prototype's own tokens (`docs/wireframes/flow-proto.html`) in a design-engineering idiom. A platform sans that puts PingFang SC in front of the Chinese glyphs, translucent hairline rules, layered soft shadows, a 12px radius, and a real dark mode. |
| `bauhaus` | The previous system from `specs/images/0008-bo-pseo-ui.md`, value for value: the flat three-accent palette, Outfit, 2px/4px black rules, unblurred offset shadows, square corners, light only. Kept for side-by-side comparison during the transition. |

Anything other than `bauhaus` — unset, empty, a typo — is `neutral`, so a
misspelt variable can never half-configure a page.

`SiteShell` stamps the choice as `data-theme` on the shell's root element and
`src/styles/globals.css` does the rest, so switching themes is a rebuild and
never a code change:

```bash
NEXT_PUBLIC_THEME=bauhaus pnpm build     # or: pnpm build:bauhaus, which keeps out/
```

`NEXT_PUBLIC_COLOR_SCHEME=light|dark` pins the scheme for a `neutral` build
(the screenshot runs use it). Leaving it unset is a third state, not a default:
no attribute is rendered and `prefers-color-scheme` decides. It is ignored under
`bauhaus`, which is light-only by its own spec.

`pnpm test:e2e`, `pnpm check:static` and `pnpm screenshots` all read the built
`out/`, so run `pnpm build` first. Playwright's `webServer` starts
`serve out -l 3100` for you and reuses an already-running one.

The two themes never share an export or a port. `pnpm screenshots:bauhaus`
builds into `out-bauhaus/` and serves it on :43118 while the default runs serve
`out/` on :43117, so a run cannot screenshot one theme and file it under the
other — and the committed PNGs of each theme live in directories of their own.

**Install the browser once** before the first Playwright run — the repo does not
vendor it:

```bash
pnpm exec playwright install chromium
```

Both Playwright projects (`desktop` 1440×1200, `mobile` Pixel 7 @ 375×812) are
Chromium, so `chromium` is the only download needed. `pnpm screenshots` uses two
separate projects (`screenshots-desktop` / `screenshots-mobile`) so a plain
`pnpm test:e2e` never rewrites the committed PNGs in `evidence/screenshots/`
(default theme) or `evidence/screenshots/bauhaus/`.

The current e2e result and the open product findings are recorded in
[`evidence/test-run.md`](./evidence/test-run.md) — read it before assuming a red
run is your fault.

## Directory map

```text
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx            # <html lang> + next/font (Outfit, JetBrains Mono)
│   │   ├── not-found.tsx         # 404 → exported as out/404.html
│   │   └── [locale]/             # every public, indexable page
│   ├── components/layout/        # SiteHeader / SiteFooter / MobileNav / BrandMark
│   ├── lib/
│   │   ├── i18n/                 # locale config + the only route builders
│   │   └── seo/                  # metadata, canonical, hreflang, JSON-LD
│   └── styles/globals.css        # the ONLY place design tokens are defined
└── tests/{unit,e2e}/
```

## Conventions worth knowing

- **Design tokens.** `src/styles/globals.css` is the single source of truth.
  Components consume semantic Tailwind utilities (`bg-canvas`, `text-foreground`,
  `border-foreground`, `shadow-hard-md`, `bg-accent-red`, `rounded-pill`).
  No hex values, arbitrary shadows or magic numbers in JSX.
- **Links.** Every internal href comes from `src/lib/i18n/routes.ts`. There are
  no `#` placeholder links; routes that do not exist yet are not rendered as
  links at all.
- **Static export.** `output: "export"`, `trailingSlash: false`,
  `images.unoptimized: true`. Every dynamic segment needs `generateStaticParams`
  and `dynamicParams = false`. There is no server runtime, no ISR, no redirects —
  the locale root uses a `<meta http-equiv="refresh">` plus a real link.
- **No route-level `loading.tsx`.** Deliberate, and enforced by
  `tests/e2e/no-js.spec.ts`. A `loading.tsx` is a Suspense boundary, and in a
  static export React prerenders the *fallback* into `<main>` while the real
  page is flushed at the end of `<body>` inside `<div hidden id="S:…">` and only
  moved into place by an inline `$RC(...)` script. With JavaScript off the page
  is then just `加载中`. Since every page resolves its data at build time there
  is nothing to wait for anyway. Observable loading states belong to client
  transitions and use `StateBlock variant="loading"`; `error.tsx` files stay.
- **Locales.** Only `zh-CN` is published. `en` is not translated and must not
  appear in routes, `alternates.languages` or copy until real content is merged.

## Data status (internal-beta fixture)

The internal-beta UI ships the typed fixture extracted from
`docs/wireframes/flow-proto.html`: **35 prompts, 21 creators, 11 models and 6
collections**, observed on `2026-08-20`. Pages read it only through the
`ContentRepository` boundary and derive every visible count from the current
fixture; prototype-declared library totals are retained as metadata but never
rendered as achieved counts. See `evidence/fixture-extraction.md` for the exact
merge rules and provenance.

This fixture is the complete wireframe-backed MVP, not the long-term
publication source. The shared `getContentRepository()` factory intentionally
stays fixture-only and client-safe; server-rendered preview entry points use the
isolated factory below.

### Local CMS preview data

The checked-in fixture remains the default and the production/static source.
For the internal beta only, server layouts/pages can import
`createServerContentContext` from `src/lib/content/server.ts`. Preview mode is
enabled only when all four server-side variables are present:

```bash
PSEO_CONTENT_SOURCE=cms-preview
PSEO_PREVIEW=1
PSEO_PREVIEW_API_BASE_URL=http://127.0.0.1:3001
PSEO_PREVIEW_API_TOKEN=<private bearer token>
```

The token must never use a `NEXT_PUBLIC_` name. Partial or invalid preview
configuration and API failures stop the preview build/request; they never fall
back to fixture content. The returned context exposes `mode` and `revision` so
the beta UI can display an explicit preview marker. Each context fetches and
validates one closed catalog envelope, then binds its repository to that single
revision.

CMS currently has no Article collection. In CMS preview mode only the prompt,
taxonomy, creator, model, collection and snapshot data come from CMS; blog
methods deliberately continue to use the unchanged wireframe blog fixture.

`NEXT_PUBLIC_SITE_URL` is unset, so canonical/OG URLs are built against the
placeholder origin `https://example.invalid`. Set the env var before a real
deploy.
