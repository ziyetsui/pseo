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
import { TrendingTabs, type TrendingWindowPanel } from "@/features/prompt/TrendingTabs";

import { CollectionTiles } from "./CollectionTiles";
import { CreatorTiles } from "./CreatorTiles";
import { FeaturedPrompt } from "./FeaturedPrompt";
import { HUB_SECTION_IDS } from "./AnchorNav";
import { TaxonomyTiles } from "./TaxonomyTiles";
import { allPromptsHref, cameraSectionDescription } from "./hub-copy";

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
  /**
   * Share of the library carrying camera language, in 成 (tenths), measured by
   * the page. `null` drops the figure from the 镜头与运动 sentence.
   */
  cameraShareTenths?: number | null;
  /** Library size — denominator of the collection tiles' proportion bars. */
  libraryTotal?: number;
  /** How many creator tiles to show (the prototype shows 7). */
  creatorLimit?: number;
  /** How many tiles per taxonomy grid (the prototype shows up to 8). */
  taxonomyLimit?: number;
  /** How many collection tiles to show (the prototype shows 6). */
  collectionLimit?: number;
}

/**
 * The hub's browse state, in the prototype's order and with its wording:
 * featured, trending, by task, camera & movement, by model, by style,
 * collections, creators, and the closing call to action.
 *
 * Section ids match `HUB_SECTION_IDS` because the page's `AnchorNav` links to
 * them; `Section` puts the id on its `<h2>`, so each anchor resolves inside the
 * same document (checked by `scripts/check-static-output.mjs`).
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
  cameraShareTenths = null,
  libraryTotal,
  creatorLimit = 7,
  taxonomyLimit = 8,
  collectionLimit = 6,
}: PromptHubBrowseProps) {
  return (
    <div className="flex flex-col">
      <Section id="featured" title="本期精选">
        {featured === null ? (
          <StateBlock variant="empty" message="本期还没有选出精选提示词。" />
        ) : (
          <FeaturedPrompt prompt={featured} idPrefix="featured" />
        )}
      </Section>

      <Section id="trending" title="热门提示词">
        <TrendingTabs
          locale={locale}
          basePath={basePath}
          windows={trendingWindows}
          observedAt={observedAt}
        />
      </Section>

      <Section
        id={HUB_SECTION_IDS.tasks}
        title="按任务浏览"
        description="从要做的事情出发：广告、时尚、美妆、餐饮……"
      >
        <TaxonomyTiles basePath={basePath} axis="useCase" terms={useCases} limit={taxonomyLimit} />
      </Section>

      <Section
        id={HUB_SECTION_IDS.camera}
        title="镜头与运动"
        description={cameraSectionDescription(cameraShareTenths)}
      >
        <TaxonomyTiles
          basePath={basePath}
          axis="technique"
          terms={techniques}
          limit={taxonomyLimit}
        />
      </Section>

      <Section id={HUB_SECTION_IDS.models} title="按模型浏览">
        <TaxonomyTiles basePath={basePath} axis="model" terms={models} limit={taxonomyLimit} />
      </Section>

      <Section id={HUB_SECTION_IDS.styles} title="按风格浏览">
        <TaxonomyTiles basePath={basePath} axis="style" terms={styles} limit={taxonomyLimit} />
      </Section>

      <Section
        id={HUB_SECTION_IDS.collections}
        title="精选合集"
        description="按主题整理的提示词合集。"
      >
        <CollectionTiles
          basePath={basePath}
          collections={collections}
          limit={collectionLimit}
          total={libraryTotal}
        />
      </Section>

      <Section
        id={HUB_SECTION_IDS.creators}
        title="创作者"
        description="这些提示词的原作者，点击访问其 X 主页。"
      >
        <CreatorTiles creators={creators} limit={creatorLimit} />
      </Section>

      <Section id="cta" title="找到合适的提示词，直接开始" description="全部提示词免费复制，注明原作者与出处。">
        {/* The prototype's button lists the whole library in the result region
            above; `?collection=all` is the URL form of exactly that state. */}
        <ButtonLink href={allPromptsHref(basePath)} variant="primary">
          浏览全部提示词
        </ButtonLink>
      </Section>
    </div>
  );
}
