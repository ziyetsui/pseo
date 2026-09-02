import Link from "next/link";

import { SITE_NAME } from "@/lib/seo/site";

/**
 * One entry in a footer column. `href` is `null` for a destination that has no
 * page in this phase; those render as plain text carrying `note`, never as a
 * link and never as `#` (global constraint 5).
 */
export interface FooterLinkItem {
  label: string;
  href: string | null;
  note?: string;
}

export interface FooterColumn {
  title: string;
  items: readonly FooterLinkItem[];
}

export interface SiteFooterProps {
  /**
   * `full` is the prototype's L1 footer: five link columns above the legal
   * line. `compact` is the L2/L3/L4 foot — the legal line only, optionally
   * preceded by a short link row (L4's 首页/模型/用例/创作者).
   */
  variant?: "full" | "compact";
  /**
   * Columns for `variant="full"`. Built by the page from `listTaxonomies`
   * (see `features/hub/footer-links`) so this component never touches the
   * content repository. Ignored by `compact`.
   */
  columns?: readonly FooterColumn[];
  /** Inline link row for `compact`, as on the prototype's L4 foot. */
  links?: readonly FooterLinkItem[];
  /**
   * Route of the blog index. The prototype has no Blog entry anywhere, but
   * `/{locale}/blog` is a real published section, so it is added to the `资源`
   * column of the `full` footer (the one place the prototype already reserves
   * for site-level resources) — see `getPrimaryNav`, which does the same for
   * the header. `null`/omitted leaves the columns exactly as given.
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

/** Title of the prototype's site-resources column, where Blog belongs. */
const RESOURCE_COLUMN_TITLE = "资源";
const BLOG_LABEL = "Blog";

/**
 * Appends the blog index to the `资源` column. Never creates the column (a
 * footer that has no resources column is not this component's decision to
 * change) and never duplicates an entry a caller already supplied.
 */
function withBlogLink(
  columns: readonly FooterColumn[],
  blogHref: string | null,
): readonly FooterColumn[] {
  if (blogHref === null) return columns;
  return columns.map((column) => {
    if (column.title !== RESOURCE_COLUMN_TITLE) return column;
    if (column.items.some((item) => item.label === BLOG_LABEL)) return column;
    return { ...column, items: [...column.items, { label: BLOG_LABEL, href: blogHref }] };
  });
}

export function SiteFooter({
  variant = "compact",
  columns = [],
  links = [],
  snapshotDate = null,
  blogHref = null,
}: SiteFooterProps) {
  const resolvedColumns = withBlogLink(columns, blogHref);

  return (
    <footer
      data-surface="inverse"
      data-footer-variant={variant}
      className="mt-16 border-t-2 border-foreground bg-foreground text-surface md:border-t-4"
    >
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
        {variant === "full" && resolvedColumns.length > 0 ? (
          <nav aria-label="页脚导航" className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {resolvedColumns.map((column) => (
              <div key={column.title}>
                <h2 className="text-xs font-bold tracking-widest text-accent-yellow uppercase">
                  {column.title}
                </h2>
                <ul className="mt-4 flex flex-col gap-1">
                  {column.items.map((item) => (
                    <li key={`${column.title}-${item.label}`}>
                      {item.href === null ? (
                        <span className="flex min-h-11 items-center text-sm font-medium text-surface/70">
                          {item.label}
                          {item.note === undefined ? null : <span>{item.note}</span>}
                        </span>
                      ) : (
                        <Link
                          href={item.href}
                          className="flex min-h-11 items-center text-sm font-medium underline"
                        >
                          {item.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        ) : null}

        {variant === "compact" && links.length > 0 ? (
          <nav aria-label="页脚导航" className="mb-6">
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-1">
              {links.map((item) => (
                <li key={item.label}>
                  {item.href === null ? (
                    <span className="flex min-h-11 items-center text-sm font-medium text-surface/70">
                      {item.label}
                      {item.note === undefined ? null : <span>{item.note}</span>}
                    </span>
                  ) : (
                    <Link
                      href={item.href}
                      className="flex min-h-11 items-center text-sm font-medium underline"
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {/* The prototype's footlegal, verbatim, on every page. */}
        <div
          data-testid="footer-legal"
          className={
            variant === "full" && resolvedColumns.length > 0
              ? "mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t-2 border-surface/30 pt-6 text-sm font-medium"
              : "flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium"
          }
        >
          <span>{SITE_NAME}</span>
          <span>{COPYRIGHT_LINE}</span>
          <span>数据更新于 {snapshotDate ?? "尚未接入内容仓库"}</span>
        </div>
      </div>
    </footer>
  );
}
