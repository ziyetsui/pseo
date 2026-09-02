import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cx } from "./class-names";

/**
 * Pill-shaped taxonomy / facet token. Two flavours:
 *
 * - `ChipLink` — the default. Filtering is URL state, so a chip is a real link
 *   and works with no JavaScript. Selection is announced with `aria-current`
 *   (`aria-pressed` is not valid on a link).
 * - `ChipButton` — for the rare in-page toggle that is not a navigation.
 *
 * The active state is never colour alone: an `aria-hidden` check mark plus a
 * visually hidden "（已选…）" suffix carry the same information.
 */

/*
 * `whitespace-nowrap`: a compact label that wraps inside its own pill reads as
 * two chips. The collections that hold chips all `flex-wrap`, so the row — not
 * the label — is what breaks.
 */
const BASE =
  "inline-flex max-w-full items-center gap-2 rounded-pill border-2 border-foreground font-bold whitespace-nowrap transition duration-200 ease-out";
const IDLE = "bg-surface text-foreground hover:bg-muted";
const ACTIVE = "bg-foreground text-surface";

export type ChipSize = "default" | "compact";

/**
 * Complete, mutually exclusive class sets per size — never an override
 * appended after the fact. Concatenating e.g. `min-h-11` with a later
 * `min-h-0` (or `text-sm` with `text-xs`) depends on which rule wins in the
 * generated stylesheet, not on class order in the string, so it cannot be
 * relied on to override reliably.
 */
const SIZE: Record<ChipSize, string> = {
  default: "min-h-11 px-4 py-1 text-sm",
  compact: "px-3 py-0.5 text-xs",
};

export interface ChipClassNameOptions {
  size?: ChipSize;
  className?: string;
}

export function chipClassName(active = false, options: ChipClassNameOptions = {}): string {
  const { size = "default", className } = options;
  return cx(BASE, SIZE[size], active ? ACTIVE : IDLE, className);
}

interface ChipContentProps {
  label: ReactNode;
  count?: number | null;
  active: boolean;
  activeHint: string;
}

function ChipContent({ label, count, active, activeHint }: ChipContentProps) {
  return (
    <>
      {active ? <span aria-hidden="true">✓</span> : null}
      <span>{label}</span>
      {count === undefined || count === null ? null : (
        <small className="font-mono text-xs font-bold tabular-nums">{count}</small>
      )}
      {active ? <span className="sr-only">{activeHint}</span> : null}
    </>
  );
}

export interface ChipLinkProps extends Omit<ComponentPropsWithoutRef<typeof Link>, "className"> {
  label: ReactNode;
  count?: number | null;
  active?: boolean;
  /** Announced after the label when the chip is active. */
  activeHint?: string;
  size?: ChipSize;
  className?: string;
}

export function ChipLink({
  label,
  count,
  active = false,
  activeHint = "（已选，选择以移除）",
  size,
  className,
  ...rest
}: ChipLinkProps) {
  return (
    <Link
      {...rest}
      aria-current={active ? "true" : undefined}
      data-active={active ? "true" : "false"}
      className={chipClassName(active, { size, className })}
    >
      <ChipContent label={label} count={count} active={active} activeHint={activeHint} />
    </Link>
  );
}

export interface ChipButtonProps extends Omit<ComponentPropsWithoutRef<"button">, "className"> {
  label: ReactNode;
  count?: number | null;
  pressed?: boolean;
  activeHint?: string;
  size?: ChipSize;
  className?: string;
}

export function ChipButton({
  label,
  count,
  pressed = false,
  activeHint = "（已选，按下以移除）",
  size,
  className,
  type = "button",
  ...rest
}: ChipButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      aria-pressed={pressed}
      data-active={pressed ? "true" : "false"}
      className={chipClassName(pressed, { size, className })}
    >
      <ChipContent label={label} count={count} active={pressed} activeHint={activeHint} />
    </button>
  );
}
