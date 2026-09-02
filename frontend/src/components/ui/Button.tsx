import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

import { cx } from "./class-names";
import { elevationClassName, pressClassName, transitionClassName } from "./hover";

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

/**
 * ≥ 44×44 touch target, uppercase Bauhaus label.
 *
 * The press lives in `VARIANT`, not here, because it depends on whether the
 * variant owns a shadow — see the comment there.
 *
 * No `no-underline` and none is needed: every variant paints `border-2`, and
 * the document hover-underline rule in `globals.css` excludes anything that
 * draws its own box. A `<button>` and an `<a>` wearing this skin now underline
 * identically, which is to say not at all.
 */
const BASE = cx(
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 px-4 py-2 text-sm font-bold tracking-wider uppercase aria-disabled:bg-muted aria-disabled:text-foreground aria-disabled:shadow-none aria-disabled:cursor-not-allowed",
  transitionClassName("control"),
);

/**
 * Hover deepens the offset shadow instead of tinting the fill: the palette has
 * exactly three flat accents and no darker step, and geometry is the language
 * this system already speaks. Nothing moves, so a row of buttons never reflows
 * under the pointer; `active` then collapses the shadow entirely.
 *
 * The step is `elevationClassName("control")` — 4px at rest, 6px hovered. It
 * used to be a hand-written `shadow-hard-md hover:shadow-hard-lg`, i.e. 4px →
 * 8px, which is the offset a card wears AT REST: a hovered button sat at
 * exactly the height of a resting card and the ladder stopped ranking anything.
 * The role owns both ends now, so the two can no longer drift.
 *
 * The press splits on whether the variant owns a shadow. The four shadowed
 * variants `flatten`: the shadow goes to zero and the button travels down-right
 * by exactly the 4px it lost, so its own corner lands where the shadow's corner
 * was and the silhouette collapses without changing size. `ghost` has no
 * shadow and no fill to collapse — moving it would be movement against nothing
 * — so it takes the `band` press, filling the same `muted` its hover uses. That
 * also keeps a disabled ghost honest: `aria-disabled:bg-muted` and the pressed
 * band are the same colour, so a control the app cannot honour does not
 * depress. (`flatten` cancels its own travel under `aria-disabled` for the
 * same reason.)
 */
const VARIANT: Record<ButtonVariant, string> = {
  primary: cx(
    "border-2 border-foreground bg-accent-red text-surface",
    elevationClassName("control", { hover: true }),
    pressClassName("flatten"),
  ),
  secondary: cx(
    "border-2 border-foreground bg-accent-blue text-surface",
    elevationClassName("control", { hover: true }),
    pressClassName("flatten"),
  ),
  yellow: cx(
    "border-2 border-foreground bg-accent-yellow text-foreground",
    elevationClassName("control", { hover: true }),
    pressClassName("flatten"),
  ),
  outline: cx(
    "border-2 border-foreground bg-surface text-foreground hover:bg-muted",
    elevationClassName("control", { hover: true }),
    pressClassName("flatten"),
  ),
  ghost: cx(
    "border-2 border-transparent bg-transparent text-foreground hover:bg-muted",
    pressClassName("band"),
  ),
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
      // A disabled button gets no handler at all: `type` defaults to "button"
      // so a click is a no-op, and attaching a closure here would make this
      // server component pass a function to a DOM element (RSC forbids that).
      onClick={disabled ? undefined : onClick}
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
