"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";

import { Panel } from "@/components/ui/Panel";
import { cx } from "@/components/ui/class-names";
import { CopyPromptButton } from "@/features/prompt/CopyPromptButton";
import { substituteVariables } from "@/lib/content/variables";
import type { PromptVariable } from "@/lib/content/types";

import { StickyCopyBar, type StickyBarInfo } from "./StickyCopyBar";
import { replacementPhrase } from "./variable-view";

export interface VariableSelectorProps {
  /** The prompt exactly as published — never mutated, only substituted from. */
  promptText: string;
  variables: readonly PromptVariable[];
  /** Id of the server-rendered `<pre>`, used as the copy fallback target. */
  targetId: string;
  /** When supplied, the selector also owns the mobile sticky action bar. */
  sticky?: StickyBarInfo;
}

function initialValues(variables: readonly PromptVariable[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const variable of variables) {
    values[variable.token] = variable.defaultValue || (variable.options[0] ?? "");
  }
  return values;
}

/**
 * Variable picker for a prompt with placeholders.
 *
 * It owns the selection state and therefore every control whose output depends
 * on it: the inline copy button and — when the page asks for one — the mobile
 * sticky bar's copy button. The `<pre>` above stays server-rendered with the
 * original text (tokens and all); this component never rewrites it, so the
 * published prompt on the page is always the verbatim one.
 *
 * Each variable is an ARIA radio group with roving `tabindex`: one tab stop per
 * group, arrow keys move (and select) within it — the standard radio pattern.
 */
export function VariableSelector({
  promptText,
  variables,
  targetId,
  sticky,
}: VariableSelectorProps) {
  const [values, setValues] = useState(() => initialValues(variables));
  const optionRefs = useRef<Record<string, (HTMLButtonElement | null)[]>>({});
  const baseId = useId();

  const result = substituteVariables(promptText, values);

  function select(token: string, value: string): void {
    setValues((current) => ({ ...current, [token]: value }));
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    variable: PromptVariable,
    index: number,
  ): void {
    const { options } = variable;
    if (options.length === 0) return;

    let next: number;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (index + 1) % options.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (index - 1 + options.length) % options.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = options.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const value = options[next];
    if (value === undefined) return;
    select(variable.token, value);
    optionRefs.current[variable.token]?.[next]?.focus();
  }

  return (
    <div className="flex flex-col gap-6">
      {variables.map((variable) => {
        const labelId = `${baseId}-${variable.token.replace(/\W+/g, "")}`;
        const current = values[variable.token] ?? "";

        return (
          <div key={variable.token} className="flex flex-col gap-3">
            <p id={labelId} className="text-sm font-bold">
              {variable.label}
              <code className="ml-2 font-mono text-xs font-bold">{variable.token}</code>
            </p>

            <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-2">
              {variable.options.map((option, index) => {
                const checked = option === current;
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    tabIndex={checked ? 0 : -1}
                    ref={(element) => {
                      const list = (optionRefs.current[variable.token] ??= []);
                      list[index] = element;
                    }}
                    onClick={() => select(variable.token, option)}
                    onKeyDown={(event) => handleKeyDown(event, variable, index)}
                    className={cx(
                      "inline-flex min-h-11 min-w-11 items-center justify-center rounded-none border-2 border-foreground px-4 py-2 text-sm font-bold transition duration-200 ease-out",
                      checked
                        ? "bg-foreground text-surface shadow-hard-sm"
                        : "bg-surface text-foreground hover:bg-muted",
                    )}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            <p role="status" aria-live="polite" className="text-sm font-medium">
              {`当前选择：${current}，${replacementPhrase(promptText, variable.token)}`}
            </p>
          </div>
        );
      })}

      {result.unreplaced.length === 0 ? null : (
        <Panel tone="warning">
          <p>
            {`以下变量未替换：${result.unreplaced.join("、")}。复制后请在生成工具里手动填写，否则模型会把方括号原样画进画面。`}
          </p>
        </Panel>
      )}

      <div>
        <CopyPromptButton text={result.text} targetId={targetId} />
      </div>

      {sticky === undefined ? null : (
        <StickyCopyBar {...sticky} copyText={result.text} targetId={targetId} />
      )}
    </div>
  );
}
