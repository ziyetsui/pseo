import { cx } from "./class-names";

/**
 * The type scale: one ladder, seven rungs, and a rule about which script each
 * device belongs to.
 *
 * ## Why a ladder and not a ramp
 *
 * A continuous ramp (14 / 16 / 18 / 20 / 24…) produces steps too small to read
 * as hierarchy: forty cards set one notch apart look like forty cards set the
 * same. What ships here is a modular ladder — every rung is ~1.2× the one below
 * it — and each rung belongs to exactly ONE role, so two things at the same
 * size are always the same KIND of thing.
 *
 *   role                        mobile → desktop
 *   pageTitleClassName          36 → 60   the page's own H1
 *   recordTitleClassName        30 → 48   a record's H1 (a prompt, an article)
 *   figureClassName             30 → 48   a standalone numeral
 *   displayTitleClassName       24 → 36   a card poster title  (tier 1)
 *   sectionTitleClassName       20 → 24   a band / section H2
 *   singleLineTitleClassName    16        a card's principal link (tier 2)
 *   controlLabelClassName       14        a control's label     (tier 4)
 *   microLabelClassName         12        metadata              (tier 3)
 *
 * Before this, six display sizes shipped behind three tokens: tier 1 was
 * size-identical to every section H2 (the one comparison the tier exists to
 * win), the section heading and the card poster fought at both breakpoints, and
 * the site's most-used label style — a 14px uppercase control label, ten call
 * sites — had no name at all, so two 12px cousins had already drifted off it.
 * Naming the fourth tier and pulling tier 1 a full step above the section
 * heading is what makes the ladder rankable again.
 *
 * ## Why the hierarchy is not carried by weight
 *
 * Outfit is loaded latin-only, so every Chinese glyph on this site renders from
 * the fallback stack (PingFang SC, Hiragino Sans GB, Microsoft YaHei). PingFang
 * exposes nothing above Semibold and YaHei has only Regular and Bold, so
 * `font-medium` / `font-bold` / `font-black` collapse to two faces — or one.
 * A three-weight ladder is a Latin-only mechanism on a Chinese-language site.
 *
 * So weight is never the separator here. Every rung differs from its
 * neighbours in SIZE first; case (a no-op on CJK, real on any Latin fragment),
 * leading and the label tracking do the rest. Where a weight is still declared
 * it is an enhancement for the Latin runs, never the thing the hierarchy rests
 * on — which is why tier 2 moved from 14px (the size of the body copy and of
 * the monospace prompt sitting directly beneath it, separated from both by
 * weight alone) up to a real 16px step.
 *
 * ## Why tracking has a script
 *
 * Letter-spacing is a Latin device. Opening 11–12px Latin caps to 0.16em is
 * what turns a dense bold run into a label somebody designed; applying the same
 * 0.16em to 標籤文字 produces 疏排 — text that reads as spaced-out prose, not as
 * a label — and it costs ~16% of the run's width, which is what pushed card
 * meta rows onto a second line. So the label tracking token is now the step
 * BOTH scripts can wear, and the wide Latin step is opt-in per call:
 * `{ script: "latin" }` on a label whose text is Latin or digits.
 *
 * These are class helpers rather than components because a title's ELEMENT is
 * the caller's decision (heading levels must stay continuous per page, and some
 * of these rungs sit on a `<span>` or a `<p>`). The rung decides weight, size,
 * leading, tracking and overflow; nothing else.
 */

/**
 * Which script the run is written in. `cjk` is the default because this site
 * publishes `zh-CN`; `latin` is the opt-in for a taxonomy slug, a model name, a
 * unit or a run of digits.
 */
export type Script = "cjk" | "latin";

export interface TypeScaleOptions {
  script?: Script;
}

/**
 * Display tracking. −0.05em (`tracking-tighter`) rides fine on 48px Outfit,
 * where the sidebearings are generous; CJK glyphs have almost none to give, and
 * at 48px that is 2.4px taken out from between characters that were designed to
 * sit on a fixed em body. `tracking-tight` (−0.025em) is the CJK default and
 * still tightens a Latin headline noticeably.
 */
const DISPLAY_TRACKING: Record<Script, string> = {
  cjk: "tracking-tight",
  latin: "tracking-tighter",
};

/**
 * Label tracking. `tracking-micro` is the token (see `globals.css`) — no caller
 * ever types the number. `tracking-micro-latin` is the wide Latin step.
 */
const LABEL_TRACKING: Record<Script, string> = {
  cjk: "tracking-micro",
  latin: "tracking-micro-latin",
};

/* -------------------------------------------------------- display register */

/**
 * The page's own H1 — the top of the ladder, one per page, never reused for
 * anything inside the content.
 */
export function pageTitleClassName(className?: string, options: TypeScaleOptions = {}): string {
  const { script = "cjk" } = options;
  return cx(
    "text-4xl leading-none font-black md:text-6xl",
    DISPLAY_TRACKING[script],
    className,
  );
}

/**
 * A record's own H1: the prompt on L4, the article on a blog post. One rung
 * below the page title because the page title is the site talking and this is
 * the record talking.
 */
export function recordTitleClassName(className?: string, options: TypeScaleOptions = {}): string {
  const { script = "cjk" } = options;
  return cx(
    "text-3xl leading-tight font-black md:text-5xl",
    DISPLAY_TRACKING[script],
    className,
  );
}

/**
 * A standalone numeral — a metric, a tile's count, a ghost ordinal.
 *
 * Shares the record rung's size and takes `leading-none`, which is safe here
 * and only here: digits have no descenders, so nothing is clipped at a
 * line-height of 1. It carries no clamp, because a figure can never reach two
 * lines and a `line-clamp` riding along on one is dead weight.
 */
export function figureClassName(className?: string): string {
  return cx(
    "text-3xl leading-none font-black tracking-tight tabular-nums md:text-5xl",
    className,
  );
}

const NARROW_CLAMP: Record<2 | 3 | 4, string> = {
  2: "line-clamp-2",
  3: "line-clamp-3 sm:line-clamp-2",
  4: "line-clamp-4 sm:line-clamp-2",
};

export interface DisplayTitleOptions extends TypeScaleOptions {
  /**
   * Lines the title may take BELOW `sm`; two from `sm` up either way.
   *
   * Two lines is a poster title's budget at a normal card width. The one
   * reason to spend more is a phone-width half-row cell that has also given a
   * quarter of itself to a spine: a 24px CJK line holds two or three
   * characters there, so a two-line clamp cuts a seven-character collection
   * name in half — and the name is the whole reason that tile exists. Four is
   * the ceiling, and the clamp is what makes the tier safe, so it is moved,
   * never removed. A taller clamp costs nothing where the title already fits:
   * it truncates, it does not reserve.
   */
  narrowLines?: 2 | 3 | 4;
}

/**
 * Tier 1 — the card poster title. Clamped to two lines.
 *
 * The clamp is part of the tier, not an extra: a display title is only allowed
 * to be a poster because it can never grow past a fixed number of lines and
 * shove the rest of the card down.
 *
 * `leading-tight` rather than `leading-none`: at a line-height of 1 the
 * `-webkit-box`'s own `overflow: hidden` clips at the em box, so a Latin
 * descender (g, y, p, Q) on the LAST VISIBLE line loses a pixel or two of ink —
 * and the tier's Latin callers are exactly the taxonomy labels full of them.
 * Digits keep `leading-none` in `figureClassName`, where nothing descends.
 */
export function displayTitleClassName(
  className?: string,
  options: DisplayTitleOptions = {},
): string {
  const { script = "cjk" } = options;
  return cx(
    NARROW_CLAMP[options.narrowLines ?? 2],
    "text-2xl leading-tight font-black md:text-4xl",
    DISPLAY_TRACKING[script],
    className,
  );
}

/**
 * A band or section H2 — the label over a group of cards.
 *
 * It sits a full rung BELOW the poster title on purpose. A heading and the
 * cards under it are not competing for the same job: the heading says what the
 * group is, and the reader only needs it once, whereas the poster title is the
 * thing being chosen between. Setting them at the same size (which is what
 * shipped) makes the band read as one undifferentiated wall of large type.
 */
export function sectionTitleClassName(className?: string, options: TypeScaleOptions = {}): string {
  const { script = "cjk" } = options;
  return cx(
    "text-xl leading-tight font-black md:text-2xl",
    DISPLAY_TRACKING[script],
    className,
  );
}

/* ------------------------------------------------------------ text register */

/**
 * Tier 2 — a card's principal link. Bold, and ALWAYS truncated: a card whose
 * title is allowed to wrap is a card whose height depends on its title, which
 * is what makes a grid of them ragged. The full string stays in the DOM (and so
 * in the accessible name and in find-in-page); only the painted line is cut.
 *
 * 16px, not 14px. At 14px it was the same size as the body copy around it and
 * as the monospace prompt directly beneath it, with `font-bold` versus
 * `font-medium` as the only separator — a separator that does not render on
 * CJK. A card's main link is the thing a reader is meant to land on; it gets
 * the size step instead.
 */
export function singleLineTitleClassName(className?: string): string {
  return cx("truncate text-base font-bold", className);
}

/**
 * Tier 4 — the control label. 14px, upper case, the label tracking.
 *
 * This is the site's most-used label style and until now it had no name, so it
 * was hand-typed at ten call sites (buttons, section actions, the anchor bar,
 * the trending tabs, the header nav, the search submit) and two 12px cousins
 * had already drifted off it. It is one rung above the micro label because a
 * control is something you act on and metadata is something you read.
 */
export function controlLabelClassName(className?: string, options: TypeScaleOptions = {}): string {
  const { script = "cjk" } = options;
  return cx("text-sm font-bold uppercase", LABEL_TRACKING[script], className);
}

/**
 * Tier 3 — the micro label. Every piece of metadata on the site: the smallest
 * rung, upper case, opened to the label tracking token.
 *
 * `uppercase` is a no-op on CJK glyphs, so a Chinese label keeps its characters
 * and gains only the tracking — which is why the tracking has to be a step CJK
 * can actually wear. It is `tracking-micro` by default; `{ script: "latin" }`
 * swaps in the wide `tracking-micro-latin` step for a Latin or all-digit label,
 * where the extra air is what makes the difference between a label and a run of
 * small bold text.
 *
 * `font-bold`, not `font-black`: 900 and 700 resolve to the same PingFang face,
 * so asking for 900 bought nothing on the language this site publishes in while
 * implying a weight step that does not exist. Size and case carry the tier.
 */
export function microLabelClassName(className?: string, options: TypeScaleOptions = {}): string {
  const { script = "cjk" } = options;
  return cx("text-xs font-bold uppercase", LABEL_TRACKING[script], className);
}
