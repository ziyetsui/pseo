"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { CopyPromptButton } from "@/features/prompt/CopyPromptButton";
import type { PromptVariable } from "@/lib/content/types";
import { substituteVariables, type SubstitutionResult } from "@/lib/content/variables";

import { StickyCopyBar, type StickyBarInfo } from "./StickyCopyBar";

/**
 * Shares one variable-substitution state between the inline picker (rendered
 * inside the "提示词" section, directly under the `<pre>`) and the mobile
 * sticky bar (rendered as the very last child of the page's content wrapper,
 * so `position: sticky` clamps to the whole page and never slides over the
 * footer — see `PromptStickyCopyBar`). Both read the same `result.text`, so
 * the two copy buttons on the page can never disagree about what they copy,
 * and the copy-fallback selection (`PromptSubstitutedText`) always matches.
 */
export interface PromptCopyContextValue {
  values: Record<string, string>;
  select(token: string, value: string): void;
  result: SubstitutionResult;
  /**
   * Id of the visually-hidden node holding `result.text`, for the copy
   * button's manual-copy fallback to select — never the raw, unsubstituted
   * `<pre>` above, which would hand the reader a token like `[COUNTRY]`.
   */
  copyTargetId: string;
}

const PromptCopyContext = createContext<PromptCopyContextValue | null>(null);

export function usePromptCopyContext(): PromptCopyContextValue {
  const value = useContext(PromptCopyContext);
  if (value === null) {
    throw new Error("usePromptCopyContext must be used inside <PromptCopyProvider>");
  }
  return value;
}

function initialValues(variables: readonly PromptVariable[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const variable of variables) {
    const { defaultValue, options } = variable;
    // A default that isn't one of the offered options would leave no radio
    // checked (and so no tab stop in the group) — fall back to the first
    // option so the radiogroup is always operable.
    values[variable.token] = options.includes(defaultValue) ? defaultValue : (options[0] ?? "");
  }
  return values;
}

export interface PromptCopyProviderProps {
  promptText: string;
  variables: readonly PromptVariable[];
  children: ReactNode;
}

/** Owns the variable-substitution state for one prompt detail page. */
export function PromptCopyProvider({ promptText, variables, children }: PromptCopyProviderProps) {
  const [values, setValues] = useState(() => initialValues(variables));
  const baseId = useId();
  const copyTargetId = `${baseId}-copy-text`;
  const result = substituteVariables(promptText, values);

  const select = useCallback((token: string, value: string) => {
    setValues((current) => ({ ...current, [token]: value }));
  }, []);

  const context = useMemo<PromptCopyContextValue>(
    () => ({ values, select, result, copyTargetId }),
    [values, select, result, copyTargetId],
  );

  return <PromptCopyContext.Provider value={context}>{children}</PromptCopyContext.Provider>;
}

/**
 * The visually-hidden (but selectable) copy of the substituted text. Must be
 * mounted once per `PromptCopyProvider`; `CopyPromptButton`'s copy-fallback
 * targets it by id so a failed clipboard write selects exactly the text the
 * button would have copied — never the tokenized original in the visible
 * `<pre>`. Hidden with the `sr-only` utility (clip, not `display: none`), so
 * it stays selectable, and `aria-hidden` so screen readers don't announce a
 * duplicate of the whole prompt.
 */
export function PromptSubstitutedText() {
  const { result, copyTargetId } = usePromptCopyContext();
  return (
    <pre id={copyTargetId} aria-hidden="true" className="sr-only">
      {result.text}
    </pre>
  );
}

export interface PromptStickyCopyBarProps {
  info: StickyBarInfo;
}

/**
 * The mobile sticky bar, wired to the shared substitution state.
 *
 * Must be rendered as the last child of the page's content wrapper (nothing
 * else follows it inside that wrapper). `position: sticky` only clamps within
 * its own parent's box, so as the last child of the wrapper that spans the
 * whole page's content, it stays pinned to the bottom of the viewport for the
 * entire scroll and releases — scrolling away with the rest of the page —
 * only once that wrapper's own bottom edge (i.e. the true end of the page's
 * content, right before the footer) reaches the viewport. It can therefore
 * never end up stuck on top of the footer, which sits outside this wrapper.
 */
export function PromptStickyCopyBar({ info }: PromptStickyCopyBarProps) {
  const { result, copyTargetId } = usePromptCopyContext();
  return <StickyCopyBar {...info} copyText={result.text} targetId={copyTargetId} />;
}

/**
 * The copy button that sits in the payload bar, wired to the shared
 * substitution state. It writes `result.text` — the prompt with every chosen
 * value substituted — never the tokenized original shown in the `<pre>`, and
 * its manual-copy fallback selects `PromptSubstitutedText`, so a failed
 * clipboard write hands the reader exactly the same string.
 */
export function PromptCopyButton() {
  const { result, copyTargetId } = usePromptCopyContext();
  return <CopyPromptButton text={result.text} targetId={copyTargetId} />;
}
