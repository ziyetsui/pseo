<!--
Document: Linear Website Design Token Reference
Status: Research reference; non-normative for this repository
Snapshot: 2026-09-03 (Asia/Shanghai)
Scope: Linear's public marketing and brand surfaces, not the authenticated product
Companion token file: ./linear-design-tokens.css
-->

# Summary

Linear's public website uses a restrained, product-led visual system built from near-black layered surfaces, soft off-white text, hairline borders, variable typography, and a narrow indigo accent range. The dominant dark canvas is **`#08090a`** — measured as the computed background of both `html` and `body` on all 28 dark routes surveyed on 2026-09-03. `#010102` is declared as `--color-bg-marketing` on every page's `:root` but is **painted on `/mobile` only**; the earlier draft of this document called it the site-wide marketing canvas, which the route survey disproves. Interface surfaces step through `#08090a`, `#0f1011`, `#141516`, and `#1c1c1f`, while primary text is `#f7f8f8` and the core brand implementation color is `#5e6ad2`. The visual character comes from luminance hierarchy, precise spacing, subtle grain and glow, compact radii, and product UI shown at high fidelity—not from saturated section fills or decorative card grids.

The landing page reads as one continuous product narrative: global navigation, a large editorial hero, an embedded product frame, customer logos, three benefit pillars, four product chapters, changelog proof, customer quotes, and a final CTA/footer. Motion is short and purposeful. High-frequency controls respond in roughly `100–160ms`; structural overlays use `180–250ms`; pressed buttons scale to `0.97`; and popovers animate from their trigger origin.

This is a dated reconstruction from Linear's public sources, not an official Linear token package. Linear's own StyleX article says the team did not have a formal design system and describes generated theme variables whose public names are hashed at build time. Use the semantic values below as a reference snapshot, never as a stable upstream API.

# Style

The style is quiet, technical, and editorial. Large Inter Variable headings use medium weights rather than heavy display weights. Dense product screenshots carry most of the visual detail, while the page shell stays dark and low-contrast. Borders are usually one device pixel, shadows are diffuse and restrained, and indigo is reserved for emphasis, links, focus, and primary actions. Marketing sections alternate through depth and lighting rather than abrupt color blocking.

## Spec

Create a dark, product-led SaaS interface inspired by Linear's public marketing language. Use `#010102` for the outer marketing canvas, `#08090a` for the primary UI surface, `#0f1011` and `#141516` for raised levels, `#23252a` for primary borders, `#f7f8f8` for primary text, `#d0d6e0` for secondary text, and `#8a8f98` for supporting copy. Reserve `#5e6ad2` / `#7170ff` for branded actions and accents. Set body and headings in Inter Variable with weights `400`, `510`, and `590`; use Berkeley Mono for code or system labels, and Tiempos Headline only as an optional editorial serif. Use a 12-column desktop grid, an effective content width of `1344px`, `46px` outer gutters on wide screens, `1px` hairline borders, and radii from `4px` to `16px` for ordinary UI. Keep frequent motion under `160ms`, use named transition properties with an ease-out curve, scale pressed buttons to `0.97`, and animate menus from their trigger origin. Product UI should be the hero visual; ambient grain, radial glow, and edge shine may support it at low opacity.

## Color tokens

### Official brand-guide values

| Token                         | Value                        | Evidence / caveat                                                                                                  |
| ----------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `brand.mercury-white`         | `#f4f5f8`; RGB `244 245 248` | Hex and RGB agree on the official brand page.                                                                      |
| `brand.nordic-gray`           | `#222326`                    | The copyable hex, displayed swatch, and official dark logo assets use this value.                                  |
| `brand.nordic-gray.rgb-label` | `35 35 38`                   | **Confirmed a page typo by measurement (2026-09-03).** The swatch tile on `/brand` paints `rgb(34, 35, 38)` = `#222326`, matching the printed hex. The printed RGB label `35, 35, 38` matches neither the paint nor the hex. Mercury White's tile agrees with both its hex and its RGB label. |
| `brand.primary`               | Subtle, desaturated blue     | The public brand guide describes it but does not publish a numeric value. Do not invent one.                       |

### Public-site semantic themes

| Role                  | Dark      | Light     | Glass       |
| --------------------- | --------- | --------- | ----------- |
| Primary background    | `#08090a` | `#ffffff` | `#000212`   |
| Secondary background  | `#1c1c1f` | `#f9f8f9` | `#ffffff08` |
| Tertiary background   | `#232326` | `#f4f2f4` | `#ffffff12` |
| Quaternary background | `#28282c` | `#eeedef` | `#ffffff26` |
| Quinary background    | `#282828` | `#e9e8ea` | `#ffffff33` |
| Marketing background  | `#010102` | —         | —           |
| Panel background      | `#0f1011` | —         | —           |
| Primary border        | `#23252a` | `#e9e8ea` | `#ffffff14` |
| Secondary border      | `#34343a` | `#e4e2e4` | `#ffffff1f` |
| Tertiary border       | `#3e3e44` | `#dcdbdd` | `#ffffff26` |
| Primary text          | `#f7f8f8` | `#282a30` | `#f7f8f8`   |
| Secondary text        | `#d0d6e0` | `#3c4149` | `#b4bcd0`   |
| Tertiary text         | `#8a8f98` | `#6f6e77` | `#b4bcd099` |
| Quaternary text       | `#62666d` | `#86848d` | `#b4bcd066` |
| Brand background      | `#5e6ad2` | `#7070ff` | `#5e6ad2`   |
| Accent                | `#7170ff` | `#7170ff` | —           |
| Accent hover          | `#828fff` | `#8989f0` | —           |
| Accent tint           | `#18182f` | `#f1f1ff` | —           |

The dark surface ladder is `#08090a` → `#0f1011` → `#141516` → `#191a1b`. The corresponding line ladder is `#37393a`, `#202122`, `#18191a`, and `#141515`. These close values are intentional: hierarchy is communicated through small luminance shifts rather than strong outlines.

### Shared primitives

| Name     | Value     | Typical role                                    |
| -------- | --------- | ----------------------------------------------- |
| White    | `#ffffff` | Inverse text and icons                          |
| Black    | `#000000` | Mixing and overlays                             |
| Blue     | `#4ea7fc` | Informational state; wide-gamut overrides exist |
| Red      | `#eb5757` | Destructive / error                             |
| Green    | `#27a644` | Success                                         |
| Orange   | `#fc7840` | Warning / activity                              |
| Yellow   | `#f0bf00` | Warning                                         |
| Indigo   | `#5e6ad2` | Brand primitive                                 |
| Teal     | `#00b8cc` | Informational accent                            |
| Plan     | `#68cc58` | Product-area accent                             |
| Build    | `#d4b144` | Product-area accent                             |
| Security | `#7a7fad` | Product-area accent                             |

## Typography tokens

Font stacks:

- Sans: `"Inter Variable", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ...`
- Mono: `"Berkeley Mono", ui-monospace, "SF Mono", Menlo, monospace`
- Editorial serif: `"Tiempos Headline", ui-serif, Georgia, Cambria, serif`
- OpenType settings: `"cv01", "ss03"`; variable setting: `"opsz" auto`
- Available weights declared in the stylesheet: light `300`, normal `400`, medium `510`, semibold `590`, bold `680`
- **Weights actually rendered across the route survey add `500` and `900`**: `500` on the product-feature H1s (`/ai`, `/plan`, `/build`, `/intake`), `900` on `/switch`. The declared list is the token set, not the full set of values in use.

The supplied stylesheet loads Inter Variable normal and italic at `100–900`, plus Berkeley Mono Variable at `100–900`, and names Tiempos Headline as a token without including its `@font-face` in that bundle. **The serif nevertheless renders in production**: the route survey found `Tiempos Headline` resolving on exactly one element site-wide — the `/method` H1 (see §Route survey). Berkeley Mono resolves on 6 of 29 routes.

| Title token | Size   | Line height | Tracking   | Weight |
| ----------- | ------ | ----------- | ---------- | ------ |
| `title-1`   | `17px` | `1.4`       | `-0.012em` | `590`  |
| `title-2`   | `20px` | `1.33`      | `-0.012em` | `590`  |
| `title-3`   | `24px` | `1.33`      | `-0.012em` | `590`  |
| `title-4`   | `32px` | `1.125`     | `-0.022em` | `590`  |
| `title-5`   | `40px` | `1.1`       | `-0.022em` | `590`  |
| `title-6`   | `48px` | `1`         | `-0.022em` | `590`  |
| `title-7`   | `56px` | `1.1`       | `-0.022em` | `590`  |
| `title-8`   | `64px` | `1.06`      | `-0.022em` | `590`  |
| `title-9`   | `72px` | `1`         | `-0.022em` | `590`  |

| Body token     | Size   | Line height              | Tracking   |
| -------------- | ------ | ------------------------ | ---------- |
| `text-large`   | `17px` | `1.6`                    | `0`        |
| `text-regular` | `15px` | `1.6`                    | `-0.011em` |
| `text-small`   | `14px` | `1.5` (`21px` at `14px`) | `-0.013em` |
| `text-mini`    | `13px` | `1.5`                    | `-0.01em`  |
| `text-micro`   | `12px` | `1.4`                    | `0`        |
| `text-tiny`    | `10px` | `1.5`                    | `-0.015em` |

## Geometry, elevation, and motion

- Radius set: `4px`, `6px`, `8px`, `12px`, `16px`, `24px`, `32px`, pill `9999px`, circle `50%`.
- Hairline: `1px`, reduced to `0.5px` on 2× / 192dpi displays.
- Dark shadows: low `0px 2px 4px #0000001a`; medium `0px 4px 24px #0003`; high `0px 7px 32px #00000059`.
- Light shadows: tiny `0px 1px 1px 0px #00000017`; low `0px 1px 4px -1px #00000017`; medium `0px 3px 12px #00000017`; high `0px 7px 24px #0000000f`.
- Timing: highlight in `0ms`, highlight out `150ms`, quick `100ms`, regular `250ms`.
- Primary ease-out: `cubic-bezier(0.25, 0.46, 0.45, 0.94)`.
- Emphatic ease-out: `cubic-bezier(0.23, 1, 0.32, 1)`.
- Structural in-out: `cubic-bezier(0.455, 0.03, 0.515, 0.955)`.

# Layout

A vertically sequenced marketing page on a continuous dark canvas. It avoids a generic bento-card composition: each chapter gets enough vertical space to explain one product idea, with full-width dividers, oversized type, precise diagrams, and framed product UI.

## Global frame and responsive grid

- Header: measured **73px** on desktop (72px + a 1px hairline border) and `64px` at `≤640px`. Its computed `background-color` is **`rgba(0,0,0,0)` — fully transparent** — and the translucency comes entirely from `backdrop-filter: blur(20px)`. 26 of the 29 surveyed routes render the 73px blurred header; `/docs` and `/developers` render a 64px header with no blur.
- Generic content: `24px` inline padding, `64px` block padding, `1024px` maximum width, `624px` prose width.
- Homepage frame: `1344px` base width plus outer gutters; `32px` inset, reduced to `8px` at `≤1024px`.
- Outer gutters: `46px` above `1280px`, `10px` from `1025–1280px`, `28px` from `641–1024px`, and `16px` at `≤640px`.
- Grid: 12 columns on desktop, 8 at `≤768px`, and 4 at `≤640px`.
- Minimum tap target: `44px`.
- No canonical global spacing scale was exposed. Do not promote incidental computed gaps into official spacing tokens.

## Navigation

A restrained sticky/fixed header over the marketing canvas. The logo anchors the left; primary product/company links occupy the middle; sign-in and a compact high-contrast CTA sit on the right. Desktop flyouts behave like floating glass panels: dark translucent surface, hairline border, rounded shell, blur, and a short origin-aware reveal. Mobile collapses to a dedicated menu and disables the desktop hover choreography.

## Hero

Large centered editorial copy uses Inter Variable around `64px` on desktop, `56px` at tablet widths, and `38px` on small screens, with weight `510`, line-height `1`, and approximately `-0.022em` tracking. A compact CTA pair follows. The product is then shown in a wide simulated application frame rather than an abstract illustration.

The observed hero frame is approximately `1320 × 720px`, with `8px` frame padding, a `232px` simulated sidebar, a `12px` outer radius, a `6px` inner wrapper radius, frame background `#101112`, application background `#090a0b`, and border `#ffffff14`. Subtle grain, radial illumination, and edge shine add depth without obscuring product content.

## Customer proof and benefit pillars

A quiet customer-logo strip bridges the hero to three benefit pillars. Logos are monochrome and secondary to the product message. The pillars present speed, focus, and workflow value as editorial columns with modest icons and restrained separators rather than elevated marketing cards.

## Product chapters

Four long-form chapters—Intake, Planning, AI, and Build—repeat a stable rhythm: eyebrow or index, concise headline, explanatory copy, then a purpose-built product visualization. Each chapter can introduce a local accent, but it inherits the global near-black surface ladder, typography, hairlines, and motion grammar.

## Changelog and testimonials

The changelog turns product velocity into proof with compact release entries and metadata. Testimonials follow as a controlled quote system: high-contrast quote text, secondary attribution, company identity, and subtle navigation.

**Correction (2026-09-03 route survey).** An earlier draft said both sections "continue the same page canvas rather than switching to ornamental color blocks." That is wrong for testimonials. The customer card (`Dc5tqa_customerCard`) takes **the quoted customer's own brand colour as its card background** — measured `#e4f222` on `/ai`, `/startups` and `/customers`, `#ff5900` on `/enterprise` (its class is literally `wvh1xa_brexBackground`), `#c3b5f8` on `/intake`. This is the one place saturated colour enters the system, and it is keyed to the customer being quoted, not to Linear's own palette. Treat it as a per-quote identity slot, not a campaign accent.

## Final CTA and footer

The final CTA returns to large, centered type and a small number of actions. The footer uses a calm multi-column information hierarchy, subdued text, and hairline separation. Keep legal and secondary navigation visually quiet; do not compete with the CTA.

# Components

## Button

| Size    | Height | Icon   | Font   | Horizontal padding | Gap   |
| ------- | ------ | ------ | ------ | ------------------ | ----- |
| Mini    | `24px` | `12px` | `12px` | `10px`             | `4px` |
| Small   | `32px` | `16px` | `13px` | `12px`             | `8px` |
| Medium  | `40px` | `16px` | `13px` | `14px`             | `8px` |
| Default | `40px` | `18px` | `15px` | `16px`             | `6px` |
| Large   | `44px` | `18px` | `16px` | `20px`             | `6px` |

Use named transition properties over `160ms` with the ease-out-quad curve. Primary buttons brighten to roughly `115%` on hover and settle near `98%` brightness plus `scale(0.97)` while pressed. Gate hover-only effects behind `(hover: hover) and (pointer: fine)` so touch input does not inherit desktop hover behavior.

## Tooltip

Use the primary surface, primary border, `8px` radius, high shadow, `280px` maximum width, `6px 8px` padding, and `12px/17px` text. Reveal through opacity plus `scale(0.9 → 1)` over `120ms` with ease-out-quad. Set `transform-origin` from the trigger/placement direction. After the first tooltip in a related sequence, subsequent tooltip reveals should be effectively instant to support scanning.

## Navigation popover

Use a `#08090ae6` shell, `32px` backdrop blur, `#ffffff14` border, `14px` radius, and `0 8px 32px #08090a` shadow. Reveal over about `180ms` with opacity plus `scale(0.98 → 1)`. When content changes in place, resize the viewport over about `220ms`; sibling panels may translate by approximately `48px` using the in-out-quad curve to preserve direction.

## Product UI frame

Treat the frame as a real interface demonstration, not a decorative dashboard. Preserve UI density, hierarchy, and plausible states. Use a `12px` outer shell, `8px` inset, `6px` inner radius, low-opacity hairlines, layered near-black surfaces, a restrained sidebar, and optional grain/radial glow. Motion inside the frame should explain workflows or state changes; it should not continuously animate for atmosphere.

# Route survey

Added 2026-09-03. Method: headless Chromium at 1440×1000, `waitUntil: domcontentloaded` plus a
1.4s settle, then one fixed computed-style probe per route. 29 routes, enumerated from the
in-page link graph on `/about` rather than guessed. Every number below is a computed value read
off the rendered page, not a value read out of the stylesheet — where the two disagree, this
section says so.

**Why this section exists.** The rest of this document was written from the homepage plus a
fingerprinted CSS bundle, and its own DO-NOT list warns that it does not cover every route. It
turned out that four of its claims were homepage-shaped generalisations that the other 28 routes
contradict. Those are corrected in place above; the evidence is here.

## Theme distribution

28 of 29 routes render `data-theme="dark"` with `html` and `body` both computed to
`rgb(8, 9, 10)` = `#08090a`.

**`/switch` is the only light page on the marketing site** — `data-theme="light"`, body
`#ffffff`. It is also the only route using weight `900`, at a 118px H1 with `-0.015em`
tracking. Read it as a deliberate outlier: a competitor-comparison page that steps outside
the system to signal it is a different kind of argument.

## The H1 tier ladder

The clearest undocumented pattern. H1 size is a function of the page's rank in the site, not of
its content, and it lands on six steps. Tracking is a uniform `-0.022em` at every step from 32px
to 72px (measured: -0.704px at 32, -0.88px at 40, -1.056px at 48, -1.408px at 64, -1.584px at 72).

| Size | Weight | Line height | Routes | Role |
| --- | --- | --- | --- | --- |
| `128px` | `400` | `1.0` | `/method` | The manifesto. Serif, centred, **tracking `normal`** — the only page that opts out of negative tracking entirely |
| `118px` | `900` | `0.9` | `/switch` | Competitor comparison. Light theme, `-0.015em` |
| `72px` | `500`–`510` | `1.0` | `/agents` `/ai` `/plan` `/build` `/intake` | Product-feature pages |
| `64px` | `510` (`590` on `/insights`) | `1.0` left-aligned, `1.06` centred | `/` `/about` `/careers` `/security` `/enterprise` `/startups` `/asks` `/customer-requests` `/coding-sessions` `/insights` | Flagship pages |
| `48px` | `510` (`590` on `/mobile`) | `1.0` | `/pricing` `/customers` `/now` `/changelog` `/contact` `/mobile` | Index and utility pages |
| `40px` | `510`–`590` | `1.1` | `/brand` `/quality` `/integrations` `/developers` `/docs` | Reference pages |
| `32px` | `590` | `1.125` | `/download` | Single-purpose page |

Two line-height families at the same size: left-aligned 64px H1s set `1.0`, centred ones set
`1.06`. The centred variant needs the extra leading because it wraps to more lines.

## The editorial exception: `/method`

The one page that leaves the system, and the only consumer of the serif token.

- H1 `Practices for building` — **Tiempos Headline, 128px, weight `400`, line-height `1.0`,
  tracking `normal`**, centred. It is the single element on the entire surveyed site that
  resolves to the serif family.
- Body: `17px / 27.2px` (1.6), weight `400`, tracking `normal`.
- Measure: **410px** — far below the `624px` prose token, and the narrowest measure found.
- Document height 2701px: the shortest long-form page, and roughly a ninth of `/changelog`.

The lesson for an adaptation is not "add a serif." It is that the system reserves one typeface
and one page for the argument that is about beliefs rather than features, and spends nothing
else on it.

## Geometry in practice

- **Widest container: `1436px`.** That is `1344 + 46 × 2` — the homepage frame plus its outer
  gutters, exactly as the token file's arithmetic predicts. Confirmed on 21 of 29 routes.
  `/docs` and `/developers` cap at `1024px`, matching `--page-max-width`.
- **Radii actually painted, by frequency:** `9999px` (1042), `8px` (426), `4px` (234),
  **`5px` (186)**, `12px` (183), **`999px` (131)**, `6px` (63), `50%` (43), `24px` (37).
  `5px` and `999px` are **not in the documented radius set**; `999px` is a second pill value
  used alongside `9999px`. Do not treat the documented ladder as exhaustive.
- **Header:** 73px (72 + 1px hairline), `background-color: rgba(0,0,0,0)`,
  `backdrop-filter: blur(20px)`, on 26 of 29 routes. `/docs` and `/developers` use a 64px
  header with no blur — the documentation surfaces have their own chrome.

## Colour in practice

- `--color-bg-marketing: #010102` is declared on `:root` of every page and **painted on
  `/mobile` only** — one 1440×7245 full-page wrapper plus two `bentoGrid` cards. Everywhere
  else the canvas is `#08090a`.
- `rgba(255,255,255,0.05)` is the dominant surface on `/docs` and `/developers` — those two
  build their cards from a translucent white wash rather than from the opaque surface ladder.
- `/ai` and `/build` use wide-gamut `color(srgb …)` syntax for their panel fills, alongside
  the hex ladder.
- **Saturated colour enters only through customer testimonial cards** — see the correction in
  §Changelog and testimonials. It belongs to the customer, not to Linear.

## Font usage across routes

| Family | Routes | Where |
| --- | --- | --- |
| Inter Variable | 29 / 29 | Everything |
| Berkeley Mono | 6 / 29 | `/` `/changelog` `/quality` `/enterprise` `/agents` `/coding-sessions` — release metadata, code, system labels |
| Tiempos Headline | 1 / 29 | `/method` H1 only |

## What this survey does not cover

Motion, hover and focus behaviour were not probed — the values in §Geometry, elevation, and
motion still come from the stylesheet, not from observed interaction. Nothing here was measured
at mobile widths; every number is from a single 1440px viewport. Authenticated product UI remains
out of scope, as stated in the DO-NOT list.

# Special Notes

## MUST

- MUST preserve the near-black/off-white luminance hierarchy; small surface shifts are a core part of the look.
- MUST reserve indigo for focus, links, selection, and high-value actions rather than flooding sections with it.
- MUST use variable font weights such as `510` and `590`; substituting only conventional `500`/`600` changes the tone.
- MUST keep borders at one device pixel, including the `0.5px` high-density hairline where the rendering environment supports it.
- MUST list the exact CSS properties being transitioned; do not use `transition: all`.
- MUST keep high-frequency feedback short and reversible, with pressed states responding immediately.
- MUST gate hover motion to fine pointers and provide visible keyboard focus.
- MUST add a complete `prefers-reduced-motion` adaptation when reusing these patterns: retain color/opacity feedback, but remove nonessential scale, translation, smooth scrolling, and repeated animation.

## DO NOT

- DO NOT describe this document or its companion CSS as an official, stable, or complete Linear design system.
- DO NOT copy hashed `--sx-*` variables; they are generated implementation details and may change on every build.
- DO NOT import the few-shot's Neo-Brutalist yellow, sage, 2px black borders, hard shadows, or translate-to-press behavior. The few-shot defines output structure only.
- DO NOT infer a global spacing scale from the automated extractor's computed-style samples.
- DO NOT assume the marketing snapshot covers Linear's authenticated product UI, every route, or every runtime-generated theme.
- DO NOT overuse gradients, glass blur, grain, or glow. They support hierarchy and product framing; they are not the primary visual language.

## Emil design-engineering interpretation

The observed system aligns with Emil's interaction guidance: frequent actions are fast, press feedback is physical but small, menus reveal from their source, tooltip latency drops during a scanning sequence, and richer movement is reserved for structural transitions or product explanation. A faithful adaptation should prioritize `transform` and `opacity`, keep quick control feedback below roughly `300ms`, and avoid motion that does not explain state, direction, or causality.

Reduced-motion support in the captured public CSS is partial rather than universal. Smooth scrolling, mobile-menu movement, header navigation, and some benefit motion are guarded, while base button press and tooltip scale rules do not show a local guard in the supplied bundle. The stronger reduced-motion rule above is an adaptation recommendation, not a claim about complete upstream behavior.

## Evidence and confidence

| Source                                                                                                                                                                                                                                                     | What it supports                                                                           | Confidence                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| [Linear brand guide](https://linear.app/brand)                                                                                                                                                                                                             | Official logo/color guidance and downloadable assets                                       | High for published brand values; note the Nordic Gray mismatch     |
| [Linear StyleX article](https://linear.app/now/styling-linear-for-the-future-stylex)                                                                                                                                                                       | Token architecture, theming approach, generated variables, and historical context          | High for architecture described by Linear                          |
| [Public fingerprinted stylesheet](https://static.linear.app/web/_next/static/css/index.A3R_Thg4.css)                                                                                                                                                       | Exact public-site semantic values, type, layout, and motion primitives                     | High for this dated build; low as a future compatibility promise   |
| [Button CSS](https://static.linear.app/web/_next/static/css/Button.dcAi4KbO.css), [Tooltip CSS](https://static.linear.app/web/_next/static/css/Tooltip.mgHd0F-S.css), and [Header CSS](https://static.linear.app/web/_next/static/css/Header.52ZtgjCi.css) | Exact button sizes/states, tooltip geometry/motion, and shared navigation-popover behavior | High for the captured component builds; fingerprints are ephemeral |
| [Homepage Header CSS](https://static.linear.app/web/_next/static/css/Header.D8jOAph5.css)                                                                                                                                                                  | Homepage-specific header and navigation presentation                                       | High for the captured homepage build; fingerprint is ephemeral     |
| Rendered public pages at desktop, dark, and mobile viewports                                                                                                                                                                                               | Visual hierarchy, section order, and responsive behavior                                   | Medium-high; routes and experiments can change                     |
| Automated computed-style extraction                                                                                                                                                                                                                        | Cross-check only: Inter Variable, two visible colors, and sampled gaps                     | Low coverage; it missed most theme variables, radii, and shadows   |

| Route survey: 29 routes probed headless at 1440×1000 (2026-09-03) | Per-route theme, H1 tier, header geometry, painted radii, font resolution, canvas colour | High for this date and this viewport; single-viewport, no interaction, no authenticated UI |

Snapshot date: `2026-09-03`. The supplied stylesheet was `51,447` bytes with SHA-256 `b156e539925495ebe5a37bbced82713ea8b60bafecf62a951e16e47735dbde4c`. Its fingerprinted URL and all implementation values may change without notice. The companion [`linear-design-tokens.css`](./linear-design-tokens.css) is a readable subset for inspection and prototyping; it is not wired into this repository's frontend and does not supersede `specs/0010-pseo-frontend-design-system.md`.

Tags: `dark`, `editorial`, `product-led`, `precision`, `indigo`, `variable-type`, `hairline`, `saas-landing`.
