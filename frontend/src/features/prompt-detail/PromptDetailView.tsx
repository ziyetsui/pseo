import Link from "next/link";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button, buttonClassName } from "@/components/ui/Button";
import { ChipLink, chipClassName } from "@/components/ui/Chip";
import { GeometricMark } from "@/components/ui/GeometricMark";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { MEDIA_SIZES } from "@/components/ui/media-sizes";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import { CopyPromptButton } from "@/features/prompt/CopyPromptButton";
import { queryHref } from "@/features/search/query-links";
import {
  formatCreatorHandle,
  type Locale,
  type PromptDetail,
  type Taxonomy,
} from "@/lib/content";
import { promptsHome } from "@/lib/i18n/routes";
import type { BreadcrumbItem } from "@/lib/seo/json-ld";

import {
  PromptCopyButton,
  PromptCopyProvider,
  PromptStickyCopyBar,
  PromptSubstitutedText,
} from "./PromptCopyProvider";
import { PromptSourceText } from "./PromptSourceText";
import { StickyCopyBar } from "./StickyCopyBar";
import { VariableSelector } from "./VariableSelector";
import { taxonomyHref, taxonomyLabel } from "./taxonomy-links";
import {
  formatStepBody,
  promptLanguageLabel,
  promptTokens,
  splitTokenKinds,
  tokenOccurrences,
  variationVariableName,
} from "./variable-view";

/** Id of the `<pre>` — the copy fallback target when there is nothing to
 * substitute (no variables means the visible original already is the text a
 * plain copy button would put on the clipboard). */
const PROMPT_TEXT_ID = "prompt-text";

/**
 * The platform this library collects prompts for, as the prototype's third
 * kicker chip writes it. It is a property of the site (see `SITE_NAME`,
 * `Higgsfield 提示词库`), not of an individual record, so it is a constant here
 * rather than a per-prompt field pretending to be measured data.
 */
const PLATFORM_LABEL = "Higgsfield";

/** The generator the prototype's CTA card sends readers to. Not built yet. */
const GENERATOR_NAME = "bo";
const GENERATOR_DISABLED_REASON = "生成功能尚未接入";

export interface PromptDetailViewProps {
  prompt: PromptDetail;
  locale: Locale;
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

/** A taxonomy chip: a link when the term has a real destination, else text. */
function TermChip({ locale, term }: { locale: Locale; term: Taxonomy }) {
  const href = taxonomyHref(locale, term);
  const label = taxonomyLabel(term);
  // No page and no filter axis: plain text beats a dead link, at the same size
  // as the linked chips so a row never reads as two kinds of chip.
  return href === null ? (
    <span className={chipClassName(false)}>{label}</span>
  ) : (
    <ChipLink href={href} label={label} />
  );
}

interface RelatedLink {
  label: string;
  /** `null` renders as plain text — never a `#` (global constraint 5). */
  href: string | null;
  external?: boolean;
  note?: string;
}

function RelatedColumn({ title, items }: { title: string; items: readonly RelatedLink[] }) {
  return (
    <div>
      <h3 className="text-xs font-bold tracking-widest uppercase">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm font-medium">这条提示词还没有可归类的同类条目。</p>
      ) : (
        <ul className="mt-2 flex flex-col">
          {items.map((item) => (
            <li key={item.label} className="border-b-2 border-foreground/20">
              {item.href === null ? (
                <span className="flex min-h-11 items-center py-1 text-sm font-medium">
                  {item.label}
                  {item.note === undefined ? null : <span>{item.note}</span>}
                </span>
              ) : item.external === true ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener nofollow"
                  className="flex min-h-11 items-center py-1 text-sm font-bold underline"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  href={item.href}
                  className="flex min-h-11 items-center py-1 text-sm font-bold underline"
                >
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PromptDetailView({ prompt, locale, breadcrumbs }: PromptDetailViewProps) {
  const tokens = promptTokens(prompt.promptText);
  const { substitutable, reference } = splitTokenKinds(tokens);
  const hasVariables = prompt.variables.length > 0;
  const [primary] = prompt.variables;
  const [hero, ...thumbnails] = prompt.media;
  const model = prompt.models[0];
  const modelLabel = model === undefined ? null : taxonomyLabel(model);
  const creatorHandle = formatCreatorHandle(prompt.source.handle);
  const platformName = prompt.source.platform.toUpperCase();

  const sticky = {
    title: prompt.title,
    meta: [modelLabel, creatorHandle].filter((part): part is string => part !== null).join(" · "),
    sourceUrl: prompt.source.url,
  };

  /* ------------------------------------------------------------- copy text */

  // Every "N 处" on the page is counted from the shipped prompt text; the
  // prototype's literal "7 处" never reaches a rendering path (constraint 9).
  const primaryToken = primary?.token ?? substitutable[0] ?? null;
  const primaryCount = primaryToken === null ? 0 : tokenOccurrences(prompt.promptText, primaryToken);
  /** `国家` → the noun the prototype's copy plugs into "替换…名". */
  const primaryNoun = primary?.label ?? null;

  const promptDescription =
    primaryToken === null
      ? "原文完整保留。"
      : `原文完整保留。高亮 ${primaryToken} 为变量，全文出现 ${primaryCount} 次，${
          primaryNoun === null ? "替换为同一取值即可使用。" : `替换为同一${primaryNoun}名即可使用。`
        }`;

  // The record's own sentence about what this variable drives, carried by the
  // extractor from the source page (`PromptVariable.note`). A record without
  // one falls back to a sentence built from the counted occurrences, which
  // asserts nothing this data cannot back.
  const variableNote =
    primary?.note ??
    (primaryToken === null
      ? null
      : `${primaryToken} 同时驱动全文 ${primaryCount} 处描述 —— 换一个取值即可得到一整套自洽的新画面。`);

  const generatorHint =
    modelLabel === null
      ? `在 ${GENERATOR_NAME} 中粘贴提示词${primaryNoun === null ? "" : `并替换${primaryNoun}名`}。`
      : `在 ${GENERATOR_NAME} 中选择 ${modelLabel}，粘贴提示词${
          primaryNoun === null ? "" : `并替换${primaryNoun}名`
        }。`;

  /* ---------------------------------------------------------------- blocks */

  const showInputsBlock =
    prompt.requiredInputs.length > 0 ||
    prompt.optionalInputs.length > 0 ||
    prompt.parameters.length > 0;

  const metrics = [
    { label: "浏览", value: prompt.metrics.views },
    { label: "点赞", value: prompt.metrics.likes },
    { label: "收藏", value: prompt.metrics.bookmarks },
    { label: "转发", value: prompt.metrics.reposts },
    { label: "评论", value: prompt.metrics.replies },
    { label: "引用", value: prompt.metrics.quotes },
  ];

  /*
   * `相关` follows the prototype's semantics: each column links *collections*
   * of prompts (a model page, the filtered library, the creator's own profile),
   * never a single other prompt. Anything with no page in this phase is plain
   * text rather than a link into a route that does not exist (constraint 5).
   */
  const sameModelLinks: RelatedLink[] = [
    ...prompt.models.map((term) => ({
      label: `${taxonomyLabel(term)} 全部提示词`,
      href: taxonomyHref(locale, term),
    })),
    { label: `${PLATFORM_LABEL} 平台提示词`, href: promptsHome(locale) },
  ];

  const sameUseCaseLinks: RelatedLink[] = [
    ...prompt.useCases,
    ...prompt.subjects,
    ...prompt.techniques,
  ].map((term) => ({ label: taxonomyLabel(term), href: taxonomyHref(locale, term) }));

  const sameCreatorLinks: RelatedLink[] = [
    { label: `${creatorHandle} 的主页`, href: prompt.creator.url, external: true },
    { label: "该作者其他提示词", href: queryHref(promptsHome(locale), { q: prompt.source.handle }) },
  ];

  const content = (
    <div className="mx-auto max-w-5xl px-4 pt-8 pb-8 md:px-8 md:pt-12 md:pb-16">
      <Breadcrumb items={breadcrumbs} />

      {/* ------------------------------------------------------------ hero */}
      <header className="mt-8 grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-start md:gap-12">
        <div>
          {/* The prototype's kicker: one row, before the H1 —
              `Prompt`(solid) · model · platform · technique/style. */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={chipClassName(true)}>Prompt</span>
            {prompt.models.map((term) => (
              <TermChip key={term.id} locale={locale} term={term} />
            ))}
            <span className={chipClassName(false)}>{PLATFORM_LABEL}</span>
            {[...prompt.techniques, ...prompt.styles].map((term) => (
              <TermChip key={term.id} locale={locale} term={term} />
            ))}
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tighter uppercase md:text-5xl">
            {prompt.title}
          </h1>

          {prompt.summary === null ? null : (
            <p className="mt-4 max-w-prose text-base font-medium whitespace-pre-line md:text-lg">
              {prompt.summary}
            </p>
          )}

          <p className="mt-5 text-sm font-medium">
            由{" "}
            <a
              href={prompt.creator.url}
              target="_blank"
              rel="noopener nofollow"
              className="font-bold underline"
            >
              {creatorHandle}
            </a>{" "}
            发布于 {platformName} ·{" "}
            {prompt.source.publishedAt === null ? (
              <span>日期未收录</span>
            ) : (
              <time dateTime={prompt.source.publishedAt}>{prompt.source.publishedAt}</time>
            )}
          </p>
        </div>

        {hero === undefined ? null : (
          <div>
            <MediaFrame
              src={hero.src}
              srcSet={hero.srcSet}
              sizes={MEDIA_SIZES.detailHero}
              alt={hero.alt}
              width={hero.width}
              height={hero.height}
              label={hero.label}
              priority
              className="border-2 border-foreground md:border-4"
            />
            {thumbnails.length === 0 ? null : (
              <ul className="mt-2 grid grid-cols-3 gap-2">
                {thumbnails.map((item) => (
                  <li key={item.id} className="border-2 border-foreground">
                    <MediaFrame
                      src={item.src}
                      srcSet={item.srcSet}
                      sizes={MEDIA_SIZES.detailThumbnail}
                      alt={item.alt}
                      width={item.width}
                      height={item.height}
                      label={item.label}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </header>

      {/* ---------------------------------------------------------- prompt */}
      <Section id="prompt-source" title="提示词" description={promptDescription}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <div>
            {/* The prototype's payload box: a bar carrying the language +
                counted variable total and the primary copy button, over the
                verbatim prompt. */}
            <div className="border-2 border-foreground md:border-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-foreground bg-muted px-4 py-2 md:border-b-4">
                <span className="text-sm font-bold tracking-wider uppercase">
                  {promptLanguageLabel(prompt.promptLanguage, prompt.promptText)}
                </span>
                {hasVariables ? (
                  <PromptCopyButton />
                ) : (
                  <CopyPromptButton text={prompt.promptText} targetId={PROMPT_TEXT_ID} />
                )}
              </div>
              <PromptSourceText id={PROMPT_TEXT_ID} text={prompt.promptText} tokens={tokens} />
            </div>

            {variableNote === null ? null : (
              <p className="mt-4 text-sm font-medium">{variableNote}</p>
            )}

            {hasVariables || substitutable.length === 0 ? null : (
              // Tokens with no curated option list: say so rather than let the
              // reader paste `[PRODUCT NAME]` into a generator unchanged.
              <Panel tone="warning" className="mt-4">
                <p>{`本页未收录这些变量的候选取值，复制后请自行替换：${substitutable.join("、")}。`}</p>
              </Panel>
            )}

            {reference.length === 0 ? null : (
              // `@img1` is a reference-image placeholder, not text you can type
              // in — "自行替换" would be misleading here.
              <Panel tone="note" className="mt-4">
                <p>{`需附上参考图：${reference.join("、")}。`}</p>
              </Panel>
            )}
          </div>

          {/* The prototype's CTA card. The generator is not wired up in this
              phase, so the button is `aria-disabled` with a visible reason
              rather than a link to nowhere (constraint 12). */}
          <aside aria-label="用这条提示词生成" className="border-2 border-foreground p-4">
            <p className="font-bold">用这条提示词生成</p>
            <p className="mt-2 text-sm font-medium">{generatorHint}</p>
            <p className="mt-4">
              <Button disabled disabledReason={GENERATOR_DISABLED_REASON}>
                去 {GENERATOR_NAME} 生成 →
              </Button>
            </p>
          </aside>
        </div>
      </Section>

      {/* ----------------------------------------------------------- steps */}
      {prompt.steps.length === 0 ? null : (
        <Section id="prompt-steps" title="使用步骤">
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {prompt.steps.map((step) => (
              <li key={step.order} className="border-t-2 border-foreground pt-3 md:border-t-4">
                <p className="font-mono text-xs font-bold tabular-nums">
                  {step.order.toString().padStart(2, "0")}
                </p>
                <p className="mt-2 font-bold">{step.title}</p>
                <p className="mt-1 text-sm font-medium">
                  {formatStepBody(step.title, step.body, prompt.promptText)}
                </p>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* ------------------------------------------------------- variables */}
      {!hasVariables || primary === undefined ? null : (
        <Section
          id="prompt-variables"
          title={`换个${primary.label}试试`}
          description={`选择${primary.label}后点击复制，提示词中 ${tokenOccurrences(
            prompt.promptText,
            primary.token,
          )} 处 ${primary.token} 将自动替换。`}
        >
          <VariableSelector variables={prompt.variables} />
        </Section>
      )}

      {/* ------------------------------------------------------ variations */}
      {prompt.variations.length === 0 ? null : (
        <Section
          id="prompt-variations"
          title="同系列"
          description={
            primary === undefined
              ? "同一提示词换不同取值的效果方向。"
              : `同一提示词换不同${primary.label}的效果方向。`
          }
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
                  {primary === undefined
                    ? variation.variableValue
                    : `${variationVariableName(primary.token)} = ${variation.variableValue}`}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ---------------------------------------------------------- source */}
      <Section id="prompt-source-info" title="来源">
        <div className="grid gap-4 md:grid-cols-2">
          <Panel>
            <h3 className="text-xs font-bold tracking-widest uppercase">原帖信息</h3>
            <dl className="mt-3">
              <div className="flex items-baseline justify-between gap-4 border-t-2 border-foreground/20 py-2 first:border-t-0 first:pt-0">
                <dt>创作者</dt>
                <dd>
                  <a
                    href={prompt.creator.url}
                    target="_blank"
                    rel="noopener nofollow"
                    className="font-bold underline"
                  >
                    {creatorHandle}
                  </a>
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t-2 border-foreground/20 py-2">
                <dt>粉丝</dt>
                <dd className="font-bold tabular-nums">
                  {prompt.creator.followers === null
                    ? "未收录"
                    : formatCount(prompt.creator.followers)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t-2 border-foreground/20 py-2">
                <dt>发布时间</dt>
                <dd className="font-bold">
                  {prompt.source.publishedAt === null ? (
                    "日期未收录"
                  ) : (
                    <time dateTime={prompt.source.publishedAt}>{prompt.source.publishedAt}</time>
                  )}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t-2 border-foreground/20 py-2">
                <dt>平台</dt>
                {/* Uppercased as text, not by CSS, so the accessible name and a
                    copied selection read "X" like the platform's own branding. */}
                <dd className="font-bold">{platformName}</dd>
              </div>
            </dl>
            <p className="mt-4 border-t-2 border-foreground/20 pt-4">
              提示词由作者在原帖中公开分享，本页逐字保留。
            </p>
            <p className="mt-4">
              <a
                href={prompt.source.url}
                target="_blank"
                rel="noopener nofollow"
                className={buttonClassName({ variant: "outline" })}
              >
                查看原帖 ↗<span className="sr-only">（在新标签页打开 {platformName}）</span>
              </a>
            </p>
          </Panel>

          <Panel>
            <h3 className="text-xs font-bold tracking-widest uppercase">互动数据</h3>
            <ul className="mt-3 grid grid-cols-3 gap-3">
              {metrics.map((metric) => (
                <li key={metric.label} className="text-center">
                  <p className="font-mono text-xl font-black tabular-nums">
                    {metric.value === null ? "—" : formatCount(metric.value)}
                    {metric.value === null ? <span className="sr-only">未收录</span> : null}
                  </p>
                  <p className="text-xs font-bold tracking-wider uppercase">{metric.label}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs font-medium">{`观测于 ${prompt.metrics.observedAt}，之后未再更新。`}</p>
          </Panel>
        </div>
      </Section>

      {/* -------------------------------------------------- inputs / params */}
      {!showInputsBlock ? null : (
        <Section id="prompt-inputs" title="输入 / 参数">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-xs font-bold tracking-widest uppercase">必需输入</h3>
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
              <h3 className="text-xs font-bold tracking-widest uppercase">可选输入</h3>
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

          {prompt.parameters.length === 0 ? null : (
            <div className="mt-6">
              <h3 className="text-xs font-bold tracking-widest uppercase">参数</h3>
              <p className="mt-2 text-sm font-medium">
                提示词尾部已经写死的渲染参数，复制时不要删。
              </p>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                {prompt.parameters.map((parameter) => (
                  <div
                    key={`${parameter.label}-${parameter.value}`}
                    className="border-2 border-foreground bg-surface p-3"
                  >
                    <dt className="text-xs font-bold tracking-wider uppercase">
                      {parameter.label}
                    </dt>
                    <dd className="mt-1 font-mono text-sm font-bold">{parameter.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </Section>
      )}

      {/* --------------------------------------------------------- related */}
      <Section id="prompt-related" title="相关">
        <div className="grid gap-6 md:grid-cols-3">
          <RelatedColumn title="同模型" items={sameModelLinks} />
          <RelatedColumn title="同用途" items={sameUseCaseLinks} />
          <RelatedColumn title="同创作者" items={sameCreatorLinks} />
        </div>
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
