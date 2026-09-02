import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { buttonClassName } from "@/components/ui/Button";
import { ChipLink, chipClassName } from "@/components/ui/Chip";
import { GrowingUnderline } from "@/components/ui/GrowingUnderline";
import { HairlineList, HairlineRow } from "@/components/ui/HairlineList";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { MEDIA_SIZES } from "@/components/ui/media-sizes";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import { cx } from "@/components/ui/class-names";
import { dividerClassName } from "@/components/ui/dividers";
import {
  controlLabelClassName,
  figureClassName,
  microLabelClassName,
  recordTitleClassName,
} from "@/components/ui/type-scale";
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

/**
 * One key/value line of the 原帖信息 record: a `row`-tier hairline, the
 * lightest of the three tiers, because four of them stacked is precisely the
 * density that tier is drawn light for.
 */
const SOURCE_ROW = dividerClassName("row", "top", {
  className: "flex items-baseline justify-between gap-4 py-2",
});

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

/**
 * 必需输入 / 可选输入: a dense list of literals, so it is set as one — each
 * item on the lightest divider tier, the last one without a rule. It is not a
 * `HairlineList`: nothing here navigates, and a row that carries a chevron but
 * no destination promises something it cannot do.
 */
function InputList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div>
      <h3 className={microLabelClassName()}>{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm font-medium">无</p>
      ) : (
        <ul className="mt-2 flex flex-col text-sm font-medium">
          {items.map((input, index) => (
            <li
              key={input}
              className={cx(
                "py-2",
                index === items.length - 1 ? undefined : dividerClassName("row", "bottom"),
              )}
            >
              {input}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * `相关` is a dense text index, so it is deliberately NOT made of cards.
 *
 * Thirty bordered boxes holding one phrase each is noise that competes with
 * the prompt itself; demoted to hairline rows (the lightest divider tier, no
 * frame, no shadow, no fill, a chevron that only appears on hover OR focus)
 * the same index takes a quarter of the space and the page's real cards go
 * back to being its only heavy objects. Same links, same labels, same order.
 */
function RelatedColumn({ title, items }: { title: string; items: readonly RelatedLink[] }) {
  return (
    <div>
      <h3 className={microLabelClassName()}>{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm font-medium">这条提示词还没有可归类的同类条目。</p>
      ) : (
        <HairlineList className="mt-2">
          {items.map((item, index) => {
            const last = index === items.length - 1;
            // No destination in this phase: `HairlineRow`'s own non-link
            // variant — same tier, same 44px floor, no chevron and no anchor,
            // never a `#` link (constraint 5). An arrow on something that
            // navigates nowhere is a lie.
            return (
              <HairlineRow
                key={item.label}
                href={item.href ?? undefined}
                external={item.external}
                last={last}
              >
                {item.label}
                {item.note === undefined ? null : <span>{item.note}</span>}
              </HairlineRow>
            );
          })}
        </HairlineList>
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

  /* ---------------------------------------------------------------- blocks */

  // `prompt.parameters` is deliberately not part of this test — see the block
  // itself for why the 参数 sub-block is gone.
  const showInputsBlock = prompt.requiredInputs.length > 0 || prompt.optionalInputs.length > 0;

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
          {/* The kicker: one row, before the H1 — model · platform ·
              technique/style. The prototype opened it with a solid `Prompt`
              pill, which is gone: it was the highest-contrast object above the
              H1 and it named the category every page on this site belongs to,
              so it displaced the record's own title while saying nothing about
              it. The chips that remain each carry a fact about THIS prompt. */}
          <div className="flex flex-wrap items-center gap-2">
            {prompt.models.map((term) => (
              <TermChip key={term.id} locale={locale} term={term} />
            ))}
            <span className={chipClassName(false)}>{PLATFORM_LABEL}</span>
            {[...prompt.techniques, ...prompt.styles].map((term) => (
              <TermChip key={term.id} locale={locale} term={term} />
            ))}
          </div>

          <h1 className={recordTitleClassName("mt-4 uppercase")}>{prompt.title}</h1>

          {prompt.summary === null ? null : (
            <p className="mt-4 max-w-prose text-base font-medium whitespace-pre-line md:text-lg">
              {prompt.summary}
            </p>
          )}

          <p className="mt-5 text-sm font-medium">
            由{" "}
            {/*
              Hover expression ④: the underline grows from zero rather than
              sitting there. `no-underline` suppresses the document-wide hover
              underline so the two never draw at once; the link stays bold
              against `font-medium` prose, so weight — not colour and not the
              bar — is what marks it as a link at rest, and the bar answers
              focus as well as hover.
            */}
            <a
              href={prompt.creator.url}
              target="_blank"
              rel="noopener nofollow"
              className="group font-bold no-underline"
            >
              <GrowingUnderline>{creatorHandle}</GrowingUnderline>
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
              className={dividerClassName("card", "all")}
            />
            {thumbnails.length === 0 ? null : (
              <ul className="mt-2 grid grid-cols-3 gap-2">
                {thumbnails.map((item) => (
                  // The frame belongs to the media, not to the `<li>`. When
                  // both drew one, `MediaFrame`'s own compartment rule
                  // (`border-b-2 md:border-b-4`) stacked on the item's
                  // `border-2` and the thumbnail wore a 6px bottom edge against
                  // 2px sides. One source per side, and it is the same
                  // `card`-tier frame the hero above wears.
                  <li key={item.id}>
                    <MediaFrame
                      src={item.src}
                      srcSet={item.srcSet}
                      sizes={MEDIA_SIZES.detailThumbnail}
                      alt={item.alt}
                      width={item.width}
                      height={item.height}
                      label={item.label}
                      className={dividerClassName("card", "all")}
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
        {/*
          One column, not two. The second column used to hold the 用这条提示词生成
          card — a button that does nothing (`生成功能尚未接入`) wrapped around a
          sentence that 使用步骤 restates verbatim in steps 01–03, four hundred
          pixels below, charged to the width of the payload. `frontend/CLAUDE.md`
          §6 lists 隐藏 first among the two honest treatments for a capability
          the app does not have, and this one earns it: nothing is lost but the
          width, and the width goes back to the prompt.
        */}
        <div>
          {/* The prototype's payload box: a bar carrying the language +
              counted variable total and the primary copy button, over the
              verbatim prompt. `bg-surface` on the box, not only on the
              `<pre>`, because the prompt is now set to a measure and the
              paper has to run to the frame. */}
          <div className={dividerClassName("card", "all", { className: "bg-surface" })}>
            <div
              className={dividerClassName("card", "bottom", {
                className: "flex flex-wrap items-center justify-between gap-3 bg-muted px-4 py-2",
              })}
            >
              <span className={controlLabelClassName()}>
                {promptLanguageLabel(prompt.promptLanguage, prompt.promptText)}
              </span>
              {/*
                Hidden below `md`, where `StickyCopyBar` is pinned ~185px
                away and the two identical red 复制提示词 buttons were on
                screen at once. `display: none` — so it is out of the
                accessibility tree and out of the tab order there, rather
                than a second invisible stop. Both paths copy the same
                substituted text (`PromptCopyProvider`), so which one the
                reader reaches is a layout question, never a content one.
              */}
              <span className="hidden md:inline-flex">
                {hasVariables ? (
                  <PromptCopyButton />
                ) : (
                  <CopyPromptButton text={prompt.promptText} targetId={PROMPT_TEXT_ID} />
                )}
              </span>
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
      </Section>

      {/* ----------------------------------------------------------- steps */}
      {prompt.steps.length === 0 ? null : (
        <Section id="prompt-steps" title="使用步骤">
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {prompt.steps.map((step) => (
              <li key={step.order} className={dividerClassName("card", "top", { className: "pt-3" })}>
                <p className={microLabelClassName("font-mono tabular-nums")}>
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

      {/* ---------------------------------------------------------- source */}
      <Section id="prompt-source-info" title="来源">
        <div className="grid gap-4 md:grid-cols-2">
          {/* 原帖信息 reads as a dense RECORD: micro-label keys over
              row-tier hairlines, the lightest of the three divider tiers,
              because a stack of four of them is exactly the density that tier
              exists for. */}
          <Panel>
            <h3 className={microLabelClassName()}>原帖信息</h3>
            <dl className="mt-3">
              <div className={cx(SOURCE_ROW, "first:border-t-0 first:pt-0")}>
                <dt className={microLabelClassName()}>创作者</dt>
                <dd>
                  <a
                    href={prompt.creator.url}
                    target="_blank"
                    rel="noopener nofollow"
                    className="group font-bold no-underline"
                  >
                    <GrowingUnderline>{creatorHandle}</GrowingUnderline>
                  </a>
                </dd>
              </div>
              <div className={SOURCE_ROW}>
                <dt className={microLabelClassName()}>粉丝</dt>
                <dd className="font-bold tabular-nums">
                  {prompt.creator.followers === null
                    ? "未收录"
                    : formatCount(prompt.creator.followers)}
                </dd>
              </div>
              <div className={SOURCE_ROW}>
                <dt className={microLabelClassName()}>发布时间</dt>
                <dd className="font-bold">
                  {prompt.source.publishedAt === null ? (
                    "日期未收录"
                  ) : (
                    <time dateTime={prompt.source.publishedAt}>{prompt.source.publishedAt}</time>
                  )}
                </dd>
              </div>
              <div className={SOURCE_ROW}>
                <dt className={microLabelClassName()}>平台</dt>
                {/* Uppercased as text, not by CSS, so the accessible name and a
                    copied selection read "X" like the platform's own branding. */}
                <dd className="font-bold">{platformName}</dd>
              </div>
            </dl>
            <p className={dividerClassName("row", "top", { className: "mt-4 pt-4" })}>
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

          {/* 互动数据 reads as FIGURES: the display tier on the numbers and
              the micro tier on their captions, so the same Panel chrome no
              longer produces the same block twice. Two columns before `sm`
              keeps a five-glyph mono numeral inside a 320px viewport — the
              display tier is only allowed where it cannot force the page to
              scroll sideways. */}
          <Panel>
            <h3 className={microLabelClassName()}>互动数据</h3>
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {metrics.map((metric) => (
                <li key={metric.label} className="min-w-0 text-center">
                  <p className={figureClassName("font-mono")}>
                    {metric.value === null ? "—" : formatCount(metric.value)}
                    {metric.value === null ? <span className="sr-only">未收录</span> : null}
                  </p>
                  <p className={microLabelClassName("mt-1")}>{metric.label}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs font-medium">{`观测于 ${prompt.metrics.observedAt}，之后未再更新。`}</p>
          </Panel>
        </div>
      </Section>

      {/* --------------------------------------------------------- inputs */}
      {/*
        The 参数 sub-block that used to close this section is gone, and the
        section is named 输入 rather than 输入 / 参数 because of it.

        It printed the prompt's baked-in render parameters as framed value
        chips — `8k resolution`, `octane render`, `tilt-shift lens effect`,
        `shallow depth of field` on the golden record — and every one of those
        strings is a verbatim substring of the prompt block ~1,700px above,
        which this page renders in full and unclipped. Its caption
        (`复制时不要删`) was 使用步骤 02 (`整段复制，不要删减尾部渲染参数`) said
        a second time. A reader who copies the prompt gets the parameters
        whether or not they were listed, and a reader who reads it has already
        read them. `PromptDetail.parameters` is untouched in the data.
      */}
      {!showInputsBlock ? null : (
        <Section id="prompt-inputs" title="输入">
          <div className="grid gap-6 md:grid-cols-2">
            <InputList title="必需输入" items={prompt.requiredInputs} />
            {/* A sub-block whose whole content is 无 is not information. It is
                dropped when empty rather than printed, because 必需输入 beside
                it carries real data and a reader scanning the block should only
                meet the ones that do. 必需输入 keeps its empty state: a prompt
                with no required input is a fact about the prompt worth
                stating. */}
            {prompt.optionalInputs.length === 0 ? null : (
              <InputList title="可选输入" items={prompt.optionalInputs} />
            )}
          </div>
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
