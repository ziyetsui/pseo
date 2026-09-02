import type { ComponentPropsWithoutRef } from "react";

import { cx } from "./class-names";

export type PanelTone = "neutral" | "note" | "warning";

const TONE: Record<PanelTone, string> = {
  neutral: "bg-surface",
  note: "bg-muted",
  warning: "bg-accent-yellow",
};

export interface PanelProps extends Omit<ComponentPropsWithoutRef<"div">, "className"> {
  tone?: PanelTone;
  className?: string;
}

/**
 * A flat bordered block for notes, warnings and inline explanations. Unlike
 * `Card` it does not lift or cast a shadow, so it never reads as a clickable
 * content tile.
 */
export function Panel({ tone = "neutral", className, children, ...rest }: PanelProps) {
  return (
    <div
      {...rest}
      className={cx("border-2 border-foreground p-4 text-sm font-medium", TONE[tone], className)}
    >
      {children}
    </div>
  );
}
