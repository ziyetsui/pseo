import Link from "next/link";

import { GrowingUnderline } from "@/components/ui/GrowingUnderline";
import { HairlineList, HairlineRow } from "@/components/ui/HairlineList";
import { cx } from "@/components/ui/class-names";
import { dividerClassName } from "@/components/ui/dividers";
import { microLabelClassName } from "@/components/ui/type-scale";
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
 * The footer is the site's one inverse surface: `bg-foreground` with
 * `text-surface`. `dividerClassName` draws every tier on the `foreground`
 * token, which here is the BACKGROUND — `border-foreground/15` on black is
 * black on black, i.e. no rule at all.
 *
 * So the tier still decides the side, the 2px width and the strength; only the
 * hue is flipped, with the `!` marker so the outcome never depends on which of
 * two border-colour utilities Tailwind happens to emit last. A surface-aware
 * `dividerClassName` belongs in `components/ui`, which is frozen this round —
 * see the lane report.
 */
const INVERSE_HUE: Record<"column" | "row", string> = {
  column: "border-surface/70!",
  row: "border-surface/15!",
};

/** The row tier, whole, for a row this file builds itself. */
const ROW_RULE = cx(dividerClassName("row", "bottom"), INVERSE_HUE.row);

/**
 * The `column` tier (~70%), between the five footer columns.
 *
 * Written out rather than composed from `dividerClassName`, because it must
 * only appear from `lg` — below that the columns stack one or two up, where a
 * left rule would sit against the page edge instead of between two columns,
 * and the shared helper returns an unprefixed string it cannot qualify.
 */
const COLUMN_RULE_LEFT = "lg:border-l-2 lg:border-surface/70";

/**
 * The same `column` tier as a top rule, above the legal line. Not responsive,
 * so it composes from the shared helper the way `ROW_RULE` does.
 */
const SECTION_RULE_TOP = cx(dividerClassName("column", "top"), INVERSE_HUE.column);

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

/**
 * The unlinked twin of `HairlineRow`.
 *
 * `HairlineRow` requires a real `href` on purpose — a row that navigates
 * nowhere is not a link. An unbuilt destination therefore gets the row's rule,
 * its 44px height and its type here, minus the chevron (there is nothing to
 * point at) and minus the anchor. The `（即将推出）` marker is the signal, so
 * the dimmed colour is never carrying the state on its own.
 */
function FooterTextRow({
  label,
  note,
  last,
}: {
  label: string;
  note?: string;
  last: boolean;
}) {
  return (
    <li className="flex flex-col">
      <span
        className={cx(
          "flex min-h-11 w-full items-center gap-2 py-2 text-sm font-medium text-surface/70",
          last ? undefined : ROW_RULE,
        )}
      >
        {label}
        {note === undefined ? null : <span className={microLabelClassName()}>{note}</span>}
      </span>
    </li>
  );
}

export function SiteFooter({
  variant = "compact",
  columns = [],
  links = [],
  snapshotDate = null,
  blogHref = null,
}: SiteFooterProps) {
  const resolvedColumns = withBlogLink(columns, blogHref);
  const hasColumns = variant === "full" && resolvedColumns.length > 0;
  const hasLinkRow = variant === "compact" && links.length > 0;

  return (
    <footer
      data-surface="inverse"
      data-footer-variant={variant}
      className="mt-16 border-t-2 border-foreground bg-foreground text-surface md:border-t-4"
    >
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
        {hasColumns ? (
          /*
            Five dense text indexes, not five stacks of boxes (图版 02). At `lg`
            the column gap is handed to the columns themselves as padding, so
            the `column`-tier rule sits exactly halfway between two columns
            instead of hard against the next one's first word.
          */
          <nav aria-label="页脚导航" className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-x-0">
            {resolvedColumns.map((column, index) => (
              <div
                key={column.title}
                className={cx(
                  "lg:px-6",
                  index === 0 ? "lg:pl-0" : COLUMN_RULE_LEFT,
                  index === resolvedColumns.length - 1 ? "lg:pr-0" : undefined,
                )}
              >
                <h2 className={microLabelClassName("text-accent-yellow")}>{column.title}</h2>
                <HairlineList className="mt-3">
                  {column.items.map((item, itemIndex) => {
                    const last = itemIndex === column.items.length - 1;
                    return item.href === null ? (
                      <FooterTextRow
                        key={`${column.title}-${item.label}`}
                        label={item.label}
                        note={item.note}
                        last={last}
                      />
                    ) : (
                      <HairlineRow
                        key={`${column.title}-${item.label}`}
                        href={item.href}
                        last={last}
                        // `HairlineRow` draws the row tier itself; only its hue
                        // needs flipping, and on the last row (no rule) a bare
                        // border colour paints nothing.
                        className={INVERSE_HUE.row}
                      >
                        {item.label}
                      </HairlineRow>
                    );
                  })}
                </HairlineList>
              </div>
            ))}
          </nav>
        ) : null}

        {hasLinkRow ? (
          /*
            The compact foot's short row is navigation, not an index, so it
            keeps its one line and answers the pointer the way the header nav
            does — a bar that grows under the label — rather than sprouting a
            chevron per item.
          */
          <nav aria-label="页脚导航" className="mb-6">
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-1">
              {links.map((item) => (
                <li key={item.label}>
                  {item.href === null ? (
                    <span
                      className={microLabelClassName(
                        "flex min-h-11 items-center gap-2 text-surface/70",
                      )}
                    >
                      {item.label}
                      {item.note === undefined ? null : <span>{item.note}</span>}
                    </span>
                  ) : (
                    <Link
                      href={item.href}
                      className={microLabelClassName(
                        "group flex min-h-11 items-center no-underline",
                      )}
                    >
                      <GrowingUnderline>{item.label}</GrowingUnderline>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {/*
          The prototype's footlegal, verbatim, on every page — now on the micro
          label tier, which is what it is: three pieces of site metadata. The
          rule above it is the same `column` tier that separates the columns,
          so `full` and `compact` read as one family.
        */}
        <div
          data-testid="footer-legal"
          className={microLabelClassName(
            cx(
              "flex flex-wrap gap-x-6 gap-y-2",
              hasColumns || hasLinkRow ? cx("mt-10 pt-6", SECTION_RULE_TOP) : undefined,
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
