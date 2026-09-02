import { ButtonLink } from "@/components/ui/Button";
import { HairlineList, HairlineRow } from "@/components/ui/HairlineList";
import { Section } from "@/components/ui/Section";
import { StateBlock } from "@/components/ui/StateBlock";
import { dividerClassName } from "@/components/ui/dividers";
import { microLabelClassName, sectionTitleClassName } from "@/components/ui/type-scale";
import { COMING_SOON_NOTE } from "@/components/layout/nav";
import type { Locale, PromptSummary, TaxonomyWithCount } from "@/lib/content/types";
import { promptsHome, promptsImage } from "@/lib/i18n/routes";
import { queryHref, setFacet } from "@/features/search/query-links";

import { ContentTypeTiles } from "./ContentTypeTiles";
import { ModelTiles } from "./ModelTiles";
import { PromptRail } from "./PromptRail";
import {
  IMAGE_CONTENT_TYPE_SLUG,
  planGalleryRails,
  promptsForTerm,
  railMoreLabel,
  termLabel,
} from "./image-prompts";

export interface GalleryBrowseProps {
  locale: Locale;
  /** This page's path; subject filters and facet links stay on it. */
  basePath: string;
  featured: readonly PromptSummary[];
  /** The image subset — the only prompts this page may render. */
  imagePrompts: readonly PromptSummary[];
  /**
   * ALL model terms present in the subset, counted over it, ordered by count.
   * `ModelTiles` renders every one of these.
   */
  models: readonly TaxonomyWithCount[];
  /**
   * The subset of `models` that also get their own rail (h3 + `PromptRail`),
   * capped upstream by `topRailedModels`. A strict subset of `models`.
   */
  railedModels: readonly TaxonomyWithCount[];
  /** Content types across the whole library, counts included. */
  contentTypes: readonly TaxonomyWithCount[];
  /** The `Person / portrait` subject term, or `null` if the data lost it. */
  portraitSubject: TaxonomyWithCount | null;
  /** Models listed in the 相关 band's 模型 column. */
  relatedModels: readonly TaxonomyWithCount[];
  /** Use cases listed in the 相关 band's 用例 column. */
  relatedUseCases: readonly TaxonomyWithCount[];
  /** Cards per rail. The rail's 查看全部 link carries the remainder. */
  railLimit?: number;
}

/** One entry of the 相关 band: a real page, or a name with no page yet. */
interface RelatedItem {
  key: string;
  label: string;
  /** `null` renders as plain text with `（即将推出）` — never a `#` href. */
  href: string | null;
  /** Extra attribute the tests hook onto, e.g. `data-usecase-more`. */
  attrs?: Record<`data-${string}`, string>;
}

/**
 * Everything the gallery shows when nothing is filtered, in the prototype's
 * order: 精选, 按模型浏览 (tiles + one rail per model), the Person / portrait
 * rail, 其他类型, 相关 and the closing call to action.
 *
 * Each prompt gets exactly one card on this page. Which rail that card belongs
 * to is decided by `planGalleryRails` — see its own note for why, and for why
 * the numbers printed beside the rails do not move when a card does. Every
 * count below (`查看全部 N 条`, the subject band's `N 条`) is still counted from
 * the whole term.
 *
 * It is server-rendered and handed to `PromptExplorer` as its `browse` slot, so
 * a crawler or a reader without JavaScript receives all of it.
 */
export function GalleryBrowse({
  locale,
  basePath,
  featured,
  imagePrompts,
  models,
  railedModels,
  contentTypes,
  portraitSubject,
  relatedModels,
  relatedUseCases,
  railLimit = 3,
}: GalleryBrowseProps) {
  const rails = planGalleryRails({
    featured,
    imagePrompts,
    railedModels,
    portraitSubject,
    railLimit,
  });
  const modelRails = rails.modelRails;

  // The subject band's `N 条` counts the whole term, not the three cards drawn
  // under it — the label says how many portrait prompts exist and the link
  // beside it lists all of them.
  const portraitTotal =
    portraitSubject === null
      ? 0
      : promptsForTerm(imagePrompts, "subject", portraitSubject.slug).length;
  const portraitHref =
    portraitSubject === null
      ? null
      : queryHref(basePath, setFacet({}, "subject", [portraitSubject.slug]));

  const topModel = modelRails[0] ?? null;

  // The prototype's four 相关 columns. A destination this phase does not build
  // (视频提示词, 全部创作者) keeps its place as plain text with the same
  // note the nav uses, rather than becoming a link into a missing route.
  const relatedColumns: { title: string; items: RelatedItem[] }[] = [
    {
      title: "类型",
      items: [
        { key: "type-image", label: "图片提示词", href: promptsImage(locale) },
        { key: "type-video", label: "视频提示词", href: null },
      ],
    },
    {
      title: "模型",
      items: relatedModels.map((model) => ({
        key: `model-${model.slug}`,
        label: termLabel(model),
        href: model.href,
        attrs: { "data-model-related": model.slug },
      })),
    },
    {
      title: "用例",
      items: relatedUseCases.map((useCase) => ({
        key: `use-case-${useCase.slug}`,
        label: termLabel(useCase),
        // No use-case page exists; the honest destination for "everything
        // tagged X" is the library home pre-filtered on that term.
        href: queryHref(promptsHome(locale), setFacet({}, "useCase", [useCase.slug])),
        attrs: { "data-usecase-more": useCase.slug },
      })),
    },
    {
      title: "更多",
      items: [
        { key: "more-hub", label: "提示词库首页", href: promptsHome(locale) },
        { key: "more-creators", label: "全部创作者", href: null },
      ],
    },
  ];

  return (
    <div className="flex flex-col">
      <Section id="gallery-featured" title="精选">
        <PromptRail
          label="精选图片提示词，横向滚动列表"
          prompts={rails.featured}
          locale={locale}
          idPrefix="featured"
          priorityFirst
          emptyMessage="本期还没有选出精选图片提示词。"
        />
      </Section>

      <Section id="gallery-models" title="按模型浏览">
        <ModelTiles models={models} />

        <div className="mt-10 flex flex-col gap-10">
          {modelRails.map(({ model, href, prompts }) => {
            const label = termLabel(model);
            return (
              <div key={model.id}>
                <div
                  className={dividerClassName("card", "bottom", {
                    className: "flex flex-wrap items-end justify-between gap-4 pb-2",
                  })}
                >
                  <h3 className={sectionTitleClassName("uppercase")}>{label}</h3>
                  <ButtonLink href={href} data-model-more={model.slug} variant="outline">
                    {railMoreLabel(model.count)}
                  </ButtonLink>
                </div>
                <div className="mt-4">
                  {/* `prompts` is already this rail's exact set: capped at
                      `railLimit` and free of anything shown above. It is never
                      empty — a rail with nothing left to show is not in
                      `modelRails` at all. */}
                  <PromptRail
                    label={`${label} 图片提示词`}
                    prompts={prompts}
                    locale={locale}
                    idPrefix={`model-${model.slug}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        id="gallery-portrait"
        title={portraitSubject === null ? "Person / portrait" : portraitSubject.label}
        moreHref={portraitHref ?? undefined}
        moreLabel={`${portraitTotal} 条`}
      >
        {portraitSubject === null || portraitHref === null ? (
          <StateBlock variant="empty" message="当前收录里还没有人物主体的标注。" />
        ) : (
          <PromptRail
            label={`${portraitSubject.label} 图片提示词`}
            prompts={rails.portrait}
            locale={locale}
            idPrefix={`subject-${portraitSubject.slug}`}
            emptyMessage="当前收录里还没有人物主体的图片提示词。"
          />
        )}
      </Section>

      <Section id="gallery-content-types" title="其他类型">
        <ContentTypeTiles types={contentTypes} currentSlug={IMAGE_CONTENT_TYPE_SLUG} />
      </Section>

      {/*
        The 相关 band is a dense text index, so it is deliberately NOT cards:
        four boxes of four boxes would out-shout the tiles above them. Hairline
        rows carry the same links, labels and order at a quarter of the weight,
        with the chevron appearing only on hover or focus.
      */}
      <Section id="gallery-related" title="相关">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {relatedColumns.map((column) => (
            <div key={column.title}>
              <h3
                className={dividerClassName("column", "bottom", {
                  className: microLabelClassName("pb-2"),
                })}
              >
                {column.title}
              </h3>
              <HairlineList>
                {column.items.map((item, index) => {
                  const last = index === column.items.length - 1;
                  // A destination this phase does not build keeps the row's
                  // rhythm (44px target, the `row` tier) as the primitive's
                  // non-link variant: no chevron, no anchor, and the
                  // `（即将推出）` note is what says so.
                  return (
                    <HairlineRow
                      key={item.key}
                      {...item.attrs}
                      href={item.href ?? undefined}
                      last={last}
                      className={item.href === null ? "text-foreground/70" : undefined}
                    >
                      {item.label}
                      {item.href === null ? COMING_SOON_NOTE : null}
                    </HairlineRow>
                  );
                })}
              </HairlineList>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="gallery-cta"
        title="复制一条提示词，改一个变量"
        description="提示词原文完整保留，每张卡片一键跳转原帖。无需注册。"
      >
        {topModel === null ? (
          <StateBlock variant="empty" message="还没有可以进入的模型页。" />
        ) : (
          <ButtonLink
            href={topModel.href}
            data-gallery-cta={topModel.model.slug}
            variant="primary"
          >
            进入最大的模型合集 →
          </ButtonLink>
        )}
      </Section>
    </div>
  );
}
