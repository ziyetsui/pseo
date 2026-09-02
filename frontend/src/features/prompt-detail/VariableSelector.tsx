"use client";

import { useId, useRef, type KeyboardEvent } from "react";

import { Panel } from "@/components/ui/Panel";
import { cx } from "@/components/ui/class-names";
import type { PromptVariable } from "@/lib/content/types";

import { usePromptCopyContext } from "./PromptCopyProvider";

export interface VariableSelectorProps {
  variables: readonly PromptVariable[];
}

/**
 * The prototype's `换个国家试试` picker: one option row per variable plus the
 * live `当前选择：… —— 复制时自动替换。` line.
 *
 * It owns no copy button of its own — the two copy buttons on the page (the
 * payload bar and the sticky bottom bar) both read the same substitution state
 * from `PromptCopyProvider`, so picking a value here changes what *they* copy
 * and the page can never offer two disagreeing strings.
 *
 * Each variable is an ARIA radio group with roving `tabindex`: one tab stop per
 * group, arrow keys move (and select) within it — the standard radio pattern.
 */
export function VariableSelector({ variables }: VariableSelectorProps) {
  const { values, select, result } = usePromptCopyContext();
  const optionRefs = useRef<Record<string, (HTMLButtonElement | null)[]>>({});
  const baseId = useId();

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
              {`当前选择：${current} —— 复制时自动替换。`}
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
    </div>
  );
}
