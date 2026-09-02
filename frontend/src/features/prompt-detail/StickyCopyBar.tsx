import { buttonClassName } from "@/components/ui/Button";
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
 * The mobile action bar pinned to the bottom of the viewport.
 *
 * It is a plain presentational component (no state of its own) so both the
 * server-rendered page and the client provider that owns the substituted text
 * can render it. Hidden from `md` up, where the inline copy button is already
 * on screen.
 *
 * `position: sticky` (not `fixed`): a sticky element can only stay pinned
 * within the bounds of its own parent box, so as long as this is the LAST
 * child of the page's content wrapper it releases — scrolling away with the
 * rest of the page — right at the true end of the content, before the
 * `<SiteFooter>` that sits outside that wrapper. A `fixed` bar has no such
 * bound and would sit on top of the footer at the bottom of the scroll.
 * `-mx-4` cancels the wrapper's own `px-4` so the bar still reaches the
 * screen edges instead of being inset to the content column's width.
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
      className="sticky bottom-0 z-40 -mx-4 border-t-2 border-foreground bg-surface md:hidden"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{title}</p>
          <p className="truncate text-xs font-medium">{meta}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener nofollow"
            className={buttonClassName({ variant: "outline" })}
          >
            原帖 ↗<span className="sr-only">（在新标签页打开 X 原帖）</span>
          </a>
          <CopyPromptButton text={copyText} targetId={targetId} />
        </div>
      </div>
    </aside>
  );
}
