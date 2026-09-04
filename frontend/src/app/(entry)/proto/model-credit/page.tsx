/* PROTOTYPE — /proto/model-credit
 *
 * Round four, restored. The credit-line exploration that was reverted on 2026-09-04,
 * rebuilt verbatim at its own route so /proto/model-hero keeps its five heroes
 * and its open decision. Nothing in production imports this directory. Delete the whole
 * directory when the decision is written down.
 *
 * What changed from round two: the page below the first screen is no longer a
 * stub. It is the real AnthologyReader, the real Creators band and the real
 * SiteFooter, so "keep Anthology all the way to the footer" is literally true
 * and the hero is judged against the body it will actually ship above.
 *
 * Two clearly-marked suppressions make that graft work (see proto.css):
 *   - AnthologyReader's own heading block is hidden, because the variant hero
 *     now carries the H1. Its index (.toc) is kept — that is real navigation.
 *   - AnthologyReader's "Write your own" scratchpad is hidden, because the
 *     composer has moved to the first screen and two composers on one page is
 *     not a design anyone is choosing. Promoting any variant means deleting
 *     that section for real, along with its "The box comes last on purpose"
 *     copy, which the new first screen directly contradicts.
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadCatalog } from "@/lib/catalog/server";
import { modelFamilies, promptsForFamily } from "@/lib/catalog/model-families";
import { SiteHeader, SiteFooter } from "@/components/Chrome";
import { AnthologyReader } from "@/components/AnthologyReader";
import { Creators } from "@/components/Browse";
import { Harness, type ProtoModel, type ProtoPrompt } from "./Harness";
import "./proto.css";

export const metadata: Metadata = { title: "Prototype · model page credit line", robots: "noindex, nofollow" };

/* Dev-only and fails closed: `output: 'export'` would otherwise carry the
 * prototype into a production build. Not notFound(), because that breaks the
 * static export rather than emptying the page. */
const DEV = process.env.NODE_ENV !== "production";

/* PROTOTYPE-ONLY. Every prompt currently has actions.tryUrl === null, which is
 * why the real page's Generate button is disabled. If the prototype inherited
 * that, every variant would show a dead button and none could be judged. Two
 * out of three records get this sentinel — an inert fragment, not a URL
 * pretending to be a service — and the rest keep null so the disabled path
 * stays visible. Production reads the real value from the snapshot. */
const PROTOTYPE_ONLY_FAKE_TRY_URL = "#prototype-only-no-real-endpoint";

export default async function Page() {
  if (!DEV) return <main className="route-state"><h1>Not available</h1><p>This prototype route only renders in development.</p></main>;
  const catalog = await loadCatalog("zh-CN");
  const family = modelFamilies(catalog).find((item) => item.slug === "nano-banana");
  if (!family) notFound();
  const rows = promptsForFamily(catalog.prompts, family);
  const members = catalog.models.filter((ref) => family.memberSlugs.includes(ref.slug));
  const jsonCount = rows.filter((prompt) => /^\s*[[{]/.test(prompt.prompt)).length;

  const prompts: ProtoPrompt[] = rows.map((prompt, index) => ({
    id: prompt.id,
    title: prompt.title,
    href: prompt.href,
    text: prompt.prompt,
    kind: prompt.kind,
    handle: prompt.handle || "unattributed",
    img: prompt.img,
    likes: prompt.likes,
    locale: prompt.locale,
    models: prompt.models.map((ref) => ref.label),
    tags: [...prompt.useCases, ...prompt.styles, ...prompt.subjects].map((ref) => ref.label),
    variables: prompt.variables
      .filter((variable, i, all) => variable.token && prompt.prompt.includes(variable.token) && all.findIndex((item) => item.token === variable.token) === i)
      .map((variable) => ({ token: variable.token, label: variable.label, defaultValue: variable.defaultValue, options: variable.options })),
    tryUrl: prompt.actions.tryUrl ?? (index % 3 === 2 ? null : PROTOTYPE_ONLY_FAKE_TRY_URL),
  }));

  const model: ProtoModel = {
    label: family.label,
    locale: catalog.locale,
    members: members.map((ref) => ({ id: ref.id, label: ref.label, href: ref.href })),
    total: rows.length,
    shortest: rows.length ? Math.min(...rows.map((p) => p.prompt.length)) : 0,
    longest: rows.length ? Math.max(...rows.map((p) => p.prompt.length)) : 0,
  };

  const familyCatalog = { ...catalog, prompts: rows };

  return <div className="prototype-anthology mh-root"><div className="v4">
    <SiteHeader level="model" locale={catalog.locale} />
    <div className="page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <a href={`/${catalog.locale}/prompts`}>Prompt Library</a><span>/</span>
        <a href={`/${catalog.locale}/prompts/image`}>Images</a><span>/</span>
        <a href={`/${catalog.locale}/prompts/models`}>Models</a><span>/</span>
        <span>{model.label}</span>
      </nav>
      <main id="main">
        <Harness model={model} prompts={prompts} />

        {/* Everything below is the shipping page, not an imitation of it. */}
        <div className="mh-real">
          <AnthologyReader catalog={familyCatalog} model={family} members={members} />
          <Creators catalog={catalog} prompts={rows} model />
          {/* Lifted verbatim from components/Anthology.tsx so the tail matches
              production; the real component renders its own hero, which is why
              it is not simply mounted whole. */}
          <section className="sec"><div className="sec-head"><h2>About this model family</h2></div><div className="about">
            <div className="mock"><div className="bar"><i /><i /><i /></div><div className="bd"><h3>What is here</h3>
              <p><b>{model.label}</b> — {rows.length} of the {catalog.prompts.length} prompts in this library name at least one model in this family.</p></div></div>
            <div className="mock"><div className="bar"><i /><i /><i /></div><div className="bd"><h3>What this page is</h3>
              <p>This page is about <b>who wrote these prompts and how they turned out</b>. For pricing and capabilities, go to the model&apos;s own documentation.</p></div></div>
            <div className="mock"><div className="bar"><i /><i /><i /></div><div className="bd"><h3>How to read them</h3>
              <p><b>{jsonCount} of the {rows.length} are raw JSON</b> pasted straight from the author&apos;s post. Copy the whole block, replace only what is in brackets, and link back to the original when you share a result.</p></div></div>
          </div></section>
        </div>
      </main>
      <SiteFooter catalog={catalog} level="model" />
    </div>
  </div></div>;
}
