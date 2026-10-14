"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Catalog, Ref } from "@/lib/catalog/types";
import "@/styles/model-signature.css";

/** Signature composition; the hand-drawn lines pair the real collection count with an invitation to create. */
export function ModelSignatureHero({ catalog, model, members, children }: {
  catalog: Catalog; model: Ref; members?: Ref[]; children: ReactNode;
}) {
  return <CollectionSignatureHero items={catalog.prompts.map(prompt => ({id:prompt.id,title:prompt.title,src:prompt.img}))} locale={catalog.locale} title={model.label} label={`${model.label} prompts`} line1={`${catalog.prompts.length} ${catalog.prompts.length === 1 ? 'prompt' : 'prompts'}${catalog.prompts.length ? ' to build on' : ''}`} line2={catalog.prompts.length ? 'Pick one. Make it yours.' : 'Explore another model.'} members={members}>{children}</CollectionSignatureHero>;
}

export interface SignatureItem { id: string; title: string; src: string | null }
export function CollectionSignatureHero({ items, locale, title, label, line1, line2, members, children }: {
  items: SignatureItem[]; locale: string; title: string; label: string; line1: string; line2: string; members?: Ref[]; children: ReactNode;
}) {
  const wall = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const lanes = useMemo(() => {
    const buckets: SignatureItem[][] = [[], [], [], []];
    items.forEach((item, index) => buckets[index % 4]?.push(item));
    return buckets.map(lane => [...lane, ...lane]);
  }, [items]);

  useEffect(() => {
    const element = wall.current;
    if (!element) return;
    let visible = true;
    const sync = () => element.toggleAttribute("data-paused", paused || !visible || document.hidden);
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => { visible = !!entries[0]?.isIntersecting; sync(); }, { rootMargin: "100px" });
    observer.observe(element);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, [paused]);

  return <section className="model-signature" aria-label={label}>
    <div className="msh-wall" ref={wall} aria-hidden="true" data-paused="">
      <div className="msh-lanes">{lanes.map((lane, index) => <div className="msh-lane" data-lane={index} key={index}>
        {lane.map((prompt, item) => <span className="msh-tile" key={`${prompt.id}-${item}`}>
          {prompt.src ? <img src={prompt.src} alt="" width={300} height={300} loading={item < 3 ? "eager" : "lazy"} referrerPolicy="no-referrer" /> : <span className="msh-word" lang={locale}>{prompt.title}</span>}
        </span>)}
      </div>)}</div>
      <div className="msh-scrim" />
    </div>
    <div className="msh-front">
      <div className="msh-titleline">
        <h1 className="msh-name" lang={locale}>{title}</h1>
        <div className="msh-notes">
          <p className="msh-note"><span>{line1}</span><svg viewBox="0 0 204 14" aria-hidden="true"><path d="M3 10 C43 3 80 3 110 6 S166 13 201 8" /></svg></p>
          <p className="msh-note"><span>{line2}</span><svg viewBox="0 0 204 14" aria-hidden="true"><path d="M3 10 C43 3 80 3 110 6 S166 13 201 8" /></svg></p>
        </div>
      </div>
      {children}
      {!!members?.length && <nav className="msh-versions model-versions" aria-label="Model versions">{members.map(member => <a href={member.href} key={member.id}>{member.label}</a>)}</nav>}
    </div>
    {!!items.length && <button className="msh-motion" type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? "Resume background motion" : "Pause background motion"}</button>}
  </section>;
}
