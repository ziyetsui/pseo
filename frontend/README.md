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

Gate before any delivery: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
`pnpm test:e2e` requires a prior `pnpm build` (Playwright's `webServer` runs
`serve out -l 3100`) and browsers installed via `pnpm exec playwright install`.

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
- **Locales.** Only `zh-CN` is published. `en` is not translated and must not
  appear in routes, `alternates.languages` or copy until real content is merged.

## Data status (fixture declaration)

This scaffold ships **no content data**. The typed fixture extracted from
`docs/wireframes/flow-proto.html` and the `ContentRepository` that pages read
from arrive in a later task. Until then pages state that content is not
connected instead of rendering placeholder counts or invented statistics.

`NEXT_PUBLIC_SITE_URL` is unset, so canonical/OG URLs are built against the
placeholder origin `https://example.invalid`. Set the env var before a real
deploy.
