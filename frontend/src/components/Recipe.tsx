import { SignInGate } from "@/components/SignInGate";
import Link from "next/link";
import type { Catalog, Prompt } from "@/lib/catalog/types";
import { SiteFooter, SiteHeader } from "@/components/Chrome";
import { RecipeMedia } from "@/components/RecipeMedia";
import { RecipeText } from "@/components/RecipeText";
import { generationLabel } from "@/components/generation-label";
import { isPromptCreator } from "@/lib/catalog/creator-match";

const number = (value: number | null) => value === null ? "—" : value.toLocaleString("en-US");

/** The Recipe layout is server rendered; only media and placeholder controls hydrate. */
export function Recipe({ catalog, prompt }: { catalog: Catalog; prompt: Prompt }) {
  const creator = catalog.creators.find((item) => isPromptCreator(prompt, item));
  const hasMedia = Boolean(prompt.img || prompt.media.length);
  const related = catalog.prompts.filter((item) => item.id !== prompt.id && item.models.some((ref) => prompt.models.some((own) => own.id === ref.id))).slice(0, 3);

  return <div className="prototype-recipe"><div className="v3">
    <SiteHeader level="prompt" locale={catalog.locale} />
    <main id="main"><div className="wrap">
      
      <div style={{ padding: "26px 0 8px" }}>
        <h1 lang={catalog.mode === "visual-fixture" ? "en" : prompt.locale}>{prompt.title}</h1>
        <p className="dek">Four steps from this page to your own version.</p>
        <div className="byline">
          <span className="av" aria-hidden="true">{creator?.avatarUrl && <img src={creator.avatarUrl} alt="" width={26} height={26} loading="lazy" referrerPolicy="no-referrer" />}</span>
          <span>by {prompt.source.url ? <a href={prompt.source.url} target="_blank" rel="noopener noreferrer nofollow"><b>{prompt.handle || "unattributed"}</b></a> : <b>{prompt.handle || "unattributed"}</b>}{prompt.source.platform && <> on {prompt.source.platform.toLowerCase() === "x" ? "X" : prompt.source.platform}</>}</span>
        </div>
      </div>

      <section className="step" aria-labelledby="recipe-result">
        <div className="num" aria-hidden="true">01</div><div>
          <h2 id="recipe-result">See what it makes</h2>
          <p className="lede">{hasMedia ? "This is the author's own result, straight from the post it was published in." : "The author published no image with this one, so there is nothing honest to show here."}</p>
          <RecipeMedia prompt={prompt} />
        </div>
      </section>

      <RecipeText key={`${prompt.id}:${prompt.locale}:${prompt.revision}`} prompt={prompt} />

      <section className="step" aria-labelledby="recipe-run">
        <div className="num" aria-hidden="true">04</div><div>
          <h2 id="recipe-run">Run it</h2>
          <p className="lede">Generation happens in bo. This page hands you the words.</p>
          <div className="runrow">
            <div><b>Model</b><p>{prompt.models.length ? prompt.models.map((item, index) => <span key={item.id}>{index > 0 && ", "}<Link href={item.href}>{item.label}</Link></span>) : "None named — try the one you have"}</p></div>
            <div><b>What to expect</b><p>Run four at once; how far the result drifts varies a lot.</p></div>
          </div>
          {prompt.requiredInputs.length > 0 && <div className="kv"><span>Required inputs</span><span>{prompt.requiredInputs.join(", ")}</span></div>}
          {prompt.optionalInputs.length > 0 && <div className="kv"><span>Optional inputs</span><span>{prompt.optionalInputs.join(", ")}</span></div>}
          <div className="acts">
            <a className="btn pri" data-generation-cta="" href="https://bo.video/home" target="_blank" rel="noopener noreferrer">{generationLabel(prompt.kind)}</a>
            <span className="metrics"><span>{prompt.handle || "unattributed"}</span><span><b>{number(prompt.likes)}</b> likes</span><span><b>{number(prompt.saves)}</b> saves</span>{prompt.highValue && <span className="ok">Popular</span>}</span>
          </div>
          <div style={{ marginTop: 20 }}>
            {prompt.source.url && <div className="kv"><span>Source</span><a href={prompt.source.url} target="_blank" rel="noopener noreferrer nofollow">View the original post ↗</a></div>}
            {prompt.evidence.map((item, index) => <div className="kv" key={`${item.type}:${item.url}:${index}`}><span>Evidence · {item.type}</span>{item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer nofollow">View evidence ↗</a> : <span>No public evidence link</span>}</div>)}
            {prompt.source.observedAt && <div className="kv"><span>Observed</span><time dateTime={prompt.source.observedAt}>{new Date(prompt.source.observedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}</time></div>}
            {prompt.useCases.length > 0 && <div className="kv"><span>Use case</span><span>{prompt.useCases.map((item, index) => <span key={item.id}>{index > 0 && ", "}<Link href={item.href}>{item.label}</Link></span>)}</span></div>}
            {related.length > 0 && <div className="kv"><span>More with this model</span><span>{related.map((item, index) => <span key={item.id}>{index > 0 && " · "}<Link href={item.href}>{item.title}</Link></span>)}</span></div>}
          </div>
        </div>
      </section>
    </div></main>
    <SiteFooter catalog={catalog} level="prompt" /><SignInGate key={`${prompt.id}:${prompt.locale}`} />
  </div></div>;
}
