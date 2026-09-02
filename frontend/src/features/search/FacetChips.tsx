import { ChipLink } from "@/components/ui/Chip";
import type { FacetGroup, PromptQuery } from "@/lib/content/types";

import { isFacetSelected, queryHref, toggleFacet } from "./query-links";

export interface FacetChipsProps {
  /** Page the filters apply to, e.g. `promptsHome(locale)`. */
  basePath: string;
  /** The query currently reflected in the URL. */
  query: PromptQuery;
  /** Groups with counts, straight from `PromptListResult.facets`. */
  groups: readonly FacetGroup[];
  /** Prefix for the generated group heading ids. Unique per page. */
  idPrefix?: string;
  /** Cap the chips shown per axis; the rest stay reachable via the URL. */
  maxPerGroup?: number;
  className?: string;
}

/**
 * Facet navigation, entirely as links.
 *
 * Every chip is an `<a>` whose href is the current URL with that one value
 * toggled on its own axis — other axes and the search term are preserved — so
 * filtering works with JavaScript disabled and every state is shareable and
 * back-button-able. Counts come from props; nothing is computed here.
 */
export function FacetChips({
  basePath,
  query,
  groups,
  idPrefix = "facet",
  maxPerGroup,
  className,
}: FacetChipsProps) {
  const visible = groups.filter((group) => group.options.length > 0);
  if (visible.length === 0) return null;

  return (
    <div className={className ?? "flex flex-col gap-6"}>
      {visible.map((group) => {
        const headingId = `${idPrefix}-${group.key}`;
        const options =
          maxPerGroup === undefined ? group.options : group.options.slice(0, maxPerGroup);

        return (
          <div key={group.key} role="group" aria-labelledby={headingId}>
            <h3
              id={headingId}
              className="text-xs font-bold tracking-widest text-foreground uppercase"
            >
              {group.label}
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {options.map((option) => {
                const active = isFacetSelected(query, group.key, option.slug);
                return (
                  <ChipLink
                    key={option.slug}
                    href={queryHref(basePath, toggleFacet(query, group.key, option.slug))}
                    label={option.label}
                    count={option.count}
                    active={active}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
