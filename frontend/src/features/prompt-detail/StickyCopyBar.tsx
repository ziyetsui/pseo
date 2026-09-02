import { buttonClassName } from "@/components/ui/Button";
import { dividerClassName } from "@/components/ui/dividers";
import { CopyPromptButton } from "@/features/prompt/CopyPromptButton";

export interface StickyBarInfo {
  title: string;
  /** Secondary line, e.g. `GPT Image 2 · @Naiknelofar788`. */
  meta: string;
  sourceUrl: string;
}

export interface StickyCopyBarProps extends StickyBarInfo {
  /** Exactly what the copy button writes — already variable-substituted. */
  copyText: string;
  targetId: string;
}

/**
 * The action bar pinned to the bottom of the viewport, at EVERY width.
 *
 * It is a plain presentational component (no state of its own) so both the
 * server-rendered page and the client provider that owns the substituted text
 * can render it.
 *
 * **No breakpoint gate.** It used to be `md:hidden`, on the reasoning that
 * "the inline copy button is already on screen" — a claim about the first
 * ~900px of a 3,500px page. For the remaining ~2,650px, which is exactly
 * where the reader decides (the variable picker, the source record, the
 * numbers, the parameters), the desktop reader had no copy action at all and
 * the artifact the whole page exists to hand over was two thousand pixels
 * behind them. The wireframe prototype's bottom bar carries no breakpoint gate
 * either, so showing it everywhere is the more faithful reading, not the less.
 * The inline payload button is suppressed below `md` instead, where this bar
 * sits ~185px away from it and the two identical red buttons were visible in
 * one viewport.
 *
 * `position: sticky` (not `fixed`): a sticky element can only stay pinned
 * within the bounds of its own parent box, so as long as this is the LAST
 * child of the page's content wrapper it releases — scrolling away with the
 * rest of the page — right at the true end of the content, before the
 * `<SiteFooter>` that sits outside that wrapper. A `fixed` bar has no such
 * bound and would sit on top of the footer at the bottom of the scroll.
 * `-mx-4` cancels the wrapper's own `px-4` so the bar still reaches the
 * screen edges instead of being inset to the content column's width.
 *
 * **Nothing in here may be `shrink-0`.** The bar carries a status region whose
 * longest string is the copy FAILURE message (复制失败，可选中文本手动复制,
 * ~168px), which only appears after a click — so no static crawl and no
 * Playwright assertion on a freshly loaded page can see it, and it shipped
 * pushing the whole page into horizontal overflow at 320 and 375. The fix is
 * structural rather than a width guess: every level of this bar wraps
 * (`flex-wrap`), every flex item may shrink (no `shrink-0`, explicit
 * `min-w-0`), and every string in it is either truncated or freely wrappable.
 * The bar therefore cannot overflow whatever string it is handed, at any
 * width — which is the only version of this that stays fixed.
 */
export function StickyCopyBar({
  title,
  meta,
  sourceUrl,
  copyText,
  targetId,
}: StickyCopyBarProps) {
  return (
    <aside
      aria-label="本页快捷操作"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      className={dividerClassName("card", "top", {
        desktopThick: false,
        className: "sticky bottom-0 z-40 -mx-4 bg-surface",
      })}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2">
        {/* `basis-32` + `flex-1`: the record line takes what is left of the row
            and gives it all back when the actions need a line of their own. */}
        <div className="min-w-0 flex-1 basis-32">
          <p className="truncate text-sm font-bold">{title}</p>
          <p className="truncate text-xs font-medium">{meta}</p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener nofollow"
            className={buttonClassName({ variant: "outline" })}
          >
            查看原帖<span className="sr-only">（在新标签页打开 X 原帖）</span>
          </a>
          <CopyPromptButton text={copyText} targetId={targetId} />
        </div>
      </div>
    </aside>
  );
}
