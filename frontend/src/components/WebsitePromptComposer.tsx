'use client';
import { useImperativeHandle, useRef, useSyncExternalStore, type Ref } from 'react';
import type { Locale } from '@/lib/catalog/types';
import { text, uiText } from '@/lib/i18n/text';
import { HighlightedPromptInput } from './HighlightedPromptInput';
import { SignInGate } from './SignInGate';

export type WebsiteComposerHandle = { loadPrompt: (prompt: string) => void };
const eventName = 'prompt-library:website-draft';
const subscribe = (listener: () => void) => {
  window.addEventListener(eventName, listener);
  return () => window.removeEventListener(eventName, listener);
};
const serverDraft = () => '';

export function WebsitePromptComposer({ href, count, uiLocale, composerRef }: {
  href: string; count: number; uiLocale: Locale; composerRef: Ref<WebsiteComposerHandle>;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  const transient = useRef('');
  const storageKey = `prompt-library:website-draft:${href}`;
  const draft = useSyncExternalStore(subscribe, () => {
    try { return sessionStorage.getItem(storageKey) ?? transient.current; }
    catch { return transient.current; }
  }, serverDraft);
  const setDraft = (value: string) => {
    transient.current = value;
    try { sessionStorage.setItem(storageKey, value); } catch { /* Keep editing available without storage. */ }
    window.dispatchEvent(new Event(eventName));
  };
  useImperativeHandle(composerRef, () => ({ loadPrompt: (value: string) => {
    setDraft(value);
    requestAnimationFrame(() => {
      input.current?.focus({ preventScroll: true });
      input.current?.setSelectionRange(0, 0);
      if (input.current) input.current.scrollTop = 0;
      input.current?.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
  } }));
  return <><div className="msh-composer">
    <label className="vh" htmlFor="gen4">{uiText(uiLocale, 'Your prompt')}</label>
    <HighlightedPromptInput inputRef={input} value={draft} onChange={setDraft} placeholder={text(uiLocale, 'Describe the website you want to build…', '描述你想创建的网站…')} />
    <div className="msh-composer-footer"><span className="msh-count" aria-live="polite">{draft ? text(uiLocale, `${draft.length.toLocaleString('en-US')} characters`, `${draft.length.toLocaleString('zh-CN')} 个字符`) : text(uiLocale, `${count} website ${count === 1 ? 'case' : 'cases'} below`, `下方有 ${count} 个网站案例`)}</span><span className="msh-sp" /><a className="msh-generate" data-generation-cta="" href="https://bo.ancher.ai/home" target="_blank" rel="noopener noreferrer">{text(uiLocale, 'Generate website', '生成网站')}</a></div>
  </div><SignInGate uiLocale={uiLocale} /></>;
}
