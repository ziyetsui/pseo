"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Catalog, Ref } from "@/lib/catalog/types";
import "@/styles/model-signature.css";

/** Signature composition; the hand-drawn lines pair the real collection count with an invitation to create. */
export function ModelSignatureHero({ catalog, model, members, children }: {
  catalog: Catalog; model: Ref; members?: Ref[]; children: ReactNode;
}) {
  const wall = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const lanes = useMemo(() => {
    const buckets: Catalog["prompts"][] = [[], [], [], []];
    catalog.prompts.forEach((prompt, index) => buckets[index % 4]?.push(prompt));
    return buckets.map(lane => [...lane, ...lane]);
  }, [catalog.prompts]);

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

  return <section className="model-signature" aria-label={`${model.label} prompts`}>
    <div className="msh-wall" ref={wall} aria-hidden="true" data-paused="">
      <div className="msh-lanes">{lanes.map((lane, index) => <div className="msh-lane" data-lane={index} key={index}>
        {lane.map((prompt, item) => <span className="msh-tile" key={`${prompt.id}-${item}`}>
          {prompt.img ? <img src={prompt.img} alt="" width={300} height={300} loading={item < 3 ? "eager" : "lazy"} referrerPolicy="no-referrer" /> : <span className="msh-word" lang={prompt.locale}>{prompt.title}</span>}
        </span>)}
      </div>)}</div>
      <div className="msh-scrim" />
    </div>
    <div className="msh-front">
      <div className="msh-titleline">
        <h1 className="msh-name" lang={catalog.locale}>{model.label}</h1>
        <div className="msh-notes">
          <p className="msh-note"><span>{catalog.prompts.length} {catalog.prompts.length === 1 ? "prompt" : "prompts"}{catalog.prompts.length > 0 ? " to build on" : ""}</span><svg viewBox="0 0 204 14" aria-hidden="true"><path d="M3 10 C43 3 80 3 110 6 S166 13 201 8" /></svg></p>
          <p className="msh-note"><span>{catalog.prompts.length > 0 ? "Pick one. Make it yours." : "Explore another model."}</span><svg viewBox="0 0 204 14" aria-hidden="true"><path d="M3 10 C43 3 80 3 110 6 S166 13 201 8" /></svg></p>
        </div>
      </div>
      {children}
      {!!members?.length && <nav className="msh-versions model-versions" aria-label="Model versions">{members.map(member => <a href={member.href} key={member.id}>{member.label}</a>)}</nav>}
    </div>
    {!!catalog.prompts.length && <button className="msh-motion" type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? "Resume background motion" : "Pause background motion"}</button>}
  </section>;
}
