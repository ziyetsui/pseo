import { ButtonLink } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { StateBlock } from "@/components/ui/StateBlock";
import type {
  CollectionWithCount,
  CreatorWithCount,
  Locale,
  PromptSummary,
  TaxonomyWithCount,
} from "@/lib/content/types";
import { promptsImage } from "@/lib/i18n/routes";
import { PromptCard } from "@/features/prompt/PromptCard";
import { TrendingTabs, type TrendingWindowPanel } from "@/features/prompt/TrendingTabs";

import { CollectionTiles } from "./CollectionTiles";
import { CreatorTiles } from "./CreatorTiles";
import { TaxonomyTiles } from "./TaxonomyTiles";

export interface PromptHubBrowseProps {
  locale: Locale;
  basePath: string;
  /** Snapshot date every metric and trending window is relative to. */
  observedAt: string;
  featured: PromptSummary | null;
  trendingWindows: readonly TrendingWindowPanel[];
  useCases: readonly TaxonomyWithCount[];
  techniques: readonly TaxonomyWithCount[];
  models: readonly TaxonomyWithCount[];
  styles: readonly TaxonomyWithCount[];
  collections: readonly CollectionWithCount[];
  creators: readonly CreatorWithCount[];
  /** How many creator tiles to show; the section still states the real total. */
  creatorLimit?: number;
  taxonomyLimit?: number;
}

/**
 * The hub's browse state, in the wireframe's order: featured, trending,
 * by task, by camera technique, by model, by style, collections, creators,
 * and a closing call to action.
 *
 * Everything here is server-rendered and handed to `PromptExplorer` as its
 * `browse` slot, so it is present in the exported HTML whether or not
 * JavaScript runs.
 */
export function PromptHubBrowse({
  locale,
  basePath,
  observedAt,
  featured,
  trendingWindows,
  useCases,
  techniques,
  models,
  styles,
  collections,
  creators,
  creatorLimit = 7,
  taxonomyLimit = 8,
}: PromptHubBrowseProps) {
  return (
    <div className="flex flex-col">
      <Section
        id="hub-featured"
        title="本期精选"
        description="编辑选出的一条完整提示词，可以直接复制使用；下方的热门列表已排除这一条，避免重复出现。"
      >
        {featured === null ? (
          <StateBlock variant="empty" message="本期还没有选出精选提示词。" />
        ) : (
          <div className="max-w-3xl">
            {/* The featured prompt is the longest on the page; it keeps the
                default expand toggle so the section stays scannable. */}
            <PromptCard prompt={featured} locale={locale} idPrefix="featured" priority />
          </div>
        )}
      </Section>

      <Section
        id="hub-trending"
        title="热门提示词"
        description={`按互动价值排序，时间窗口相对数据快照日 ${observedAt} 计算。`}
      >
        <TrendingTabs
          locale={locale}
          basePath={basePath}
          windows={trendingWindows}
          observedAt={observedAt}
        />
      </Section>

      <Section
        id="hub-tasks"
        title="按任务浏览"
        description="从要做的事情出发：广告、时尚、美妆、餐饮……"
      >
        <TaxonomyTiles basePath={basePath} axis="useCase" terms={useCases} limit={taxonomyLimit} />
      </Section>

      <Section
        id="hub-camera"
        title="镜头与技法"
        description="推拉、环绕、跟拍、转场、分镜——提示词里最容易复用的部分。"
      >
        <TaxonomyTiles
          basePath={basePath}
          axis="technique"
          terms={techniques}
          limit={taxonomyLimit}
        />
      </Section>

      <Section
        id="hub-models"
        title="按模型浏览"
        description="已建成模型页的会直接进入该模型页，其余进入带筛选条件的列表。"
      >
        <TaxonomyTiles basePath={basePath} axis="model" terms={models} limit={taxonomyLimit} />
      </Section>

      <Section id="hub-styles" title="按风格浏览">
        <TaxonomyTiles basePath={basePath} axis="style" terms={styles} limit={taxonomyLimit} />
      </Section>

      <Section id="hub-collections" title="精选合集" description="按主题整理的提示词合集。">
        <CollectionTiles basePath={basePath} collections={collections} />
      </Section>

      <Section
        id="hub-creators"
        title="创作者"
        description={`这些提示词的原作者，库中共收录 ${creators.length} 位，按收录条数排列。`}
      >
        <CreatorTiles creators={creators} limit={creatorLimit} />
      </Section>

      <Section
        id="hub-cta"
        title="找到合适的提示词，直接开始"
        description="全部提示词免费复制，均标注原作者与出处。"
      >
        <ButtonLink href={promptsImage(locale)} variant="primary">
          浏览图片提示词
        </ButtonLink>
      </Section>
    </div>
  );
}
