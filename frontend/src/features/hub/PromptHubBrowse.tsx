import { ButtonLink } from "@/components/ui/Button";
import { GhostNumeral } from "@/components/ui/GhostNumeral";
import { Section } from "@/components/ui/Section";
import { StateBlock } from "@/components/ui/StateBlock";
import type {
  CollectionWithCount,
  CreatorWithCount,
  Locale,
  PromptSummary,
  TaxonomyWithCount,
} from "@/lib/content/types";
import { MetricsSnapshotNote } from "@/features/prompt/MetricsSnapshotNote";
import { TrendingTabs, type TrendingWindowPanel } from "@/features/prompt/TrendingTabs";

import { CollectionTiles } from "./CollectionTiles";
import { CreatorTiles } from "./CreatorTiles";
import { FeaturedPrompt } from "./FeaturedPrompt";
import { HUB_SECTION_IDS } from "./AnchorNav";
import { TaxonomyTiles } from "./TaxonomyTiles";
import { HUB_SECTION_ACCENTS } from "./section-accent";
import { allPromptsHref } from "./hub-copy";

export interface PromptHubBrowseProps {
  locale: Locale;
  basePath: string;
  /** Snapshot date every metric and trending window is relative to. */
  observedAt: string;
  featured: PromptSummary | null;
  trendingWindows: readonly TrendingWindowPanel[];
  /**
   * EVERY model term with at least one prompt, in the repository's order.
   *
   * There is deliberately no limit prop: this band is the hub's only route to
   * the L3 model pages, and a cap here silently hides a model whose page
   * exists. It used to be capped at 8, which hid Veo — the one model reachable
   * from the chip row but from no tile. A band that is a directory lists the
   * whole directory or says it is partial; this one lists it.
   */
  models: readonly TaxonomyWithCount[];
  collections: readonly CollectionWithCount[];
  creators: readonly CreatorWithCount[];
  /** How many creator tiles to show (the prototype shows 7). */
  creatorLimit?: number;
  /** How many collection tiles to show (the prototype shows 6). */
  collectionLimit?: number;
}

/**
 * The hub's browse state: featured, trending, by model, collections, creators,
 * and the closing call to action.
 *
 * Three of the prototype's six browse bands are gone — 按任务浏览,
 * 镜头与运动 and 按风格浏览. Their eighteen tiles carried the same eighteen
 * taxonomy values, with the same counts, pointing at the same `?useCase=` /
 * `?technique=` / `?style=` URLs as the facet chip rows 300px above them, and
 * the chips do it better: they toggle in place and keep the reader at the
 * result region, where a tile navigates away. Nothing else on the site read
 * those sections, and no printed count changed when they went — the counts
 * were the chips' counts.
 *
 * 按模型浏览 stays, because it is NOT the same object: its tiles are the hub's
 * only links to `/prompts/models/*`, while the model chips beside them only
 * filter this page. It leads the remaining three bands as `01`.
 *
 * Section ids match `HUB_SECTION_IDS` because the page's `AnchorNav` links to
 * them; `Section` puts the id on its `<h2>`, so each anchor resolves inside the
 * same document (checked by `scripts/check-static-output.mjs`). `HUB_ANCHORS`
 * lists exactly the three that still exist.
 *
 * The three browse bands are the same `Section` as every other band, with a
 * ghost numeral — `01`…`03` — in its `marker` slot. The numeral is decoration
 * only; the headings and their levels are unchanged.
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
  models,
  collections,
  creators,
  creatorLimit = 7,
  collectionLimit = 6,
}: PromptHubBrowseProps) {
  return (
    <div className="flex flex-col">
      <Section id="featured" title="本期精选">
        {featured === null ? (
          <StateBlock variant="empty" message="本期还没有选出精选提示词。" />
        ) : (
          <>
            <MetricsSnapshotNote observedAt={observedAt} />
            <FeaturedPrompt prompt={featured} idPrefix="featured" />
          </>
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
        id={HUB_SECTION_IDS.models}
        title="按模型浏览"
        marker={<GhostNumeral value="01" />}
      >
        <TaxonomyTiles
          basePath={basePath}
          axis="model"
          terms={models}
          accent={HUB_SECTION_ACCENTS.models}
        />
      </Section>

      <Section
        id={HUB_SECTION_IDS.collections}
        title="精选合集"
        description="按主题整理的提示词合集。"
        marker={<GhostNumeral value="02" />}
      >
        <CollectionTiles
          basePath={basePath}
          collections={collections}
          limit={collectionLimit}
          accent={HUB_SECTION_ACCENTS.collections}
        />
      </Section>

      <Section
        id={HUB_SECTION_IDS.creators}
        title="创作者"
        description="这些提示词的原作者，点击访问其 X 主页。"
        marker={<GhostNumeral value="03" />}
      >
        <CreatorTiles
          creators={creators}
          limit={creatorLimit}
          accent={HUB_SECTION_ACCENTS.creators}
        />
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
