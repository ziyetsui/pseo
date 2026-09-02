import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

import { cx } from "./class-names";

/**
 * The one place button styling is defined. `buttonClassName` is exported so a
 * plain `<a>` (external links, which must not go through `next/link`) can wear
 * the same skin without a second component.
 */

export type ButtonVariant = "primary" | "secondary" | "yellow" | "outline" | "ghost";
export type ButtonShape = "square" | "pill";

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  shape?: ButtonShape;
  className?: string;
}

/** ≥ 44×44 touch target, uppercase Bauhaus label, mechanical press feedback. */
const BASE =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 px-4 py-2 text-sm font-bold tracking-wider uppercase transition duration-200 ease-out active:translate-x-0.5 active:translate-y-0.5 active:shadow-none aria-disabled:bg-muted aria-disabled:text-foreground aria-disabled:shadow-none aria-disabled:cursor-not-allowed";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "border-2 border-foreground bg-accent-red text-surface shadow-hard-md",
  secondary: "border-2 border-foreground bg-accent-blue text-surface shadow-hard-md",
  yellow: "border-2 border-foreground bg-accent-yellow text-foreground shadow-hard-md",
  outline: "border-2 border-foreground bg-surface text-foreground shadow-hard-md",
  ghost: "border-2 border-transparent bg-transparent text-foreground hover:bg-muted",
};

const SHAPE: Record<ButtonShape, string> = {
  square: "rounded-none",
  pill: "rounded-pill",
};

export function buttonClassName({
  variant = "primary",
  shape = "square",
  className,
}: ButtonStyleOptions = {}): string {
  return cx(BASE, VARIANT[variant], SHAPE[shape], className);
}

/**
 * Stable id for the `disabledReason` text so `aria-describedby` can point at
 * it from a server component (no `useId` available). Derived from the text, so
 * server and client agree; pass `disabledReasonId` when two buttons on one page
 * would otherwise share the same reason string.
 */
function reasonId(text: string): string {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (Math.imul(hash, 31) + text.charCodeAt(index)) >>> 0;
  }
  return `disabled-reason-${hash.toString(36)}`;
}

export interface ButtonProps
  extends Omit<ComponentPropsWithoutRef<"button">, "disabled">,
    ButtonStyleOptions {
  /**
   * Renders `aria-disabled` rather than the `disabled` attribute: the control
   * stays focusable so screen readers still reach its explanation. Clicks are
   * swallowed.
   */
  disabled?: boolean;
  /** Visible explanation shown next to a disabled button. */
  disabledReason?: string;
  disabledReasonId?: string;
}

export function Button({
  variant,
  shape,
  className,
  disabled = false,
  disabledReason,
  disabledReasonId,
  type = "button",
  onClick,
  children,
  ...rest
}: ButtonProps) {
  const describedById =
    disabled && disabledReason !== undefined
      ? (disabledReasonId ?? reasonId(disabledReason))
      : undefined;
  // Join rather than replace: a caller's own `aria-describedby` must not be
  // dropped just because this button also has a disabled-reason explanation.
  const describedBy =
    [rest["aria-describedby"], describedById].filter((id): id is string => Boolean(id)).join(" ") ||
    undefined;

  const button = (
    <button
      {...rest}
      type={type}
      aria-disabled={disabled ? "true" : undefined}
      aria-describedby={describedBy}
      onClick={
        disabled
          ? (event) => {
              event.preventDefault();
            }
          : onClick
      }
      className={buttonClassName({ variant, shape, className })}
    >
      {children}
    </button>
  );

  if (describedById === undefined) return button;

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {button}
      <span id={describedById} className="max-w-48 text-xs leading-snug font-medium">
        {disabledReason}
      </span>
    </span>
  );
}

export interface ButtonLinkProps
  extends Omit<ComponentPropsWithoutRef<typeof Link>, "className">,
    ButtonStyleOptions {}

export function ButtonLink({ variant, shape, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link {...rest} className={buttonClassName({ variant, shape, className })}>
      {children}
    </Link>
  );
}
