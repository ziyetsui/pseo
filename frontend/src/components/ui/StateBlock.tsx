import Link from "next/link";

import { Button, ButtonLink } from "./Button";
import { cx } from "./class-names";

export type StateVariant = "loading" | "empty" | "no-results" | "error" | "unavailable";

const DEFAULT_MESSAGE: Record<StateVariant, string> = {
  loading: "正在加载内容。",
  empty: "这里还没有内容。",
  "no-results": "没有符合当前筛选条件的提示词。",
  error: "内容加载失败。",
  unavailable: "该内容暂不可用。",
};

export interface StateBlockProps {
  variant: StateVariant;
  /** Overrides the default copy — e.g. to name the filters that excluded everything. */
  message?: string;
  /** Extra content: filter removal links, a reset link, contact details. */
  children?: React.ReactNode;
  /** Client retry handler. Only usable from a `"use client"` tree (`error.tsx`). */
  onRetry?: () => void;
  /** Server-side retry: a link back to a working URL. */
  retryHref?: string;
  retryLabel?: string;
  /** How many skeleton bars the loading variant draws. */
  skeletonCount?: number;
  className?: string;
}

/**
 * The shared loading / empty / no-results / error / unavailable block.
 *
 * It deliberately renders no heading: sections own their `<h2>`, so dropping a
 * StateBlock into one can never break heading-level continuity.
 */
export function StateBlock({
  variant,
  message,
  children,
  onRetry,
  retryHref,
  retryLabel = "重试",
  skeletonCount = 3,
  className,
}: StateBlockProps) {
  const text = message ?? DEFAULT_MESSAGE[variant];

  if (variant === "loading") {
    return (
      <div
        aria-busy="true"
        data-state="loading"
        className={cx("border-2 border-foreground bg-surface p-4 md:border-4", className)}
      >
        <p className="sr-only">加载中</p>
        <div aria-hidden="true" className="flex flex-col gap-3">
          {Array.from({ length: skeletonCount }, (_, index) => (
            <span key={index} className="block h-6 w-full border-2 border-foreground bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      data-state={variant}
      role={variant === "error" ? "alert" : undefined}
      className={cx(
        "flex flex-col items-start gap-4 border-2 border-foreground p-4 md:border-4",
        variant === "error" ? "bg-accent-yellow" : "bg-surface",
        className,
      )}
    >
      <p className="text-sm font-bold md:text-base">{text}</p>
      {children}
      {onRetry === undefined ? null : (
        <Button variant="outline" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
      {onRetry === undefined && retryHref !== undefined ? (
        <ButtonLink variant="outline" href={retryHref}>
          {retryLabel}
        </ButtonLink>
      ) : null}
    </div>
  );
}

export interface StateBlockLinkProps {
  href: string;
  children: React.ReactNode;
}

/** Convenience link for the `children` slot, styled like the surrounding copy. */
export function StateBlockLink({ href, children }: StateBlockLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 min-w-11 items-center justify-center px-1 text-sm font-bold underline"
    >
      {children}
    </Link>
  );
}
