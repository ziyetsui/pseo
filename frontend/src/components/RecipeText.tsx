"use client";

import { useState, useSyncExternalStore } from "react";
import { promptWords } from "@/lib/cta/sign-in-gate";
import type { Prompt } from "@/lib/catalog/types";
import { filledPlaceholderParts } from "@/lib/catalog/placeholders";
import { placeholderChoices } from "@/lib/catalog/placeholder-choices";
import "@/styles/recipe-choices.css";

const subscribe = () => () => undefined;
const clientReady = () => true;
const serverReady = () => false;

export function RecipeText({ prompt }: { prompt: Prompt }) {
  // Prevent early keystrokes from being discarded before controlled inputs hydrate.
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  const [values, setValues] = useState<Record<string, string>>({});
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [customTokens, setCustomTokens] = useState<string[]>([]);
  const variables = prompt.variables.filter((variable, index, all) => variable.token && prompt.prompt.includes(variable.token) && all.findIndex((item) => item.token === variable.token) === index);
  const parts = filledPlaceholderParts(prompt.prompt, variables.map(variable => variable.token), values);
  const resolved = parts.map(part => part.text).join("");
  const changed = resolved !== prompt.prompt;
  const remaining = variables.filter((variable) => !values[variable.token]);
  const controls = <fieldset className="varset" disabled={!ready}>
    <legend>{variables.length ? "Choose values" : "Placeholders"}</legend>
    {!variables.length && <p className="novar">This prompt has no placeholders. Copy it as it is.</p>}
    {variables.map((variable, index) => <div key={variable.token} style={{ marginTop: index ? 14 : 0 }}>
      {/* The reference's quirks-mode label renders at 14.484px; 10.5px × 1.38 preserves that line in standards mode. */}
      <p className="eyebrow" id={`placeholder-label-${index}`} style={{ marginBottom: 9, textTransform: "none", letterSpacing: ".02em", lineHeight: 1.38 }}><span className="var">{variable.token}</span></p>
      <div className="varopts" role="radiogroup" aria-labelledby={`placeholder-label-${index}`}>
        {placeholderChoices(variable).map((option) => <label className="varopt" key={option}><input type="radio" name={`placeholder-${index}`} value={option} checked={!customTokens.includes(variable.token) && values[variable.token] === option} onChange={() => {
          setCustomTokens(current => current.filter(token => token !== variable.token));
          setValues(current => ({ ...current, [variable.token]: option }));
        }} /><span>{option}</span></label>)}
        <label className="varopt"><input type="radio" name={`placeholder-${index}`} checked={customTokens.includes(variable.token)} onChange={() => {
          setCustomTokens(current => [...current.filter(token => token !== variable.token), variable.token]);
          setValues(current => ({ ...current, [variable.token]: customValues[variable.token] ?? "" }));
        }} /><span>Custom</span></label>
      </div>
      {customTokens.includes(variable.token) && <input className="recipe-variable-input" type="text" aria-labelledby={`placeholder-label-${index}`} value={customValues[variable.token] ?? ""} placeholder={variable.defaultValue || variable.label} onChange={(event) => {
        const value = event.target.value;
        setCustomValues(current => ({ ...current, [variable.token]: value }));
        setValues(current => ({ ...current, [variable.token]: value }));
      }} />}
      {variable.note && <p className="novar" style={{ marginTop: 8 }}>{variable.note}</p>}
    </div>)}
  </fieldset>;

  return <>
    <section className="step" aria-labelledby="recipe-placeholders">
      <div className="num" aria-hidden="true">02</div><div>
        <h2 id="recipe-placeholders">Set the placeholders</h2>
        <p className="lede">{variables.length ? `Choose a starting point for each placeholder, or enter your own. Every matching value updates in the text below.` : "This prompt has no placeholders — nothing to set. Skip to the text."}</p>
        {variables.length ? <form className="recipe-placeholder-form" style={{ margin: "0 0 15px" }} onSubmit={(event) => event.preventDefault()}>{controls}</form> : controls}
        {variables.length > 0 && <noscript><p className="novar">Enable JavaScript to fill the placeholders. The complete template is available below.</p></noscript>}
      </div>
    </section>
    <section className="step" aria-labelledby="recipe-text">
      <div className="num" aria-hidden="true">03</div><div>
        <h2 id="recipe-text">Take the text</h2>
        <p className="lede">{resolved.length.toLocaleString("en-US")} characters. Copy the whole thing — the render settings at the end are part of it.</p>
        <div className="payload">
          <div className="payload-bar"><span className="how">{changed ? "Your template, with placeholders filled." : prompt.editableTemplate ? "Editable template. Set the placeholders above." : "Word for word, as published."}</span></div>
          <div className="payload-body" data-prompt data-lg-row="" data-lg-chars={resolved.length} data-lg-words={promptWords(resolved)} lang={prompt.language}>{parts.map((part, index) => part.token ? <span className="var prompt-placeholder" data-v={part.token} key={index}>{part.text}</span> : part.text)}</div>
        </div>
        {variables.length > 0 && <p className="novar" role="status" aria-live="polite" style={{ marginTop: 10 }}>{remaining.length ? `${remaining.length} ${remaining.length === 1 ? "placeholder remains" : "placeholders remain"} unfilled. Replace ${remaining.map((item) => item.token).join(", ")} before running the prompt.` : "All placeholders are filled."}</p>}
        {(changed || customTokens.length > 0) && <button type="button" className="btn" style={{ marginTop: 12 }} onClick={() => { setValues({}); setCustomValues({}); setCustomTokens([]); }}>Reset placeholders</button>}
      </div>
    </section>
  </>;
}
