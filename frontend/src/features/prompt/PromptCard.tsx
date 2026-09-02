import Link from "next/link";

import { buttonClassName } from "@/components/ui/Button";
import { cardClassName } from "@/components/ui/Card";
import { ChipLink, chipClassName } from "@/components/ui/Chip";
import { GeometricMark } from "@/components/ui/GeometricMark";
import { MediaFrame } from "@/components/ui/MediaFrame";
import type { Locale, PromptSummary, Taxonomy } from "@/lib/content/types";
import { promptsHome, withQuery } from "@/lib/i18n/routes";

import { CopyPromptButton } from "./CopyPromptButton";
import { PromptText } from "./PromptText";

/** External link attributes used for every creator / source link on a card. */
const EXTERNAL = { target: "_blank", rel: "noopener nofollow" } as const;

/**
 * Where a taxonomy chip points. Terms that own a real page (models, the image
 * gallery) link to it; everything else links to L1 pre-filtered on that term.
 * Terms with neither are rendered as plain text rather than a dead link.
 */
function taxonomyHref(term: Taxonomy, locale: Locale): string | null {
  if (term.href !== null) return term.href;
  if (term.axis === "contentType") return null;
  return withQuery(promptsHome(locale), { [term.axis]: [term.slug] });
}

function taxonomyLabel(term: Taxonomy): string {
  return term.labelZh ?? term.label;
}

export interface PromptCardProps {
  prompt: PromptSummary;
  locale: Locale;
  /**
   * Full prompt text for the copy button. `PromptSummary` only carries a
   * truncated `promptPreview`, so without this the card honestly offers to copy
   * the preview; detail pages pass `PromptDetail.promptText` here.
   */
  copyText?: string;
  /** First screenful only: eager, high-priority media. */
  priority?: boolean;
  /** Collapse the prompt preview behind an expand toggle. Defaults to `true`. */
  expandable?: boolean;
  className?: string;
}

export function PromptCard({
  prompt,
  locale,
  copyText,
  priority = false,
  expandable = true,
  className,
}: PromptCardProps) {
  const cover = prompt.media[0];
  const terms: Taxonomy[] = [prompt.contentType, ...prompt.models, ...prompt.useCases];
  const textId = `prompt-text-${prompt.id}`;
  const { likes, bookmarks, observedAt } = prompt.metrics;
  const publishedAt = prompt.source.publishedAt;

  return (
    <article className={cardClassName(className)}>
      <GeometricMark shape="square" color="blue" className="absolute top-2 right-2 z-10" />

      {cover === undefined ? null : (
        <MediaFrame
          src={cover.src}
          alt={cover.alt}
          width={cover.width}
          height={cover.height}
          label={cover.label}
          priority={priority}
        />
      )}

      <div className="flex flex-1 flex-col gap-4 p-4 md:p-5">
        <h3 className="text-lg font-black tracking-tight md:text-xl">
          <Link href={prompt.href} className="underline decoration-accent-red decoration-2">
            {prompt.title}
          </Link>
        </h3>

        <p className="text-sm font-medium">{prompt.excerpt}</p>

        <div className="flex flex-wrap gap-2">
          {terms.map((term) => {
            const href = taxonomyHref(term, locale);
            return href === null ? (
              <span key={term.id} className={chipClassName(false, "min-h-0 py-0.5 text-xs")}>
                {taxonomyLabel(term)}
              </span>
            ) : (
              <ChipLink
                key={term.id}
                href={href}
                label={taxonomyLabel(term)}
                className="min-h-11 text-xs"
              />
            );
          })}
        </div>

        <PromptText id={textId} text={prompt.promptPreview} expandable={expandable} />

        <div className="mt-auto flex flex-col gap-2 border-t-2 border-foreground pt-3 text-xs font-medium">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <a
              {...EXTERNAL}
              href={prompt.creator.url}
              className="inline-flex min-h-11 items-center underline"
            >
              @{prompt.creator.handle}
              <span className="sr-only">（外部链接，新窗口打开）</span>
            </a>
            {publishedAt === null ? (
              <span>日期未收录</span>
            ) : (
              <time dateTime={publishedAt}>{publishedAt}</time>
            )}
          </p>

          <p
            data-testid="prompt-card-metrics"
            title={`互动数据观测于 ${observedAt}`}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono tabular-nums"
          >
            <span>赞 {likes === null ? "—" : likes}</span>
            <span>藏 {bookmarks === null ? "—" : bookmarks}</span>
            {likes === null || bookmarks === null ? (
              <span className="font-sans">部分互动数据未收录</span>
            ) : null}
          </p>

          <p className="text-foreground/70">指标观测于 {observedAt}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <CopyPromptButton
            text={copyText ?? prompt.promptPreview}
            targetId={textId}
            label={copyText === undefined ? "复制预览" : "复制提示词"}
            shape="square"
          />
          <a {...EXTERNAL} href={prompt.source.url} className={buttonClassName({ variant: "outline" })}>
            原帖 ↗<span className="sr-only">（外部链接，新窗口打开）</span>
          </a>
          <Link href={prompt.href} className={buttonClassName({ variant: "secondary" })}>
            详情 →
          </Link>
        </div>
      </div>
    </article>
  );
}
