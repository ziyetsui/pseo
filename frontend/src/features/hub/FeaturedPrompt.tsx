import { buttonClassName } from "@/components/ui/Button";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { MEDIA_SIZES } from "@/components/ui/media-sizes";
import { formatCreatorHandle } from "@/lib/content";
import type { PromptSummary } from "@/lib/content/types";
import { formatThousands } from "@/lib/format/numbers";
import { CopyPromptButton } from "@/features/prompt/CopyPromptButton";
import { PROMPT_PRE_CLASS, PromptText } from "@/features/prompt/PromptText";

/** External link attributes used for the creator and source links. */
const EXTERNAL = { target: "_blank", rel: "noopener nofollow" } as const;

export interface FeaturedPromptProps {
  prompt: PromptSummary;
  /** Prefix for the `<pre>` id the copy button targets. */
  idPrefix?: string;
  className?: string;
}

/**
 * 本期精选 — the prototype's two-column block, which is a different anatomy
 * from `PromptCard`: media and the byline on the left, the title and the FULL
 * prompt text on the right, with no chips, no excerpt and no expand toggle.
 * The prompt is shown in full because this is the one prompt the page is
 * actively recommending; collapsing it would hide the thing being recommended.
 *
 * The title is plain text, as in the prototype. The featured prompt also
 * appears in the trending grid below (the prototype does not exclude it), so
 * its detail page is still linked from this page.
 */
export function FeaturedPrompt({
  prompt,
  idPrefix = "featured",
  className,
}: FeaturedPromptProps) {
  const cover = prompt.media[0];
  const textId = `${idPrefix}-${prompt.id}`;
  const { likes, bookmarks } = prompt.metrics;
  const publishedAt = prompt.source.publishedAt;

  return (
    <div
      className={className ?? "grid items-start gap-6 md:grid-cols-2 md:gap-8"}
      data-testid="featured-prompt"
    >
      <div className="flex min-w-0 flex-col gap-3">
        {cover === undefined ? null : (
          <MediaFrame
            src={cover.src}
            srcSet={cover.srcSet}
            sizes={MEDIA_SIZES.featured}
            alt={cover.alt}
            width={cover.width}
            height={cover.height}
            label={cover.label}
            priority
            className="border-2 border-foreground md:border-4"
          />
        )}
        <p
          data-testid="featured-prompt-meta"
          // No observation date on the byline: the prototype has none there.
          // The 本期精选 region states it once (`MetricsSnapshotNote`), which is
          // what global constraint 4 asks for.
          className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium"
        >
          <span>
            由{" "}
            <a {...EXTERNAL} href={prompt.creator.url} className="underline">
              {formatCreatorHandle(prompt.creator.handle)}
              <span className="sr-only">（外部链接，新窗口打开）</span>
            </a>{" "}
            发布 · {publishedAt === null ? "日期未收录" : <time dateTime={publishedAt}>{publishedAt}</time>}
          </span>
          <span className="font-mono tabular-nums">
            {formatThousands(likes)} 赞 · {formatThousands(bookmarks)} 藏
          </span>
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <h3 className="wrap-anywhere text-xl font-black tracking-tight md:text-2xl">
          {prompt.title}
        </h3>

        {/*
          Height cap with an internal scroll, as in the prototype
          (`.featured .ptext { max-height: 260px }`). The whole prompt is still
          rendered — this block is the one place the page shows a prompt in
          full, and without the cap a 4,000-character recommendation pushed
          everything below it two screens down on mobile. `PromptText` already
          makes the `<pre>` a focusable, labelled region, so the scroll is
          reachable from the keyboard.
        */}
        <PromptText
          id={textId}
          text={prompt.promptText}
          expandable={false}
          className={`${PROMPT_PRE_CLASS} max-h-65 overflow-y-auto`}
        />

        <div className="flex flex-wrap items-center gap-3">
          <CopyPromptButton text={prompt.promptText} targetId={textId} shape="square" />
          <a
            {...EXTERNAL}
            href={prompt.source.url}
            className={buttonClassName({ variant: "outline" })}
          >
            查看原帖 ↗<span className="sr-only">（外部链接，新窗口打开）</span>
          </a>
        </div>
      </div>
    </div>
  );
}
