import Link from "next/link";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { buttonClassName } from "@/components/ui/Button";
import { ChipLink, chipClassName } from "@/components/ui/Chip";
import { GeometricMark } from "@/components/ui/GeometricMark";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import { StateBlock } from "@/components/ui/StateBlock";
import { CopyPromptButton } from "@/features/prompt/CopyPromptButton";
import type { Locale, PromptDetail, PromptSummary, RelatedGroups, Taxonomy } from "@/lib/content";
import type { BreadcrumbItem } from "@/lib/seo/json-ld";

import { PromptCopyProvider, PromptStickyCopyBar, PromptSubstitutedText } from "./PromptCopyProvider";
import { PromptSourceText } from "./PromptSourceText";
import { StickyCopyBar } from "./StickyCopyBar";
import { VariableSelector } from "./VariableSelector";
import { taxonomyHref, taxonomyLabel } from "./taxonomy-links";
import { formatStepBody, promptLanguageLabel, promptTokens, splitTokenKinds } from "./variable-view";

/** Id of the `<pre>` — the copy fallback target when there is nothing to
 * substitute (no variables means the visible original already is the text a
 * plain copy button would put on the clipboard). */
const PROMPT_TEXT_ID = "prompt-text";

export interface PromptDetailViewProps {
  prompt: PromptDetail;
  locale: Locale;
  /** From `ContentRepository.getRelated` — never recomputed in the view. */
  related: RelatedGroups;
  /** Same array the page feeds to `breadcrumbList()`, so the two cannot drift. */
  breadcrumbs: readonly BreadcrumbItem[];
}

/**
 * Locale-independent thousands grouping. `toLocaleString` is avoided on
 * purpose: its output depends on the ICU build, so it can differ between the
 * export build and the browser and produce a hydration mismatch.
 */
function formatCount(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function TaxonomyChips({ locale, terms }: { locale: Locale; terms: readonly Taxonomy[] }) {
  return (
    <>
      {terms.map((term) => {
        const href = taxonomyHref(locale, term);
        const label = taxonomyLabel(term);
        return href === null ? (
          // No page and no filter axis: plain text beats a dead link. Same
          // size as `ChipLink` below — linked and unlinked terms in the same
          // row must read as the same kind of chip, not two different sizes.
          <span key={term.id} className={chipClassName(false)}>
            {label}
          </span>
        ) : (
          <ChipLink key={term.id} href={href} label={label} />
        );
      })}
    </>
  );
}

function PromptLinkList({ prompts }: { prompts: readonly PromptSummary[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {prompts.map((prompt) => (
        <li key={prompt.id}>
          <Link
            href={prompt.href}
            className="inline-flex min-h-11 items-center px-1 text-sm font-bold underline"
          >
            {prompt.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function PromptDetailView({ prompt, locale, related, breadcrumbs }: PromptDetailViewProps) {
  const tokens = promptTokens(prompt.promptText);
  const { substitutable, reference } = splitTokenKinds(tokens);
  const hasVariables = prompt.variables.length > 0;
  const [hero, ...thumbnails] = prompt.media;
  const model = prompt.models[0];
  const stickyMeta = [model === undefined ? null : taxonomyLabel(model), prompt.source.handle]
    .filter((part): part is string => part !== null)
    .join(" · ");
  const sticky = {
    title: prompt.title,
    meta: stickyMeta,
    sourceUrl: prompt.source.url,
  };

  const showInputs = prompt.requiredInputs.length > 0 || prompt.optionalInputs.length > 0;
  /** Variations vary one variable; name it so `Japan` is not context-free. */
  const variationToken = prompt.variables[0]?.token ?? null;
  const relatedGroups = [
    { key: "sameSeries", label: "同系列（同作者 · 同模型 · 同风格）", items: related.sameSeries },
    { key: "sameModel", label: "同模型", items: related.sameModel },
    { key: "sameUseCase", label: "同用途", items: related.sameUseCase },
    { key: "sameCreator", label: "同创作者", items: related.sameCreator },
  ].filter((group) => group.items.length > 0);

  const metrics = [
    { label: "浏览", value: prompt.metrics.views },
    { label: "点赞", value: prompt.metrics.likes },
    { label: "收藏", value: prompt.metrics.bookmarks },
    { label: "转发", value: prompt.metrics.reposts },
    { label: "评论", value: prompt.metrics.replies },
    { label: "引用", value: prompt.metrics.quotes },
  ];

  const content = (
    <div className="mx-auto max-w-5xl px-4 pt-8 pb-8 md:px-8 md:pt-12 md:pb-16">
      <Breadcrumb items={breadcrumbs} />

      {/* ------------------------------------------------------- identity */}
      <header className="mt-8">
        <div className="flex flex-wrap items-center gap-2">
          <TaxonomyChips locale={locale} terms={[prompt.contentType, ...prompt.models]} />
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-tighter uppercase md:text-5xl">
          {prompt.title}
        </h1>
        {prompt.summary === null ? null : (
          <p className="mt-4 max-w-prose text-base font-medium whitespace-pre-line md:text-lg">
            {prompt.summary}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <TaxonomyChips
            locale={locale}
            terms={[...prompt.useCases, ...prompt.styles, ...prompt.techniques, ...prompt.subjects]}
          />
        </div>
        <p className="mt-4 text-sm font-medium">
          由{" "}
          <a
            href={prompt.creator.url}
            target="_blank"
            rel="noopener nofollow"
            className="font-bold underline"
          >
            {prompt.source.handle}
          </a>{" "}
          发布于 X ·{" "}
          {prompt.source.publishedAt === null ? (
            <span>日期未收录</span>
          ) : (
            <time dateTime={prompt.source.publishedAt}>{prompt.source.publishedAt}</time>
          )}
        </p>
      </header>

      {/* ---------------------------------------------------------- media */}
      {hero === undefined ? null : (
        <Section
          id="prompt-media"
          title="原帖示例图"
          description="来自作者原帖的生成结果，本站未重新生成。"
        >
          <MediaFrame
            src={hero.src}
            alt={hero.alt}
            width={hero.width}
            height={hero.height}
            label={hero.label}
            priority
            className="border-2 border-foreground md:border-4"
          />
          {thumbnails.length === 0 ? null : (
            <ul className="mt-4 grid grid-cols-3 gap-3 md:grid-cols-4">
              {thumbnails.map((item) => (
                <li key={item.id} className="border-2 border-foreground">
                  <MediaFrame
                    src={item.src}
                    alt={item.alt}
                    width={item.width}
                    height={item.height}
                    label={item.label}
                  />
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {/* --------------------------------------------------------- prompt */}
      <Section
        id="prompt-source"
        title="提示词"
        description="原文完整保留；高亮部分是可替换的变量 token。"
      >
        <p className="mb-3 text-sm font-bold tracking-wider uppercase">
          {promptLanguageLabel(prompt.promptLanguage, prompt.promptText)}
        </p>
        <PromptSourceText id={PROMPT_TEXT_ID} text={prompt.promptText} tokens={tokens} />
        <div className="mt-4">
          {hasVariables ? (
            // Selection, live status and the primary copy button live right
            // here — no separate section, no "go pick a value below" note.
            <VariableSelector promptText={prompt.promptText} variables={prompt.variables} />
          ) : (
            <div className="flex flex-col gap-4">
              {substitutable.length === 0 ? null : (
                // Tokens with no curated option list: say so rather than let the
                // reader paste `[PRODUCT NAME]` into a generator unchanged.
                <Panel tone="warning">
                  <p>{`本页未收录这些变量的候选取值，复制后请自行替换：${substitutable.join("、")}。`}</p>
                </Panel>
              )}
              {reference.length === 0 ? null : (
                // `@img1` is a reference-image placeholder, not text you can
                // type in — "自行替换" would be misleading here.
                <Panel tone="note">
                  <p>{`需附上参考图：${reference.join("、")}。`}</p>
                </Panel>
              )}
              <div>
                <CopyPromptButton text={prompt.promptText} targetId={PROMPT_TEXT_ID} />
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* --------------------------------------------------------- inputs */}
      {!showInputs ? null : (
        <Section id="prompt-inputs" title="输入">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-bold tracking-wider uppercase">必需输入</h3>
              {prompt.requiredInputs.length === 0 ? (
                <p className="mt-2 text-sm font-medium">无</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1 text-sm font-medium">
                  {prompt.requiredInputs.map((input) => (
                    <li key={input}>{input}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wider uppercase">可选输入</h3>
              {prompt.optionalInputs.length === 0 ? (
                <p className="mt-2 text-sm font-medium">无</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1 text-sm font-medium">
                  {prompt.optionalInputs.map((input) => (
                    <li key={input}>{input}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* ----------------------------------------------------- parameters */}
      {prompt.parameters.length === 0 ? null : (
        <Section
          id="prompt-parameters"
          title="参数"
          description="提示词尾部已经写死的渲染参数，复制时不要删。"
        >
          <dl className="grid gap-3 sm:grid-cols-2">
            {prompt.parameters.map((parameter) => (
              <div
                key={`${parameter.label}-${parameter.value}`}
                className="border-2 border-foreground bg-surface p-3"
              >
                <dt className="text-xs font-bold tracking-wider uppercase">{parameter.label}</dt>
                <dd className="mt-1 font-mono text-sm font-bold">{parameter.value}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {/* ---------------------------------------------------------- steps */}
      {prompt.steps.length === 0 ? null : (
        <Section id="prompt-steps" title="使用步骤">
          <ol className="flex flex-col gap-4">
            {prompt.steps.map((step) => (
              <li key={step.order} className="flex gap-4 border-2 border-foreground bg-surface p-4">
                <span className="font-mono text-lg font-black tabular-nums">
                  {step.order.toString().padStart(2, "0")}
                </span>
                <span>
                  <span className="block font-bold">{step.title}</span>
                  <span className="mt-1 block text-sm font-medium">
                    {formatStepBody(step.title, step.body, prompt.promptText)}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* ------------------------------------------------------ variations */}
      {prompt.variations.length === 0 ? null : (
        <Section
          id="prompt-variations"
          title="同系列"
          description="同一条提示词换不同取值的效果方向。示例图尚未生成。"
        >
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {prompt.variations.map((variation) => (
              <li
                key={variation.title}
                className="flex flex-col gap-2 border-2 border-foreground bg-surface p-4"
              >
                <span aria-hidden="true" className="flex items-center gap-2">
                  <GeometricMark shape="square" color="blue" className="size-4" />
                  <GeometricMark shape="circle" color="red" className="size-4" />
                </span>
                <p className="text-xs font-bold tracking-wider uppercase">待生成</p>
                <p className="font-bold">{variation.title}</p>
                <p className="font-mono text-xs font-bold">
                  {variationToken === null
                    ? variation.variableValue
                    : `${variationToken} = ${variation.variableValue}`}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* --------------------------------------------------------- source */}
      <Section id="prompt-source-info" title="来源">
        <Panel>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold tracking-wider uppercase">创作者</dt>
              <dd className="mt-1">
                <a
                  href={prompt.creator.url}
                  target="_blank"
                  rel="noopener nofollow"
                  className="font-bold underline"
                >
                  {prompt.source.handle}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold tracking-wider uppercase">粉丝</dt>
              <dd className="mt-1 font-bold tabular-nums">
                {prompt.creator.followers === null ? "未收录" : formatCount(prompt.creator.followers)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold tracking-wider uppercase">发布时间</dt>
              <dd className="mt-1 font-bold">
                {prompt.source.publishedAt === null ? (
                  "日期未收录"
                ) : (
                  <time dateTime={prompt.source.publishedAt}>{prompt.source.publishedAt}</time>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold tracking-wider uppercase">平台</dt>
              {/* Uppercased as text, not by CSS, so the accessible name and a
                  copied selection read "X" like the platform's own branding. */}
              <dd className="mt-1 font-bold">{prompt.source.platform.toUpperCase()}</dd>
            </div>
          </dl>
          <p className="mt-4">提示词由作者在原帖中公开分享，本页逐字保留。</p>
          <p className="mt-4">
            <a
              href={prompt.source.url}
              target="_blank"
              rel="noopener nofollow"
              className={buttonClassName({ variant: "outline" })}
            >
              查看原帖 ↗<span className="sr-only">（在新标签页打开 X）</span>
            </a>
          </p>
        </Panel>
      </Section>

      {/* -------------------------------------------------------- metrics */}
      <Section id="prompt-metrics" title="互动数据">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {metrics.map((metric) => (
            <li key={metric.label} className="border-2 border-foreground bg-surface p-3">
              <p className="font-mono text-2xl font-black tabular-nums">
                {metric.value === null ? "—" : formatCount(metric.value)}
              </p>
              <p className="text-xs font-bold tracking-wider uppercase">{metric.label}</p>
              {metric.value === null ? (
                <p className="mt-1 text-xs font-medium">未收录</p>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs font-medium">{`观测于 ${prompt.metrics.observedAt}，之后未再更新。`}</p>
      </Section>

      {/* -------------------------------------------------------- related */}
      <Section id="prompt-related" title="相关">
        {relatedGroups.length === 0 ? (
          <StateBlock variant="empty" message="库中暂时没有与这条提示词相关的其它条目。" />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {relatedGroups.map((group) => (
              <div key={group.key}>
                <h3 className="text-sm font-bold tracking-wider uppercase">{group.label}</h3>
                <div className="mt-2">
                  <PromptLinkList prompts={group.items} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Visually hidden (position: absolute, out of flow — never the
          `<pre>` above the fold) copy of the substituted text, so the copy
          button's manual-copy fallback selects the same text it would have
          put on the clipboard. Its DOM position doesn't matter for layout. */}
      {!hasVariables ? null : <PromptSubstitutedText />}

      {/* Must stay the LAST in-flow child here: `position: sticky` only
          clamps within this wrapper's own box, so this is what keeps the bar
          from ever sitting on top of the footer (which is outside this
          wrapper) — see `StickyCopyBar` and `PromptStickyCopyBar`. */}
      {hasVariables ? (
        <PromptStickyCopyBar info={sticky} />
      ) : (
        <StickyCopyBar {...sticky} copyText={prompt.promptText} targetId={PROMPT_TEXT_ID} />
      )}
    </div>
  );

  return hasVariables ? (
    <PromptCopyProvider promptText={prompt.promptText} variables={prompt.variables}>
      {content}
    </PromptCopyProvider>
  ) : (
    content
  );
}
