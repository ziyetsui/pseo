'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

const subscribeToHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function SkillsCopy({ text, label, iconOnly = false }: { text: string; label: string; iconOnly?: boolean }) {
  const ready = useSyncExternalStore(subscribeToHydration, clientReady, serverReady);
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timeout.current), []);
  async function copy() {
    clearTimeout(timeout.current);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setStatus('copied');
      timeout.current = setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('error');
    }
  }
  return <span className={iconOnly ? 'skills-copy-wrap skills-copy-wrap-icon' : 'skills-copy-wrap'}>
    <button type="button" className={iconOnly ? 'skills-copy skills-copy-icon' : 'skills-copy'} onClick={copy} disabled={!ready} aria-label={label} title={label}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {status === 'copied' ? <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /> : <><rect x="8" y="8" width="12" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" stroke="currentColor" strokeWidth="1.8" /></>}
      </svg>
      {!iconOnly && <span>{status === 'copied' ? 'Copied' : label}</span>}
    </button>
    <span className={status === 'error' ? 'skills-copy-feedback skills-copy-error' : 'skills-copy-feedback'} role="status">
      {status === 'copied' ? 'Copied to clipboard.' : status === 'error' ? 'Copy failed. Select and copy the text manually.' : ''}
    </span>
  </span>;
}
