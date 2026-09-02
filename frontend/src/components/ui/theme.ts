/**
 * Which visual system this build ships, decided once at build time.
 *
 * The site has two complete themes. `neutral` is the default and the direction:
 * the prototype's own tokens (`docs/wireframes/flow-proto.html`) — a system
 * sans with PingFang SC for the Chinese glyphs, hairline translucent borders,
 * layered soft shadows, a 12px radius and a real dark mode — set out in the
 * design-engineering idiom (Emil Kowalski / Apple HIG). `bauhaus` is the
 * previous system from `specs/images/0008-bo-pseo-ui.md`, kept intact behind an
 * env var so the two can be compared side by side during the transition.
 *
 * **How the two themes differ is, wherever possible, a TOKEN decision and not a
 * component decision.** `SiteShell` stamps `data-theme` on the shell's root
 * element; `styles/globals.css` redefines the semantic tokens under
 * `:root:has([data-theme="bauhaus"])` and re-expresses the three
 * Bauhaus-specific idioms (hard offset shadow, flatten press, 2px/4px rules)
 * for the soft system there. That is deliberate: it means `elevationClassName`,
 * `dividerClassName` and `transitionClassName` emit the SAME class tokens in
 * both themes, so every component and every test that names a class keeps
 * working, and a `bauhaus` build is byte-identical to the pre-theme build.
 *
 * This module exists for the handful of decisions a stylesheet genuinely cannot
 * make — a decoration that should not render at all, a spine that changes
 * width, a press that changes kind. Reach for it only when the token layer
 * cannot express the difference.
 *
 * `NEXT_PUBLIC_*` is inlined by Next at build time, so reading it here is safe
 * from a server component and from a client leaf alike: there is no runtime
 * value crossing the boundary (`scripts/check-static-output.mjs` rule 9).
 */

export type ThemeName = "neutral" | "bauhaus";

/** An explicit light/dark choice. Absent means "follow the operating system". */
export type ColorSchemeOverride = "light" | "dark";

/**
 * `NEXT_PUBLIC_THEME=bauhaus` selects the old system. Anything else — unset,
 * empty, a typo — is the default `neutral`, so a misspelt env var can never
 * silently ship a half-configured page.
 */
export const THEME: ThemeName =
  process.env.NEXT_PUBLIC_THEME === "bauhaus" ? "bauhaus" : "neutral";

export const IS_BAUHAUS = THEME === "bauhaus";

/**
 * `NEXT_PUBLIC_COLOR_SCHEME=light|dark` pins the scheme for a build (the
 * screenshot runs use it). Unset is the third state: no attribute is rendered
 * at all and `prefers-color-scheme` decides. `bauhaus` is light-only by its own
 * spec, so an override is ignored there rather than producing a dark Bauhaus
 * page that no spec describes.
 */
export const COLOR_SCHEME: ColorSchemeOverride | undefined = IS_BAUHAUS
  ? undefined
  : process.env.NEXT_PUBLIC_COLOR_SCHEME === "dark"
    ? "dark"
    : process.env.NEXT_PUBLIC_COLOR_SCHEME === "light"
      ? "light"
      : undefined;

/**
 * Pick the value that belongs to the theme this build ships.
 *
 * Written as a function rather than as `IS_BAUHAUS ? a : b` at every call site
 * so a reader can grep one name and find every place the two systems actually
 * diverge in markup.
 */
export function byTheme<T>(values: { neutral: T; bauhaus: T }): T {
  return IS_BAUHAUS ? values.bauhaus : values.neutral;
}
