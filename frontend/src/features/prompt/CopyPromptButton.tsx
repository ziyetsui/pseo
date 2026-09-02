"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

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
 * One invisible copy of a label, kept only for the width it takes up.
 *
 * `复制提示词` and `已复制 ✓` are not the same width, so swapping one for the
 * other resized the button and shoved 展开 / 原帖 ↗ sideways — a layout shift
 * fired by the product's most-used control, in the middle of the row the
 * reader is still using. The motion audit is explicit that the fix is to
 * RESERVE the width rather than animate it: a width is a layout property, and
 * animating it would move the neighbouring controls smoothly instead of
 * suddenly, which is not the same as not moving them.
 *
 * The reserved text is carried as CSS `content` on a pseudo-element rather
 * than as a text node, and that is load-bearing rather than clever. A hidden
 * `已复制 ✓` text node would put the success string permanently in the
 * document's `textContent`, and the copy contract is that 已复制 appears only
 * after a confirmed clipboard write — `tests/e2e/copy.spec.ts` asserts exactly
 * that against the whole `<body>`. Pseudo-element content takes up space
 * without ever becoming text. `visibility: hidden` (`invisible`) keeps the
 * copy out of the picture while it still occupies its cell; `aria-hidden`
 * keeps it out of the button's accessible name.
 *
 * Where `content` is unsupported the span is empty and the button behaves
 * exactly as it does today — the width is reserved or it is not, and nothing
 * else changes either way.
 */
function LabelSizer({ text }: { text: string }) {
  return (
    <span
      aria-hidden="true"
      className="invisible col-start-1 row-start-1 before:[content:var(--copy-label)]"
      // A CSS string literal, quoted and escaped — the label is data, and it
      // is about to be substituted into a `content` declaration.
      style={{ "--copy-label": JSON.stringify(text) } as CSSProperties}
    />
  );
}

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
        {/*
          One grid cell, three stacked copies: the two reserving copies fix the
          width at the wider of the two labels, the third is the one that is
          actually read. Nothing about the button resizes when the label swaps.
        */}
        <span className="grid justify-items-center">
          <LabelSizer text={label} />
          <LabelSizer text={copiedLabel} />
          <span className="col-start-1 row-start-1">
            {state === "copied" ? copiedLabel : label}
          </span>
        </span>
      </Button>
      <span role="status" aria-live="polite" className="text-xs font-bold">
        {state === "copied" ? successLabel : null}
        {state === "failed" ? FAILURE_MESSAGE : null}
      </span>
    </span>
  );
}
