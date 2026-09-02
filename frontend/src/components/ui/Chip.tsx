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

const BASE =
  "inline-flex min-h-11 items-center gap-2 rounded-pill border-2 border-foreground px-4 py-1 text-sm font-bold transition duration-200 ease-out";
const IDLE = "bg-surface text-foreground hover:bg-muted";
const ACTIVE = "bg-foreground text-surface";

export function chipClassName(active = false, className?: string): string {
  return cx(BASE, active ? ACTIVE : IDLE, className);
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
  className?: string;
}

export function ChipLink({
  label,
  count,
  active = false,
  activeHint = "（已选，选择以移除）",
  className,
  ...rest
}: ChipLinkProps) {
  return (
    <Link
      {...rest}
      aria-current={active ? "true" : undefined}
      data-active={active ? "true" : "false"}
      className={chipClassName(active, className)}
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
  className?: string;
}

export function ChipButton({
  label,
  count,
  pressed = false,
  activeHint = "（已选，按下以移除）",
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
      className={chipClassName(pressed, className)}
    >
      <ChipContent label={label} count={count} active={pressed} activeHint={activeHint} />
    </button>
  );
}
