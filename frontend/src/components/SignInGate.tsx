"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BO_URL, GATE, canShowIntent, markIntentShown, markQuiet, markShown, promptWords, quietUntil, shownThisSession, verdict } from "@/lib/cta/sign-in-gate";

type Reading = { passed: number; total: number; chars: number; words: number };
type Message = Reading & { mode: "nudge" | "dialog"; intent: boolean };
const num = (n: number) => n.toLocaleString("en-US");

function readRows(): Reading | null {
  const rows = [...document.querySelectorAll<HTMLElement>("[data-lg-row]")];
  if (!rows.length) return null;
  const current = rows.findIndex(row => row.hasAttribute("data-lg-current"));
  const passed = current >= 0 ? current + 1 : rows.reduce((count, row) => {
    const rect = row.getBoundingClientRect();
    return count + Math.max(0, Math.min(1, (innerHeight * .85 - rect.top) / Math.max(rect.height, 1)));
  }, 0);
  return {
    passed, total: rows.length,
    chars: rows.reduce((sum, row) => sum + (Number(row.dataset.lgChars) || 0), 0),
    words: rows.reduce((sum, row) => sum + (Number(row.dataset.lgWords) || 0), 0),
  };
}
function busy() {
  return !!document.activeElement?.matches("input,textarea,select,[contenteditable=true]")
    || !!window.getSelection()?.toString().trim()
    || !!document.querySelector('[data-peek],dialog[open]');
}

export function SignInGate() {
  const [message, setMessage] = useState<Message | null>(null);
  const showing = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const close = useCallback((days: number = GATE.quietAfterDismissDays) => {
    markQuiet(days);
    showing.current = false;
    dialog.current?.close();
    setMessage(null);
  }, []);

  useEffect(() => {
    if (message?.mode !== "dialog") return;
    const element = dialog.current;
    if (!element) return;
    const root = document.documentElement;
    const overflow = root.style.overflow, padding = root.style.paddingRight;
    const scrollbar = innerWidth - root.clientWidth;
    element.showModal();
    root.style.overflow = "hidden";
    if (scrollbar > 0) root.style.paddingRight = `${scrollbar}px`;
    panel.current?.focus({ preventScroll: true });
    return () => {
      element.close();
      root.style.overflow = overflow;
      root.style.paddingRight = padding;
      if (returnTo.current?.isConnected) returnTo.current.focus({ preventScroll: true });
    };
  }, [message?.mode]);

  useEffect(() => {
    let visibleMs = 0, lastTime = Date.now();
    let engaged = false, lastActivity = Date.now();
    const startScroll = scrollY;
    let lastScroll = scrollY;
    const progress = () => {
      if (scrollY > lastScroll && scrollY - startScroll > innerHeight * .6) engaged = true;
      lastScroll = scrollY;
      lastActivity = Date.now();
    };
    const activity = () => { lastActivity = Date.now(); };
    const observer = new MutationObserver(() => {
      const current = [...document.querySelectorAll('[data-lg-row]')].findIndex(row => row.hasAttribute('data-lg-current'));
      if (current > 0) engaged = true;
      activity();
    });
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["data-lg-current"] });
    const tick = () => {
      const now = Date.now();
      if (!document.hidden) visibleMs += now - lastTime;
      lastTime = now;
      if (showing.current || !engaged || document.hidden || shownThisSession() || now < quietUntil() || busy() || now - lastActivity < GATE.dwellMs) return;
      const reading = readRows();
      if (!reading || !reading.chars) return;
      if (verdict({ ...reading, engaged, busy: busy(), hidden: document.hidden, secondsOnSurface: visibleMs / 1000,
        shown: shownThisSession(), quietUntil: quietUntil(), now }) !== "open") return;
      markShown(); showing.current = true;
      returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setMessage({ ...reading, mode: "nudge", intent: false });
    };
    const visibility = () => { lastTime = Date.now(); activity(); };
    const hideReminder = () => setMessage(current => {
      if (current?.mode !== "nudge") return current;
      return null;
    });
    const focus = (event: FocusEvent) => {
      if (event.target instanceof Element && event.target.matches("input,textarea,select,[contenteditable=true]")) hideReminder();
    };
    const generate = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-generation-cta]') : null;
      if (!link || !canShowIntent()) return;
      // These are explicitly marked external generation links; internal browse/fill actions retain their behavior.
      if (![BO_URL, "https://bo.ancher.ai/home"].includes(link.href)) return;
      event.preventDefault();
      returnTo.current = link;
      const text = document.querySelector<HTMLTextAreaElement>('.msh-input')?.value
        || document.querySelector('[data-prompt]')?.textContent || "";
      const reading = readRows() ?? { passed: 0, total: 0, chars: 0, words: 0 };
      showing.current = true; markIntentShown();
      setMessage({ ...reading, ...(text ? { chars: text.length, words: promptWords(text) } : {}),
        mode: "dialog", intent: !!text });
    };
    const timer = setInterval(tick, 500);
    window.addEventListener("scroll", progress, { passive: true });
    window.addEventListener("wheel", activity, { passive: true });
    window.addEventListener("touchmove", activity, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("click", generate, true);
    document.addEventListener("focusin", focus);
    window.addEventListener("prompt-library:query", hideReminder);
    window.addEventListener("popstate", hideReminder);
    return () => {
      clearInterval(timer); observer.disconnect();
      window.removeEventListener("scroll", progress);
      window.removeEventListener("wheel", activity);
      window.removeEventListener("touchmove", activity);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("click", generate, true);
      document.removeEventListener("focusin", focus);
      window.removeEventListener("prompt-library:query", hideReminder);
      window.removeEventListener("popstate", hideReminder);
    };
  }, []);

  if (!message) return null;
  if (message.mode === "nudge") return createPortal(
    <aside className="weight-nudge" aria-label="Try these prompts">
      <button className="weight-nudge-open" type="button" onClick={() => {
        markIntentShown();
        setMessage({ ...message, mode: "dialog" });
      }}><span className="weight-nudge-number">{num(message.chars)}</span><span>characters to make your own<span className="weight-nudge-action">Try a prompt ↗</span></span></button>
      <button className="weight-nudge-close" type="button" aria-label="Dismiss prompt reminder" onClick={() => close()}>×</button>
    </aside>, document.body);

  return createPortal(
    <dialog className="sign-in-gate" ref={dialog} aria-labelledby="sign-in-gate-heading" onCancel={event => { event.preventDefault(); close(); }} onKeyDown={event => {
      if (event.key !== "Tab") return;
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')];
      const first = controls[0], last = controls[controls.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }}>
      <div className="sign-in-gate-scrim" aria-hidden="true" onClick={() => close()} />
      <div className="sign-in-gate-panel" tabIndex={-1} ref={panel}>
        <div className="sign-in-gate-figure" aria-hidden="true" style={{ ["--digits" as string]: String(num(message.chars).length) }}>{num(message.chars)}</div>
        <p className="sign-in-gate-unit">{message.intent ? "Your prompt" : "Ready to explore"}</p>
        <h2 className="sign-in-gate-sub" id="sign-in-gate-heading">{num(message.chars)} characters{message.words > 0 && <> · <b>{num(message.words)} words</b></>}.<br />Take the next step in bo.</h2>
        <div className="sign-in-gate-acts">
          <a className="sign-in-gate-btn" href={BO_URL} target="_blank" rel="noopener noreferrer" onClick={() => close(GATE.quietAfterClickDays)}>Continue to bo ↗</a>
          <button className="sign-in-gate-alt" type="button" onClick={() => close()}>Keep exploring</button>
        </div>
        <p className="sign-in-gate-fact">Your prompt stays here. bo opens in a new tab.</p>
      </div>
      <button className="sign-in-gate-x" type="button" aria-label="Close and keep exploring" onClick={() => close()}>×</button>
    </dialog>, document.body);
}
