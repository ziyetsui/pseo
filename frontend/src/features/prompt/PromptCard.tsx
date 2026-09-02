import Link from "next/link";

import { buttonClassName } from "@/components/ui/Button";
import { cardClassName } from "@/components/ui/Card";
import { CardMedia } from "@/components/ui/CardMedia";
import { ChipLink, chipClassName } from "@/components/ui/Chip";
import { GeometricMark } from "@/components/ui/GeometricMark";
import { Avatar } from "@/components/ui/IdentityMark";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { dividerClassName } from "@/components/ui/dividers";
import { hoverTitleClassName } from "@/components/ui/hover";
import { MEDIA_SIZES } from "@/components/ui/media-sizes";
import { microLabelClassName, singleLineTitleClassName } from "@/components/ui/type-scale";
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
 *
 * Both are the same VARIANT of the card system — the media card: picture, then
 * the full-bleed card-tier rule `CardMedia` draws, then a body compartment of
 * single-line title → (chips) → prompt → avatar creator line → actions. What
 * differs between them is what the wireframe puts in that compartment, not how
 * the compartment is built, which is why they read as one family rather than
 * as two designs.
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
  /**
   * How wide the cover renders. Defaults to the card grid; a rail passes its
   * own fixed-width value, since the same card is used in both.
   */
  mediaSizes?: string;
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
  mediaSizes = MEDIA_SIZES.cardGrid,
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
        <CardMedia
          src={cover.src}
          srcSet={cover.srcSet}
          sizes={mediaSizes}
          alt={cover.alt}
          width={cover.width}
          height={cover.height}
          label={mediaLabel}
          priority={priority}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-5">
        {/*
          Tier 2 — the single-line title. It lives on the `<a>` rather than on
          the `<h3>` so the truncation's `overflow: hidden` clips the label but
          never the link's own 2px focus ring (an outline is painted outside
          the box that owns it, so an ANCESTOR with `overflow: hidden` would
          eat it). The full string stays in the DOM for the accessible name and
          for find-in-page; only the painted line is cut, which is what keeps a
          long title from making one card in a grid row taller than the rest.
        */}
        <h3 className="min-w-0">
          <Link
            href={prompt.href}
            className={hoverTitleClassName(
              singleLineTitleClassName("block underline decoration-accent-red decoration-2"),
            )}
          >
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

/**
 * The creator line, shared by both variants: the 28px avatar, then the handle.
 *
 * The avatar is the card's only identity slot, and it is decoration — the
 * handle it stands for is written immediately beside it, so `Avatar` stays
 * `aria-hidden` and a screen reader hears the handle once. A creator with no
 * picture falls back to the first character of the handle rather than to an
 * empty circle, so the line never changes height between records.
 */
function CreatorMark({ prompt }: { prompt: PromptSummary }) {
  return (
    <>
      <Avatar name={prompt.creator.handle} src={prompt.creator.avatarUrl} />
      <span>{formatCreatorHandle(prompt.creator.handle)}</span>
    </>
  );
}

/**
 * The rule above the meta line, and the row it sits on.
 *
 * `card` tier: inside a card there is exactly one internal rule strength, the
 * same one `CardMedia` draws between the picture and the body — a second,
 * lighter weight here would read as an accident rather than as a decision.
 */
const META_ROW = dividerClassName("card", "top", {
  className: "flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 text-xs font-medium",
});

/** L1 meta: avatar `@handle` · date · `2,512 赞` · `6,127 藏`. */
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
      className={META_ROW}
    >
      <a
        {...EXTERNAL}
        href={prompt.creator.url}
        className="inline-flex min-h-11 items-center gap-2 underline"
      >
        <CreatorMark prompt={prompt} />
        <span className="sr-only">（外部链接，新窗口打开）</span>
      </a>
      {/*
        Micro label, tier 3, for the counted facts only — never for the handle.
        The tier carries `uppercase`, which is a no-op on 赞 / 藏 but would
        rewrite a Latin handle into `@AZED_AI`, i.e. into something the
        creator never wrote.
      */}
      {publishedAt === null ? (
        <span className={microLabelClassName()}>日期未收录</span>
      ) : (
        <time className={microLabelClassName("font-mono tabular-nums")} dateTime={publishedAt}>
          {publishedAt}
        </time>
      )}
      <span className={microLabelClassName("font-mono tabular-nums")}>
        {formatThousands(likes)} 赞
      </span>
      <span className={microLabelClassName("font-mono tabular-nums")}>
        {formatThousands(bookmarks)} 藏
      </span>
    </p>
  );
}

/** L2/L3 meta: `@handle` · `3.8K 赞` · `2.4K 藏` · `热门` · `原帖 ↗`. */
function CompactMeta({ prompt }: { prompt: PromptSummary }) {
  const { likes, bookmarks, highValue } = prompt.metrics;

  return (
    <p data-testid="prompt-card-metrics" className={META_ROW}>
      {/* Not a link here: the compact card already spends its one external
          link on 原帖 at the end of this same line. */}
      <span className="inline-flex items-center gap-2">
        <CreatorMark prompt={prompt} />
      </span>
      <span className={microLabelClassName()}>
        <b className="font-mono tabular-nums">{formatCompactCount(likes)}</b> 赞
      </span>
      <span className={microLabelClassName()}>
        <b className="font-mono tabular-nums">{formatCompactCount(bookmarks)}</b> 藏
      </span>
      {highValue ? (
        // A pill, not a square chip: the one marker on this card that is a
        // verdict rather than a fact reads as a stamp. Still a word — the
        // signal is never carried by the yellow alone.
        <StatusBadge>热门</StatusBadge>
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
