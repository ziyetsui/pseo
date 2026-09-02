import Link from "next/link";

import { buttonClassName } from "@/components/ui/Button";
import { cardClassName } from "@/components/ui/Card";
import { ChipLink, chipClassName } from "@/components/ui/Chip";
import { GeometricMark } from "@/components/ui/GeometricMark";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { formatCreatorHandle } from "@/lib/content";
import type { Locale, Media, PromptSummary, Taxonomy } from "@/lib/content/types";
import { formatCompactCount, formatThousands } from "@/lib/format/numbers";
import { promptsHome } from "@/lib/i18n/routes";

import { queryHref, setFacet } from "@/features/search/query-links";

import { CopyPromptButton } from "./CopyPromptButton";
import { ExpandToggle } from "./ExpandToggle";
import { PromptText } from "./PromptText";

/** External link attributes used for every creator / source link on a card. */
const EXTERNAL = { target: "_blank", rel: "noopener nofollow" } as const;

/**
 * The prototype ships two card anatomies, and this component is both of them:
 *
 * - `hub` — the L1 card. Media badge straight from the source record
 *   (`视频 14s` / `图片 ×2`), title, four taxonomy chip axes, the prompt, a
 *   meta line with the creator, the date and thousands-separated counts, and a
 *   `复制提示词 / 展开 / 原帖 ↗` action row.
 * - `compact` — the L2/L3 card. A derived `PHOTO · ×2`-style badge, title, the
 *   prompt, model+style tags, a meta line with K-formatted counts, the `热门`
 *   badge and the source link, and a `复制 / 展开 / 详情 →` action row.
 *
 * Both put the prompt's FULL text in the DOM and copy exactly that.
 */
export type PromptCardVariant = "hub" | "compact";

/**
 * Compact media badge, derived from the media kind and the source post's item
 * count — the L1 badge string is Chinese, so it cannot be reused here.
 *
 * | kind    | condition          | badge          |
 * | ------- | ------------------ | -------------- |
 * | image   | `total > 1`        | `PHOTO · ×{n}` |
 * | image   | otherwise          | `PHOTO`        |
 * | video   | duration known     | `VIDEO · {d}s` |
 * | video   | `total > 1`        | `VIDEO · ×{n}` |
 * | video   | otherwise          | `VIDEO`        |
 */
export function compactMediaLabel(media: Media): string {
  if (media.kind === "video") {
    if (media.durationSeconds !== null) return `VIDEO · ${media.durationSeconds}s`;
    return media.total > 1 ? `VIDEO · ×${media.total}` : "VIDEO";
  }
  return media.total > 1 ? `PHOTO · ×${media.total}` : "PHOTO";
}

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

export interface PromptCardProps {
  prompt: PromptSummary;
  locale: Locale;
  /** Which prototype anatomy to render. Defaults to the L1 (`hub`) card. */
  variant?: PromptCardVariant;
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
  variant = "hub",
  priority = false,
  expandable = true,
  idPrefix = "prompt-text",
  className,
}: PromptCardProps) {
  const cover = prompt.media[0];
  const textId = `${idPrefix}-${prompt.id}`;
  const isCompact = variant === "compact";

  // L1 chips cover the four browsable axes. The content type is deliberately
  // absent: it is not one of the prototype's card chips, and it would collide
  // with the media badge that already states it.
  const terms: Taxonomy[] = isCompact
    ? [...prompt.models, ...prompt.styles]
    : [...prompt.models, ...prompt.useCases, ...prompt.techniques, ...prompt.styles];

  const mediaLabel =
    cover === undefined ? null : isCompact ? compactMediaLabel(cover) : cover.label;

  return (
    <article className={cardClassName(className)} data-card-variant={variant}>
      {/*
        The corner mark belongs to the hub card only. On L2/L3 the compact
        cards ARE the page, and repeating a decorative square over two dozen
        thumbnails turned a Bauhaus accent into wallpaper — the media badge and
        the `热门` pill already carry every signal those cards need.
      */}
      {isCompact ? null : (
        <GeometricMark shape="square" color="blue" className="absolute top-2 right-2 z-10" />
      )}

      {cover === undefined ? null : (
        <MediaFrame
          src={cover.src}
          alt={cover.alt}
          width={cover.width}
          height={cover.height}
          label={mediaLabel}
          priority={priority}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-5">
        <h3 className="wrap-anywhere text-lg font-black tracking-tight md:text-xl">
          <Link href={prompt.href} className="underline decoration-accent-red decoration-2">
            {prompt.title}
          </Link>
        </h3>

        {isCompact ? null : <TaxonomyChips terms={terms} locale={locale} />}

        <PromptBody
          prompt={prompt}
          textId={textId}
          expandable={expandable}
          variant={variant}
          tags={isCompact ? terms : []}
        />
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ parts */

function TaxonomyChips({ terms, locale }: { terms: readonly Taxonomy[]; locale: Locale }) {
  if (terms.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {terms.map((term) => {
        const href = taxonomyHref(term, locale);
        // The prototype writes every taxonomy value in English on the card;
        // `labelZh` is reserved for the Chinese-labelled footer columns.
        return href === null ? (
          <span key={term.id} className={chipClassName(false, { size: "compact" })}>
            {term.label}
          </span>
        ) : (
          <ChipLink key={term.id} href={href} label={term.label} className="text-xs" />
        );
      })}
    </div>
  );
}

interface PromptBodyProps {
  prompt: PromptSummary;
  textId: string;
  expandable: boolean;
  variant: PromptCardVariant;
  /** Compact-only plain tags (model + style), rendered above the meta line. */
  tags: readonly Taxonomy[];
}

/**
 * `<pre>` → meta → action row, in the prototype's order, with the single
 * expand toggle sitting in that action row. `ExpandToggle` owns the clamp, so
 * everything below it is passed in as slots rather than nested inside the
 * clamped region.
 */
function PromptBody({ prompt, textId, expandable, variant, tags }: PromptBodyProps) {
  const pre = <PromptText id={textId} text={prompt.promptText} expandable={false} />;
  const meta =
    variant === "compact" ? (
      <>
        {tags.length === 0 ? null : (
          <div className="flex flex-wrap gap-2">
            {tags.map((term) => (
              <span key={term.id} className={chipClassName(false, { size: "compact" })}>
                {term.label}
              </span>
            ))}
          </div>
        )}
        <CompactMeta prompt={prompt} />
      </>
    ) : (
      <HubMeta prompt={prompt} />
    );

  const actionsBefore =
    variant === "compact" ? (
      <CopyPromptButton
        text={prompt.promptText}
        targetId={textId}
        label="复制"
        successLabel="已复制"
        shape="square"
      />
    ) : (
      <CopyPromptButton text={prompt.promptText} targetId={textId} shape="square" />
    );

  const actionsAfter =
    variant === "compact" ? (
      <Link href={prompt.href} className={buttonClassName({ variant: "secondary" })}>
        详情 →
      </Link>
    ) : (
      <a {...EXTERNAL} href={prompt.source.url} className={buttonClassName({ variant: "outline" })}>
        原帖 ↗<span className="sr-only">（外部链接，新窗口打开）</span>
      </a>
    );

  if (!expandable) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {pre}
        {meta}
        <div className="mt-auto flex flex-wrap items-center gap-3">
          {actionsBefore}
          {actionsAfter}
        </div>
      </div>
    );
  }

  return (
    // `flex-1`: the cards in one grid row are all as tall as the tallest, so
    // this column has to stretch before `mt-auto` on the action row can pin
    // the buttons to a shared baseline across the row.
    <ExpandToggle
      contentId={textId}
      belowContent={meta}
      actionsBefore={actionsBefore}
      actionsAfter={actionsAfter}
      className="flex-1"
      rowClassName="mt-auto flex flex-wrap items-center gap-3"
    >
      {pre}
    </ExpandToggle>
  );
}

/** L1 meta: `@handle` · date · `2,512 赞` · `6,127 藏`. */
function HubMeta({ prompt }: { prompt: PromptSummary }) {
  const { likes, bookmarks } = prompt.metrics;
  const publishedAt = prompt.source.publishedAt;

  return (
    <p
      data-testid="prompt-card-metrics"
      // No per-card observation date: the prototype's card has none, and
      // repeating it on every card of a grid says the same thing six times.
      // Global constraint 4 is met once per data region instead — see
      // `MetricsSnapshotNote`, the trending panel's note, the L2 statline and
      // the footer's `数据更新于`.
      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t-2 border-foreground pt-3 text-xs font-medium"
    >
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
      <span className="font-mono tabular-nums">{formatThousands(likes)} 赞</span>
      <span className="font-mono tabular-nums">{formatThousands(bookmarks)} 藏</span>
    </p>
  );
}

/** L2/L3 meta: `@handle` · `3.8K 赞` · `2.4K 藏` · `热门` · `原帖 ↗`. */
function CompactMeta({ prompt }: { prompt: PromptSummary }) {
  const { likes, bookmarks, highValue } = prompt.metrics;

  return (
    <p
      data-testid="prompt-card-metrics"
      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t-2 border-foreground pt-3 text-xs font-medium"
    >
      <span>{formatCreatorHandle(prompt.creator.handle)}</span>
      <span>
        <b className="font-mono tabular-nums">{formatCompactCount(likes)}</b> 赞
      </span>
      <span>
        <b className="font-mono tabular-nums">{formatCompactCount(bookmarks)}</b> 藏
      </span>
      {highValue ? (
        <span className="border-2 border-foreground bg-accent-yellow px-2 font-bold">热门</span>
      ) : null}
      <a
        {...EXTERNAL}
        href={prompt.source.url}
        className="inline-flex min-h-11 items-center underline"
      >
        原帖 ↗<span className="sr-only">（外部链接，新窗口打开）</span>
      </a>
    </p>
  );
}
