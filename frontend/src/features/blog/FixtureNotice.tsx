import { Panel } from "@/components/ui/Panel";
import { cx } from "@/components/ui/class-names";

export const FIXTURE_NOTICE_TEXT =
  "示例内容（fixture）：本文为开发阶段占位文章，不代表已发布内容。";

export const FIXTURE_BADGE_TEXT = "示例内容";

/**
 * Permanent, non-dismissable banner. Fixture articles exist so the blog routes
 * have real prose to render; the reader must never mistake one for published
 * editorial content, so there is deliberately no close control.
 */
export function FixtureNotice({ className }: { className?: string }) {
  return (
    <Panel tone="warning" className={className}>
      <p className="font-bold">{FIXTURE_NOTICE_TEXT}</p>
    </Panel>
  );
}

/** Card-level marker for the same fact. */
export function FixtureBadge({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center border-2 border-foreground bg-accent-yellow px-2 py-0.5 text-xs font-bold",
        className,
      )}
    >
      {FIXTURE_BADGE_TEXT}
    </span>
  );
}
