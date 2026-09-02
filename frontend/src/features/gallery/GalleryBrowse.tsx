import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { StateBlock } from "@/components/ui/StateBlock";
import type { Locale, PromptSummary, TaxonomyWithCount } from "@/lib/content/types";
import { promptsHome } from "@/lib/i18n/routes";
import { queryHref, setFacet } from "@/features/search/query-links";

import { ContentTypeTiles } from "./ContentTypeTiles";
import { ModelTiles } from "./ModelTiles";
import { PromptRail } from "./PromptRail";
import { IMAGE_CONTENT_TYPE_SLUG, promptsForTerm, termLabel } from "./image-prompts";

export interface GalleryBrowseProps {
  locale: Locale;
  /** This page's path; subject filters and facet links stay on it. */
  basePath: string;
  /** Snapshot date the interaction figures were observed on. */
  observedAt: string;
  featured: readonly PromptSummary[];
  /** The image subset — the only prompts this page may render. */
  imagePrompts: readonly PromptSummary[];
  /** Model terms present in the subset, counted over it, ordered by count. */
  models: readonly TaxonomyWithCount[];
  /** Content types across the whole library, counts included. */
  contentTypes: readonly TaxonomyWithCount[];
  /** The `Person / portrait` subject term, or `null` if the data lost it. */
  portraitSubject: TaxonomyWithCount | null;
  /** Most used tasks inside the subset, for the related-links band. */
  topUseCases: readonly TaxonomyWithCount[];
  /** Cards per rail. The rail's "查看全部" link carries the remainder. */
  railLimit?: number;
}

/**
 * Everything the gallery shows when nothing is filtered, in the prototype's
 * order: featured, by model (tiles + one rail per model), the portrait rail,
 * other content types, related links and a closing call to action.
 *
 * It is server-rendered and handed to `PromptExplorer` as its `browse` slot, so
 * a crawler or a reader without JavaScript receives all of it.
 */
export function GalleryBrowse({
  locale,
  basePath,
  observedAt,
  featured,
  imagePrompts,
  models,
  contentTypes,
  portraitSubject,
  topUseCases,
  railLimit = 6,
}: GalleryBrowseProps) {
  // Only a model that owns a real page can offer a "see all" destination.
  const modelRails = models.flatMap((model) =>
    model.href === null ? [] : [{ model, href: model.href, prompts: promptsForTerm(imagePrompts, "model", model.slug) }],
  );

  const portraitPrompts =
    portraitSubject === null ? [] : promptsForTerm(imagePrompts, "subject", portraitSubject.slug);
  const portraitHref =
    portraitSubject === null
      ? null
      : queryHref(basePath, setFacet({}, "subject", [portraitSubject.slug]));

  const topModel = modelRails[0] ?? null;

  return (
    <div className="flex flex-col">
      <Section
        id="gallery-featured"
        title="精选图片提示词"
        description={`编辑挑出的图片提示词，互动数据观测于 ${observedAt}。`}
      >
        <PromptRail
          label="精选图片提示词"
          prompts={featured}
          locale={locale}
          idPrefix="featured"
          priorityFirst
          emptyMessage="本期还没有选出精选图片提示词。"
        />
      </Section>

      <Section
        id="gallery-models"
        title="按模型浏览"
        description="数量按当前收录的图片提示词计算；只有已建成模型页的模型可以点进去。"
      >
        <ModelTiles models={models} />

        <div className="mt-10 flex flex-col gap-10">
          {modelRails.map(({ model, href, prompts }) => {
            const label = termLabel(model);
            return (
              <div key={model.id}>
                <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-foreground pb-2">
                  <h3 className="text-xl font-black tracking-tight uppercase">{label} 图片提示词</h3>
                  <ButtonLink href={href} data-model-more={model.slug} variant="outline">
                    查看全部 {model.count} 条 →
                  </ButtonLink>
                </div>
                <div className="mt-4">
                  <PromptRail
                    label={`${label} 图片提示词`}
                    prompts={prompts}
                    locale={locale}
                    idPrefix={`model-${model.slug}`}
                    limit={railLimit}
                    emptyMessage={`${label} 还没有收录图片提示词。`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        id="gallery-portrait"
        title={portraitSubject === null ? "人物 / 肖像" : `${termLabel(portraitSubject)} 提示词`}
        description="以人物为主体的图片提示词。"
      >
        {portraitSubject === null || portraitHref === null ? (
          <StateBlock variant="empty" message="当前收录里还没有人物主体的标注。" />
        ) : (
          <>
            <p className="mb-4">
              <ButtonLink
                href={portraitHref}
                data-subject-more={portraitSubject.slug}
                variant="outline"
              >
                查看全部 {portraitPrompts.length} 条 →
              </ButtonLink>
            </p>
            <PromptRail
              label={`${termLabel(portraitSubject)} 图片提示词`}
              prompts={portraitPrompts}
              locale={locale}
              idPrefix={`subject-${portraitSubject.slug}`}
              limit={railLimit}
              emptyMessage="当前收录里还没有人物主体的图片提示词。"
            />
          </>
        )}
      </Section>

      <Section
        id="gallery-content-types"
        title="其他类型"
        description="数量按当前收录计算。本期只发布了图片聚合页，其余类型的页面还没有上线。"
      >
        <ContentTypeTiles types={contentTypes} currentSlug={IMAGE_CONTENT_TYPE_SLUG} />
      </Section>

      <Section id="gallery-related" title="相关页面" description="全部为本期已发布的真实页面。">
        <ul className="flex flex-col gap-3">
          <li>
            <Link href={promptsHome(locale)} className="text-base font-bold underline">
              提示词库首页
            </Link>
          </li>
          {modelRails.map(({ model, href }) => (
            <li key={`related-${model.id}`}>
              <Link href={href} className="text-base font-bold underline">
                {termLabel(model)} 模型页
              </Link>
            </li>
          ))}
          {topUseCases.map((useCase) => (
            <li key={`related-${useCase.id}`}>
              <Link
                href={queryHref(promptsHome(locale), setFacet({}, "useCase", [useCase.slug]))}
                className="text-base font-bold underline"
              >
                {termLabel(useCase)}提示词（{useCase.count} 条图片提示词）
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="gallery-cta"
        title="挑一个模型开始"
        description="全部提示词免费复制，均标注原作者与出处。"
      >
        {topModel === null ? (
          <StateBlock variant="empty" message="还没有可以进入的模型页。" />
        ) : (
          <ButtonLink
            href={topModel.href}
            data-gallery-cta={topModel.model.slug}
            variant="primary"
          >
            进入 {termLabel(topModel.model)} 模型页
          </ButtonLink>
        )}
      </Section>
    </div>
  );
}
