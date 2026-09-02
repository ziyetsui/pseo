import Link from "next/link";

import { GrowingUnderline } from "@/components/ui/GrowingUnderline";
import { cx } from "@/components/ui/class-names";
import { dividerClassName } from "@/components/ui/dividers";
import { microLabelClassName } from "@/components/ui/type-scale";
import { SITE_NAME } from "@/lib/seo/site";

/**
 * One entry in the footer. `href` is `null` for a destination that has no
 * page in this phase; those render as plain text carrying `note`, never as a
 * link and never as `#` (global constraint 5).
 */
export interface FooterLinkItem {
  label: string;
  href: string | null;
  note?: string;
}

/**
 * One titled group of the `full` footer's link row (`按模型` and its entry
 * links). The name is historical — these were rendered as columns — and is
 * kept because the hub layout and `SiteShell` type their props with it.
 */
export interface FooterColumn {
  title: string;
  items: readonly FooterLinkItem[];
}

export interface SiteFooterProps {
  /**
   * `full` is the L1 footer: one short row of grouped entry links above the
   * legal line. `compact` is the L2/L3/L4 foot — the legal line only,
   * optionally preceded by a short link row (L4's 首页/模型/用例/创作者).
   */
  variant?: "full" | "compact";
  /**
   * Groups for `variant="full"`. Built by the hub layout from `listTaxonomies`
   * (see `features/hub/footer-links`) so this component never touches the
   * content repository. Ignored by `compact`.
   */
  columns?: readonly FooterColumn[];
  /** Inline link row for `compact`, as on the prototype's L4 foot. */
  links?: readonly FooterLinkItem[];
  /**
   * Route of the blog index. `/{locale}/blog` is a real published section, so
   * the `full` footer ends its row with it — see `getPrimaryNav`, which does
   * the same for the header. `null`/omitted leaves the row exactly as given.
   */
  blogHref?: string | null;
  /**
   * Observation date of the underlying data snapshot, rendered as the
   * prototype's `数据更新于 {date}`. `null` until a repository is wired up, and
   * then shown as an explicit "not connected" state rather than a plausible
   * date.
   */
  snapshotDate?: string | null;
}

const COPYRIGHT_LINE = "提示词版权归原作者所有，本站注明出处";
const BLOG_LABEL = "Blog";

/**
 * The footer is the site's one inverse surface: `bg-foreground` with
 * `text-surface`. The rule above the legal line therefore asks
 * `dividerClassName` for the `inverse` surface — the tier decides the side,
 * the 2px width and the strength, and naming the surface picks the ink.
 */
const SECTION_RULE_TOP = dividerClassName("column", "top", { surface: "inverse" });

/**
 * One footer entry. A link answers the pointer the way the header nav does —
 * a bar that grows under the label — and a destination with no page in this
 * phase is text plus its `（即将推出）` marker, so the dimmed colour never
 * carries the state alone. Both keep the 44px floor.
 */
function FooterEntry({ item }: { item: FooterLinkItem }) {
  if (item.href === null) {
    return (
      <span className={microLabelClassName("flex min-h-11 items-center gap-2 text-surface/70")}>
        {item.label}
        {item.note === undefined ? null : <span>{item.note}</span>}
      </span>
    );
  }
  return (
    <Link
      href={item.href}
      className={microLabelClassName("group flex min-h-11 items-center no-underline")}
    >
      <GrowingUnderline>{item.label}</GrowingUnderline>
    </Link>
  );
}

export function SiteFooter({
  variant = "compact",
  columns = [],
  links = [],
  snapshotDate = null,
  blogHref = null,
}: SiteFooterProps) {
  const groups = variant === "full" ? columns.filter((column) => column.items.length > 0) : [];
  const blog: FooterLinkItem | null =
    variant === "full" && blogHref !== null ? { label: BLOG_LABEL, href: blogHref } : null;
  const hasRow = groups.length > 0 || blog !== null;
  const hasLinkRow = variant === "compact" && links.length > 0;

  return (
    <footer
      data-surface="inverse"
      data-footer-variant={variant}
      className="mt-16 border-t-2 border-foreground bg-foreground text-surface md:border-t-4"
    >
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
        {hasRow ? (
          /*
            One row, not five columns. The prototype's footer was a second
            index of the library — four columns of four or five filter links
            each, plus a 资源 column of three destinations with no page — under
            a page whose bands already are that index. What a footer owes the
            reader is a way back in: a few entry links per axis, wrapping as
            one line of micro labels, and the legal line. Each axis keeps its
            name as a yellow label so the row still reads in four families.
          */
          <nav aria-label="页脚导航">
            <ul className="flex flex-wrap items-center gap-x-8 gap-y-2">
              {groups.map((group) => (
                <li key={group.title} className="flex flex-wrap items-center gap-x-4">
                  <span className={microLabelClassName("text-accent-yellow")}>{group.title}</span>
                  <ul aria-label={group.title} className="flex flex-wrap items-center gap-x-4">
                    {group.items.map((item) => (
                      <li key={item.label}>
                        <FooterEntry item={item} />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
              {blog === null ? null : (
                <li>
                  <FooterEntry item={blog} />
                </li>
              )}
            </ul>
          </nav>
        ) : null}

        {hasLinkRow ? (
          /* The compact foot's short row is navigation, not an index, so it
             keeps its one line and the same entry as the full row. */
          <nav aria-label="页脚导航" className="mb-6">
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-1">
              {links.map((item) => (
                <li key={item.label}>
                  <FooterEntry item={item} />
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {/*
          The prototype's footlegal, verbatim, on every page, on the micro
          label tier — three pieces of site metadata. The rule above it is the
          `column` tier, so `full` and `compact` read as one family.
        */}
        <div
          data-testid="footer-legal"
          className={microLabelClassName(
            cx(
              "flex flex-wrap gap-x-6 gap-y-2",
              hasRow || hasLinkRow ? cx("mt-10 pt-6", SECTION_RULE_TOP) : undefined,
            ),
          )}
        >
          <span>{SITE_NAME}</span>
          <span>{COPYRIGHT_LINE}</span>
          <span>数据更新于 {snapshotDate ?? "尚未接入内容仓库"}</span>
        </div>
      </div>
    </footer>
  );
}
