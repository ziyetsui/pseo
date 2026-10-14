import { interfaceLocale, uiText, text, sourceLanguage } from '@/lib/i18n/text';
import { SignInGate } from "@/components/SignInGate";
import Link from "next/link";
import type { Catalog, Prompt } from "@/lib/catalog/types";
import { SiteFooter, SiteHeader } from "@/components/Chrome";
import { RecipeMedia } from "@/components/RecipeMedia";
import { RecipeText } from "@/components/RecipeText";
import { generationLabel } from "@/components/generation-label";
import { isPromptCreator } from "@/lib/catalog/creator-match";
import { websiteViewsForCase } from "@/lib/catalog/website-views";

const number = (value: number | null) => value === null ? "—" : value.toLocaleString("en-US");

/** The Recipe layout is server rendered; only media and placeholder controls hydrate. */
export function Recipe({ catalog, prompt }: { catalog: Catalog; prompt: Prompt }) {
  const uiLocale = interfaceLocale(catalog);
  const creator = catalog.creators.find((item) => isPromptCreator(prompt, item));
  const hasMedia = Boolean(prompt.img || prompt.media.length);
  const websiteViews = websiteViewsForCase(catalog, prompt.id);
  const related = catalog.prompts.filter((item) => item.id !== prompt.id && item.models.some((ref) => prompt.models.some((own) => own.id === ref.id))).slice(0, 3);

  return <div className="prototype-recipe"><div className="v3">
    <SiteHeader bilingual={catalog.mode === 'git-beta'} currentHref={prompt.href} level="prompt" locale={catalog.locale} />
    <main id="main"><div className="wrap">
      
      <div style={{ padding: "26px 0 8px" }}>
        <h1 lang={sourceLanguage(prompt.title)}>{prompt.title}</h1>
        <p className="dek">{uiText(uiLocale, "Four steps from this page to your own version.")}</p>
        <div className="byline">
          <span className="av" aria-hidden="true">{creator?.avatarUrl && <img src={creator.avatarUrl} alt="" width={26} height={26} loading="lazy" referrerPolicy="no-referrer" />}</span>
          <span>{text(uiLocale, "by ", "作者：")}{prompt.source.url ? <a href={prompt.source.url} target="_blank" rel="noopener noreferrer nofollow"><b>{prompt.handle || uiText(uiLocale, "unattributed")}</b></a> : <b>{prompt.handle || uiText(uiLocale, "unattributed")}</b>}{prompt.source.platform && <>{text(uiLocale, " on ", " · ")}{prompt.source.platform.toLowerCase() === "x" ? "X" : prompt.source.platform}</>}</span>
        </div>
      </div>

      <section className="step" aria-labelledby="recipe-result">
        <div className="num" aria-hidden="true">01</div><div>
          <h2 id="recipe-result">{uiText(uiLocale, "See what it makes")}</h2>
          <p className="lede">{hasMedia ? catalog.mode === "git-beta" ? text(uiLocale, "Examples collected with this prompt. Follow the original source for attribution and context.", "随提示词收集的示例。请查看原始来源，了解署名和背景。") : text(uiLocale, "This is the author's own result, straight from the post it was published in.", "这是作者发布的原始生成结果。") : text(uiLocale, "The author published no image with this one, so there is nothing honest to show here.", "作者未随提示词发布图片，因此此处暂无结果可展示。")}</p>
          <RecipeMedia uiLocale={uiLocale} prompt={prompt} />
        </div>
      </section>

      <RecipeText showOriginalLanguage={catalog.mode === 'git-beta'} uiLocale={uiLocale} key={`${prompt.id}:${prompt.locale}:${prompt.revision}`} prompt={prompt} />

      <section className="step" aria-labelledby="recipe-run">
        <div className="num" aria-hidden="true">04</div><div>
          <h2 id="recipe-run">{uiText(uiLocale, "Run it")}</h2>
          <p className="lede">{uiText(uiLocale, "Generation happens in bo. This page hands you the words.")}</p>
          <div className="runrow">
            <div><b>{uiText(uiLocale, "Model")}</b><p>{prompt.models.length ? prompt.models.map((item, index) => <span key={item.id}>{index > 0 && ", "}<Link href={item.href}>{item.label}</Link></span>) : text(uiLocale, "None named — try the one you have", "未注明模型，可尝试你已有的模型")}</p></div>
            <div><b>{uiText(uiLocale, "What to expect")}</b><p>{uiText(uiLocale, "Run four at once; how far the result drifts varies a lot.")}</p></div>
          </div>
          {prompt.requiredInputs.length > 0 && <div className="kv"><span>{uiText(uiLocale, "Required inputs")}</span><span>{prompt.requiredInputs.join(", ")}</span></div>}
          {prompt.optionalInputs.length > 0 && <div className="kv"><span>{uiText(uiLocale, "Optional inputs")}</span><span>{prompt.optionalInputs.join(", ")}</span></div>}
          <div className="acts">
            <a className="btn pri" data-generation-cta="" href="https://bo.video/home" target="_blank" rel="noopener noreferrer">{generationLabel(prompt.kind, uiLocale)}</a>
            <span className="metrics"><span>{prompt.handle || uiText(uiLocale, "unattributed")}</span><span><b>{number(prompt.likes)}</b>{text(uiLocale, " likes", " 次点赞")}</span><span><b>{number(prompt.saves)}</b>{text(uiLocale, " saves", " 次收藏")}</span>{prompt.highValue && <span className="ok">{uiText(uiLocale, "Popular")}</span>}</span>
          </div>
          <div style={{ marginTop: 20 }}>
            {prompt.source.url && <div className="kv"><span>{uiText(uiLocale, "Source")}</span><a href={prompt.source.url} target="_blank" rel="noopener noreferrer nofollow">{uiText(uiLocale, "View the original source ↗")}</a></div>}
            {prompt.evidence.map((item, index) => <div className="kv" key={`${item.type}:${item.url}:${index}`}><span>{text(uiLocale, "Evidence", "依据")} · {item.type}</span>{item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer nofollow">{uiText(uiLocale, "View evidence ↗")}</a> : <span>{uiText(uiLocale, "No public evidence link")}</span>}</div>)}
            {prompt.source.observedAt && <div className="kv"><span>{uiText(uiLocale, "Observed")}</span><time dateTime={prompt.source.observedAt}>{new Date(prompt.source.observedAt).toLocaleDateString(uiLocale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}</time></div>}
            {prompt.useCases.length > 0 && <div className="kv"><span>{uiText(uiLocale, "Use case")}</span><span>{prompt.useCases.map((item, index) => <span key={item.id}>{index > 0 && ", "}<Link href={item.href}>{item.label}</Link></span>)}</span></div>}
            {websiteViews.length > 0 && <div className="kv"><span>{uiText(uiLocale, "Related Website views")}</span><span>{websiteViews.map((view, index) => <span key={view.id}>{index > 0 && " · "}<Link href={view.href}>{view.label}</Link></span>)}</span></div>}
            {related.length > 0 && <div className="kv"><span>{uiText(uiLocale, "More with this model")}</span><span>{related.map((item, index) => <span key={item.id}>{index > 0 && " · "}<Link href={item.href}>{item.title}</Link></span>)}</span></div>}
          </div>
        </div>
      </section>
    </div></main>
    <SiteFooter catalog={catalog} level="prompt" /><SignInGate uiLocale={uiLocale} key={`${prompt.id}:${prompt.locale}`} />
  </div></div>;
}
