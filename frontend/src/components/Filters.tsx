"use client";

import { useSyncExternalStore } from "react";
import type { Axis, Catalog, Prompt, Ref } from "@/lib/catalog/types";
import { filterPrompts, filtersFromParams } from "@/lib/catalog/query";
import { placeholderParts } from "@/lib/catalog/placeholders";

export type FilterAxis = Axis | "variables";
const eventName = "prompt-library:query";
const keys = ["model", "useCase", "technique", "style", "subject", "contentType", "creator"] as const;
const subscribe = (listener: () => void) => {
  window.addEventListener("popstate", listener);
  window.addEventListener(eventName, listener);
  return () => { window.removeEventListener("popstate", listener); window.removeEventListener(eventName, listener); };
};
const current = () => window.location.search;
const server = () => "";


export function usePromptExplorer(catalog: Catalog) {
  const search = useSyncExternalStore(subscribe, current, server);
  const params = new URLSearchParams(search);
  const filters = filtersFromParams(params);
  let rows = filterPrompts(catalog, filters);
  const variables = params.getAll("variables");
  if (variables.length) rows = rows.filter(prompt => variables.includes(prompt.variables.length ? "with" : "without"));
  const update = (next: URLSearchParams, replace = false) => {
    next.delete("cursor"); next.delete("page");
    const query = next.toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    if (replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
    window.dispatchEvent(new Event(eventName));
  };
  return {
    rows, search, q: filters.q ?? "",
    selected: (axis: FilterAxis, value: string) => params.getAll(axis).includes(value),
    toggle(axis: FilterAxis, value: string) {
      const next = new URLSearchParams(params), values = next.getAll(axis);
      next.delete(axis);
      for (const item of values.includes(value) ? values.filter(item => item !== value) : [...values, value]) next.append(axis, item);
      update(next);
    },
    setQuery(value: string) { const next = new URLSearchParams(params); if (value.trim()) next.set("q", value.slice(0, 200)); else next.delete("q"); update(next, true); },
    clear() { const next = new URLSearchParams(params); for (const key of [...keys, "q", "variables", "collection", "window"]) next.delete(key); update(next); },
    active: keys.some(key => params.has(key)) || params.has("q") || params.has("variables") || params.has("collection") || filters.window === "7d" || filters.window === "30d",
  };
}
export type Explorer = ReturnType<typeof usePromptExplorer>;

export function refsFor(prompt: Prompt, axis: Axis): Ref[] {
  return ({ model: prompt.models, useCase: prompt.useCases, technique: prompt.techniques, style: prompt.styles, subject: prompt.subjects })[axis];
}
export function facetOptions(prompts: Prompt[], axis: FilterAxis, preserveTies = false): Ref[] {
  if (axis === "variables") return [
    { id: "with", slug: "with", label: "Has variables", href: "", count: prompts.filter(prompt => prompt.variables.length > 0).length },
  ].filter(ref => ref.count > 0);
  const counts = new Map<string, Ref>();
  for (const prompt of prompts) for (const ref of refsFor(prompt, axis)) {
    const previous = counts.get(ref.slug); counts.set(ref.slug, { ...ref, count: (previous?.count ?? 0) + 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || (preserveTies ? 0 : a.label.localeCompare(b.label)));
}

export function Filters({ prompts, explorer, axes, variant = "deck", limit }: {
  prompts: Prompt[]; explorer: Explorer; axes: readonly (readonly [FilterAxis, string])[]; variant?: "hub" | "deck" | "model"; limit?: number;
}) {
  const chips = (axis: FilterAxis) => facetOptions(prompts, axis, variant === "hub").slice(0, limit).map(ref => <button
    className="chip" type="button" key={`${axis}-${ref.slug}`} aria-pressed={explorer.selected(axis, ref.slug)}
    onClick={() => explorer.toggle(axis, ref.slug)}>{ref.label} <small>{ref.count}</small></button>);
  if (variant === "hub") return <div className="hub-chips">{axes.map(([axis]) => <span className="filter-axis-inline" key={axis}>{chips(axis)}</span>)}</div>;
  if (variant === "model") return <div className="axes">{axes.map(([axis, label]) => <div className="ax" key={axis}><div className="axh"><h3 id={`ax-${axis}`}>{label}</h3><span className="n">{facetOptions(prompts, axis).length}</span></div><div className="chips" role="group" aria-labelledby={`ax-${axis}`}>{chips(axis)}</div></div>)}</div>;
  return <div className="facets">{axes.map(([axis, label]) => <div key={axis}><h3 id={`ax-${axis}`}>{label}</h3><div className="chips" role="group" aria-labelledby={`ax-${axis}`}>{chips(axis)}</div></div>)}</div>;
}

export function SearchForm({ explorer, variant = "deck", contentType = "image" }: { explorer: Explorer; variant?: "hub" | "deck"; contentType?: "image" | "video" }) {
  const label = variant === "hub" ? "Search prompts" : `Search ${contentType} prompts`;
  return <form className={variant === "hub" ? "search hub-search" : "searchbar"} role="search" onSubmit={event => event.preventDefault()}>
    <label className="vh" htmlFor="q">{label}</label><input id="q" name="q" type="search" maxLength={200} value={explorer.q}
      placeholder={variant === "hub" ? "Search prompts, models, styles, creators…" : `${label}…`} onChange={event => explorer.setQuery(event.target.value)} />
    {variant === "deck" && <button className="btn primary" type="submit">Search</button>}
  </form>;
}

export function EmptyResults({ explorer, title = "No prompts match those filters." }: { explorer: Explorer; title?: string }) {
  return <div className="empty" role="status"><b>{title}</b><p>Widen one axis, or clear them all.</p><button className="btn primary" type="button" onClick={explorer.clear}>Clear filters</button></div>;
}

export function PromptWords({ text, markClassName }: { text: string; markClassName?: string }) {
  return <>{placeholderParts(text).map((part, index) => part.token ? <mark className={`prompt-placeholder ${markClassName ?? ""}`} key={index}>{part.text}</mark> : part.text)}</>;
}
