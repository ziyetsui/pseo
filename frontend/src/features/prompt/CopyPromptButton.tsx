"use client";

import { useEffect, useRef, useState } from "react";

import { Button, type ButtonShape, type ButtonVariant } from "@/components/ui/Button";

const RESET_DELAY_MS = 2500;

const DEFAULT_SUCCESS_LABEL = "已复制 ✓";
const FAILURE_MESSAGE = "复制失败，可选中文本手动复制";

export interface CopyPromptButtonProps {
  /** Exactly the text that will land on the clipboard. */
  text: string;
  /** Id of the element to select when the clipboard is unavailable. */
  targetId: string;
  label?: string;
  /**
   * Announced in the `role="status"` region after a confirmed clipboard write,
   * and used as the button's swapped label. The prototype's L1 card and detail
   * page say `已复制 ✓`; its L2/L3 compact card says `已复制`. This is the ONLY
   * success text — there is no second "copied to clipboard" sentence.
   */
  successLabel?: string;
  /**
   * Button label while the success state is showing. Defaults to
   * `successLabel`, which is what both prototypes do.
   */
  copiedLabel?: string;
  variant?: ButtonVariant;
  shape?: ButtonShape;
  className?: string;
}

type CopyState = "idle" | "copied" | "failed";

/**
 * Copy-to-clipboard with an honest failure path.
 *
 * Success is announced only after `writeText` resolves. If the API is missing
 * (insecure context, older browser) or the promise rejects (permission denied),
 * the button says so and selects the prompt text so the reader can copy it by
 * hand — it never shows a success state it cannot back up.
 */
export function CopyPromptButton({
  text,
  targetId,
  label = "复制提示词",
  successLabel = DEFAULT_SUCCESS_LABEL,
  copiedLabel = successLabel,
  variant = "primary",
  shape = "square",
  className,
}: CopyPromptButtonProps) {
  const [state, setState] = useState<CopyState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  function scheduleReset(): void {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setState("idle"), RESET_DELAY_MS);
  }

  /** Puts the prompt under the user's cursor so ⌘C still works. */
  function selectTarget(): void {
    const target = document.getElementById(targetId);
    const selection = typeof window.getSelection === "function" ? window.getSelection() : null;
    if (target === null || selection === null) return;
    const range = document.createRange();
    range.selectNodeContents(target);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function fail(): void {
    setState("failed");
    selectTarget();
    scheduleReset();
  }

  async function copy(): Promise<void> {
    const clipboard = typeof navigator === "undefined" ? undefined : navigator.clipboard;
    if (clipboard === undefined || typeof clipboard.writeText !== "function") {
      fail();
      return;
    }
    try {
      await clipboard.writeText(text);
      setState("copied");
      scheduleReset();
    } catch {
      fail();
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button
        variant={variant}
        shape={shape}
        className={className}
        onClick={() => {
          void copy();
        }}
      >
        {state === "copied" ? copiedLabel : label}
      </Button>
      <span role="status" aria-live="polite" className="text-xs font-bold">
        {state === "copied" ? successLabel : null}
        {state === "failed" ? FAILURE_MESSAGE : null}
      </span>
    </span>
  );
}
