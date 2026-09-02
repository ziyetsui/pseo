import type { ComponentPropsWithoutRef } from "react";

import { cx } from "./class-names";

import { GeometricMark, type MarkColor, type MarkShape } from "./GeometricMark";

/**
 * Bauhaus surface: white, hard black border (2px mobile / 4px desktop) and an
 * unblurred offset shadow. `cardClassName` is exported so semantic wrappers
 * (`<article>`, `<li>`) can wear it without nesting an extra `<div>`.
 */
export function cardClassName(className?: string): string {
  return cx(
    "relative flex min-w-0 flex-col border-2 border-foreground bg-surface shadow-hard-md transition duration-200 ease-out hover:-translate-y-1 md:border-4 md:shadow-hard-lg",
    className,
  );
}

export interface CardProps extends Omit<ComponentPropsWithoutRef<"div">, "className"> {
  className?: string;
  /** Optional corner decoration. Purely visual — see `GeometricMark`. */
  mark?: { shape: MarkShape; color: MarkColor };
}

export function Card({ className, mark, children, ...rest }: CardProps) {
  return (
    <div {...rest} className={cardClassName(className)}>
      {mark === undefined ? null : (
        <GeometricMark
          shape={mark.shape}
          color={mark.color}
          className="absolute top-2 right-2 z-10"
        />
      )}
      {children}
    </div>
  );
}
