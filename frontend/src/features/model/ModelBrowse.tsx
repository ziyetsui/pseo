import { ButtonLink } from "@/components/ui/Button";
import { Rail } from "@/components/ui/Rail";
import { StateBlock } from "@/components/ui/StateBlock";
import { microLabelClassName } from "@/components/ui/type-scale";
import type { FacetGroup, Locale, ModelDetail, PromptSummary } from "@/lib/content/types";
import { MetricsSnapshotNote } from "@/features/prompt/MetricsSnapshotNote";
import { PromptCard } from "@/features/prompt/PromptCard";
import {
  ExplorerFacets,
  ExplorerNotices,
  ExplorerResults,
  ExplorerSearch,
  ExplorerSummary,
  PromptExplorer,
} from "@/features/prompt/PromptExplorer";

import { ModelCreators } from "./ModelCreators";
import { ModelGenerateControls } from "./ModelGenerateControls";
import { ModelIdentity } from "./ModelIdentity";
import { ALL_PROMPTS_ID } from "./model-anchors";
import { ModelRelated } from "./ModelRelated";
import { ModelSection } from "./ModelSection";
import { ModelSpecPanels } from "./ModelSpecPanels";
import { modelCreators } from "./model-data";

export { ALL_PROMPTS_ID };

/** The prototype's 近期热门 band holds three cards. */
export const TRENDING_LIMIT = 3;

const GRID_CLASS = "grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3";

export interface ModelBrowseProps {
  locale: Locale;
  model: ModelDetail;
  /** Page the filter URL state lives on. */
  basePath: string;
  /** Every prompt of this model, unfiltered — this is the browse content. */
  prompts: readonly PromptSummary[];
  /** Facet vocabulary for the unfiltered set. */
  facetGroups: readonly FacetGroup[];
  /** `listTrending(locale, "all", 3, slug)` — ranked by the shared rule. */
  trending: readonly PromptSummary[];
  /** The repository's top-up note, when it had to widen the window. */
  trendingNote: string | null;
  /** This model's prompts that expose variables. Empty ⇒ the rail is hidden. */
  promptsWithVariables: readonly PromptSummary[];
  /** Snapshot date behind every metric on this page. */
  observedAt: string;
}

/**
 * The whole L3 page body, in the prototype's order:
 *
 *   hero (H1 + lede + genbox + 筛选出 N 条)
 *   → 近期热门 → 全部提示词 (facets + grid) → 带变量的提示词 → 创作者
 *   → 关于这个模型 → 能力 / 输入 / 输出 / 限制 → 相关 → CTA
 *
 * Everything here is a server component. `PromptExplorer` is the one client
 * leaf; the pieces it owns (`ExplorerSearch` in the hero genbox, the
 * `筛选出 N 条` line under it, the three facet axes inside the 全部提示词 section
 * head, and the result grid that replaces the browse grid) are placed exactly
 * where this prototype puts them, with every other band handed in as a
 * server-rendered child. The exported HTML therefore carries the full listing
 * whether or not JavaScript runs. Each grid uses its own `idPrefix` because the
 * same prompt can appear in two bands — two copies must not collide on one
 * `<pre>` id.
 */
export function ModelBrowse({
  locale,
  model,
  basePath,
  prompts,
  facetGroups,
  trending,
  trendingNote,
  promptsWithVariables,
  observedAt,
}: ModelBrowseProps) {
  const creators = modelCreators(prompts);

  return (
    <PromptExplorer
      locale={locale}
      basePath={basePath}
      prompts={prompts}
      facetGroups={facetGroups}
      facetAxes={["useCase", "style", "subject"]}
      axisLabels={{ useCase: "用例" }}
      className="flex flex-col"
    >
      <header className="mt-6 text-center">
        <ModelIdentity model={model} />

        {/* The prototype's genbox: the search input and the three
            behaviourless controls in one bordered box inside the hero. */}
        <div className="mx-auto mt-8 max-w-2xl border-2 border-foreground bg-surface p-4 text-start md:border-4">
          <ExplorerSearch
            placeholder={`描述你想要的画面，或搜索下方 ${prompts.length} 条提示词…例如：杂志感美妆人像、奢侈品静物`}
            inputId="model-search"
            label="搜索本模型的提示词"
          />
          <ModelGenerateControls />
        </div>

        {/* The prototype's `#resultcount` genhint, directly under the box. */}
        <ExplorerSummary style="count" className="mt-4 text-sm font-bold" />

        {/* One provenance statement for every metric on this page — the
            prototype prints none per card (global constraint 4). */}
        <MetricsSnapshotNote observedAt={observedAt} />
      </header>

      <ModelSection id="model-trending" title="近期热门" subline={trendingNote ?? undefined}>
        {trending.length === 0 ? (
          <StateBlock variant="empty" message="这个模型还没有可排序的热门提示词。" />
        ) : (
          <ul className={GRID_CLASS}>
            {trending.map((prompt, index) => (
              <li key={prompt.id} className="flex min-w-0">
                <PromptCard
                  prompt={prompt}
                  locale={locale}
                  variant="compact"
                  idPrefix="model-trending"
                  priority={index < TRENDING_LIMIT}
                  className="w-full"
                />
              </li>
            ))}
          </ul>
        )}
      </ModelSection>

      <ModelSection
        id={ALL_PROMPTS_ID}
        title="全部提示词"
        end={<span className="font-mono tabular-nums">共 {prompts.length} 条</span>}
      >
        <ExplorerFacets
          idPrefix="model-facet"
          axisHeadingLevel="h3"
          label={null}
          className="grid gap-6 md:grid-cols-3"
        />

        <ExplorerNotices className="mt-6 flex flex-col gap-3" />

        <ExplorerResults
          cardVariant="compact"
          className="mt-6"
          browse={
            prompts.length === 0 ? (
              <StateBlock variant="empty" message="这个模型下还没有收录提示词。" />
            ) : (
              <ul className={GRID_CLASS}>
                {prompts.map((prompt) => (
                  <li key={prompt.id} className="flex min-w-0">
                    <PromptCard
                      prompt={prompt}
                      locale={locale}
                      variant="compact"
                      idPrefix="model-all"
                      className="w-full"
                    />
                  </li>
                ))}
              </ul>
            )
          }
        />
      </ModelSection>

      {promptsWithVariables.length === 0 ? null : (
        <ModelSection
          id="model-variables"
          title="带变量的提示词"
          end={
            <span className="inline-flex min-h-7 items-center rounded-pill border-2 border-foreground px-3 font-mono text-xs tabular-nums">
              {promptsWithVariables.length} 条
            </span>
          }
          subline={
            <>
              这些提示词带 <code className="font-mono">[COUNTRY]</code>{" "}
              一类的占位变量，替换变量即可得到一整套新画面，正文无需改动。
            </>
          }
        >
          <Rail label="带变量的提示词，横向滚动列表" itemClassName="w-80 md:w-96">
            {promptsWithVariables.map((prompt) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                locale={locale}
                variant="compact"
                idPrefix="variables"
                className="h-full w-full"
              />
            ))}
          </Rail>
        </ModelSection>
      )}

      <ModelSection id="model-creators" title="创作者">
        <ModelCreators creators={creators} />
      </ModelSection>

      <ModelSection id="model-about" title="关于这个模型">
        <div className="grid gap-4 md:grid-cols-3">
          {model.editorial.map((block) => (
            <div
              key={block.title}
              className="flex flex-col gap-2 border-2 border-foreground bg-surface p-4"
            >
              <p className="text-sm font-medium">{block.body}</p>
              <h3 className={microLabelClassName("mt-auto font-mono text-foreground/70")}>
                {block.title}
              </h3>
            </div>
          ))}
        </div>
      </ModelSection>

      <ModelSpecPanels model={model} />

      <ModelRelated
        locale={locale}
        relatedModels={model.relatedModels}
        relatedUseCases={model.relatedUseCases}
      />

      <ModelSection
        id="model-cta"
        title={`复制这 ${prompts.length} 条提示词中的任意一条`}
        subline="主动作是复制，每张卡片都能一键跳转原帖。"
      >
        <ButtonLink href={`#${ALL_PROMPTS_ID}`} variant="primary">
          回到提示词列表
        </ButtonLink>
      </ModelSection>
    </PromptExplorer>
  );
}
