'use client';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { generationHref } from '@/lib/cta/generation-url';
import type { GenerationKind } from '@/lib/cta/generation-url';

/** Keep the native link in sync with the resolved, visible Recipe text. */
export function RecipeGenerateLink({ prompt, kind, children }: { prompt: string; kind: GenerationKind; children: ReactNode }) {
  const [value, setValue] = useState(prompt);
  useEffect(() => {
    const body = document.querySelector('[data-prompt]');
    if (!body) return;
    const sync = () => setValue(body.textContent ?? prompt);
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(body, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [prompt]);
  return <a className="btn pri" data-generation-cta="" href={generationHref(value, kind)} target="_blank" rel="noopener noreferrer">{children}</a>;
}
