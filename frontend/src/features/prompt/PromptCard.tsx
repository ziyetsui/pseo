import Link from "next/link";

import { buttonClassName } from "@/components/ui/Button";
import { cardClassName } from "@/components/ui/Card";
import { ChipLink, chipClassName } from "@/components/ui/Chip";
import { GeometricMark } from "@/components/ui/GeometricMark";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { formatCreatorHandle } from "@/lib/content";
import type { Locale, PromptSummary, Taxonomy } from "@/lib/content/types";
import { promptsHome } from "@/lib/i18n/routes";

import { queryHref, setFacet } from "@/features/search/query-links";

import { CopyPromptButton } from "./CopyPromptButton";
import { PromptText } from "./PromptText";

/** External link attributes used for every creator / source link on a card. */
const EXTERNAL = { target: "_blank", rel: "noopener nofollow" } as const;

/**
 * Where a taxonomy chip points. Terms that own a real page (models, the image
 * gallery) link to it; everything else links to L1 pre-filtered on that term.
 * Terms with neither are rendered as plain text rather than a dead link. The
 * filtered-L1 href is built through `query-links` so the axis → query-param
 * mapping lives in exactly one place, shared with the search feature.
 */
function taxonomyHref(term: Taxonomy, locale: Locale): string | null {
  if (term.href !== null) return term.href;
  if (term.axis === "contentType") return null;
  return queryHref(promptsHome(locale), setFacet({}, term.axis, [term.slug]));
}

function taxonomyLabel(term: Taxonomy): string {
  return term.labelZh ?? term.label;
}

export interface PromptCardProps {
  prompt: PromptSummary;
  locale: Locale;
  /** First screenful only: eager, high-priority media. */
  priority?: boolean;
  /** Collapse the prompt preview behind an expand toggle. Defaults to `true`. */
  expandable?: boolean;
  /**
   * Prefix for the `<pre>` id the copy button targets. Override when a page
   * renders the same prompt twice (e.g. featured rail + grid) so the two
   * copies don't collide on the same DOM id.
   */
  idPrefix?: string;
  className?: string;
}

export function PromptCard({
  prompt,
  locale,
  priority = false,
  expandable = true,
  idPrefix = "prompt-text",
  className,
}: PromptCardProps) {
  const cover = prompt.media[0];
  const terms: Taxonomy[] = [prompt.contentType, ...prompt.models, ...prompt.useCases];
  const textId = `${idPrefix}-${prompt.id}`;
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

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-5">
        <h3 className="wrap-anywhere text-lg font-black tracking-tight md:text-xl">
          <Link href={prompt.href} className="underline decoration-accent-red decoration-2">
            {prompt.title}
          </Link>
        </h3>

        <p className="wrap-anywhere text-sm font-medium">{prompt.excerpt}</p>

        <div className="flex flex-wrap gap-2">
          {terms.map((term) => {
            const href = taxonomyHref(term, locale);
            return href === null ? (
              <span key={term.id} className={chipClassName(false, { size: "compact" })}>
                {taxonomyLabel(term)}
              </span>
            ) : (
              <ChipLink
                key={term.id}
                href={href}
                label={taxonomyLabel(term)}
                className="text-xs"
              />
            );
          })}
        </div>

        <PromptText id={textId} text={prompt.promptText} expandable={expandable} />

        <div className="mt-auto flex flex-col gap-2 border-t-2 border-foreground pt-3 text-xs font-medium">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <a
              {...EXTERNAL}
              href={prompt.creator.url}
              className="inline-flex min-h-11 items-center underline"
            >
              {formatCreatorHandle(prompt.creator.handle)}
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
          <CopyPromptButton text={prompt.promptText} targetId={textId} shape="square" />
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
