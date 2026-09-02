import { ButtonLink } from "@/components/ui/Button";
import { Rail } from "@/components/ui/Rail";
import { Section } from "@/components/ui/Section";
import { StateBlock } from "@/components/ui/StateBlock";
import type { Locale, ModelDetail, PromptSummary } from "@/lib/content/types";
import { PromptCard } from "@/features/prompt/PromptCard";

import { ModelCreators } from "./ModelCreators";
import { ModelRelated } from "./ModelRelated";
import { modelCreators, modelTrending } from "./model-data";

/** The `<h2>` the closing CTA links back to. */
export const ALL_PROMPTS_ID = "all-prompts";

export const TRENDING_LIMIT = 6;

export interface ModelBrowseProps {
  locale: Locale;
  model: ModelDetail;
  /** Every prompt of this model, unfiltered — this is the browse content. */
  prompts: readonly PromptSummary[];
  /** This model's prompts that expose variables. Empty ⇒ the rail is hidden. */
  promptsWithVariables: readonly PromptSummary[];
  observedAt: string;
}

/**
 * Everything the model page shows when nothing is filtered, in the prototype's
 * order: 近期热门 → 全部提示词 → 带变量的提示词 → 创作者 → 关于这个模型 → 相关 → CTA.
 *
 * It is entirely server-rendered and handed to `PromptExplorer` as its `browse`
 * slot, so the exported HTML carries the full list whether or not JavaScript
 * runs. Each grid uses its own `idPrefix` because the browse tree and the
 * filtered results coexist in the DOM — two copies of one prompt must not
 * collide on the same `<pre>` id.
 */
export function ModelBrowse({
  locale,
  model,
  prompts,
  promptsWithVariables,
  observedAt,
}: ModelBrowseProps) {
  const trending = modelTrending(prompts, TRENDING_LIMIT);
  const creators = modelCreators(prompts);

  return (
    <div className="flex flex-col">
      <Section
        id="model-trending"
        title="近期热门"
        description={`按互动价值排序，指标观测于 ${observedAt}。`}
      >
        {trending.length === 0 ? (
          <StateBlock variant="empty" message="这个模型还没有可排序的热门提示词。" />
        ) : (
          <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {trending.map((prompt, index) => (
              <li key={prompt.id} className="flex min-w-0">
                <PromptCard
                  prompt={prompt}
                  locale={locale}
                  idPrefix="model-trending"
                  priority={index < 3}
                  className="w-full"
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        id={ALL_PROMPTS_ID}
        title="全部提示词"
        description={`库中共有 ${prompts.length} 条提示词点名 ${model.label}。`}
      >
        {prompts.length === 0 ? (
          <StateBlock variant="empty" message="这个模型下还没有收录提示词。" />
        ) : (
          <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {prompts.map((prompt) => (
              <li key={prompt.id} className="flex min-w-0">
                <PromptCard
                  prompt={prompt}
                  locale={locale}
                  idPrefix="model-all"
                  className="w-full"
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {promptsWithVariables.length === 0 ? null : (
        <Section
          id="model-variables"
          title="带变量的提示词"
          description="方括号里的部分可以替换成自己的主体、场景或风格。"
        >
          <Rail label="带变量的提示词，横向滚动列表" itemClassName="w-80 md:w-96">
            {promptsWithVariables.map((prompt) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                locale={locale}
                idPrefix="variables"
                className="h-full w-full"
              />
            ))}
          </Rail>
        </Section>
      )}

      <Section
        id="model-creators"
        title="创作者"
        description={`写下这些提示词的 ${creators.length} 位作者，条数只统计本页这个模型。`}
      >
        <ModelCreators creators={creators} />
      </Section>

      <Section id="model-about" title="关于这个模型">
        <div className="grid gap-4 md:grid-cols-3">
          {model.editorial.map((block) => (
            <div key={block.title} className="flex flex-col gap-2 border-t-2 border-foreground pt-3">
              <h3 className="text-base font-black tracking-tight uppercase">{block.title}</h3>
              <p className="text-sm font-medium">{block.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <ModelRelated
        locale={locale}
        relatedModels={model.relatedModels}
        relatedUseCases={model.relatedUseCases}
      />

      <Section
        id="model-cta"
        title="继续挑选提示词"
        description="全部提示词免费复制，均标注原作者与出处。"
      >
        <ButtonLink href={`#${ALL_PROMPTS_ID}`} variant="primary">
          回到提示词列表
        </ButtonLink>
      </Section>
    </div>
  );
}
