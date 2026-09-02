import Link from "next/link";

import { StateBlock } from "@/components/ui/StateBlock";
import { cardClassName } from "@/components/ui/Card";
import type {
  CollectionRule,
  CollectionWithCount,
  PromptQuery,
  QueryFacetKey,
  TaxonomyAxis,
} from "@/lib/content/types";
import { queryHref, setFacet } from "@/features/search/query-links";

export interface CollectionTilesProps {
  basePath: string;
  collections: readonly CollectionWithCount[];
  limit?: number;
  emptyMessage?: string;
  className?: string;
}

/** Narrows a taxonomy axis to a filterable query key without a type assertion. */
function toFacetKey(axis: TaxonomyAxis): QueryFacetKey | null {
  switch (axis) {
    case "model":
    case "useCase":
    case "technique":
    case "style":
    case "subject":
      return axis;
    default:
      return null;
  }
}

/**
 * A collection is expressible as a URL only when its rule is a conjunction of
 * filterable axes. Rules that match the prompt body with a regular expression
 * (and any condition on a non-filterable axis) have no query equivalent, so
 * they get `null` — the tile then says so instead of linking somewhere that
 * would silently show the wrong set.
 */
function collectionQuery(rule: CollectionRule): PromptQuery | null {
  if (rule.type !== "axis-all") return null;

  let query: PromptQuery = {};
  for (const condition of rule.conditions) {
    const key = toFacetKey(condition.axis);
    if (key === null) return null;
    query = setFacet(query, key, [condition.value]);
  }
  return query;
}

export function CollectionTiles({
  basePath,
  collections,
  limit,
  emptyMessage = "暂无可展示的合集。",
  className,
}: CollectionTilesProps) {
  const visible = limit === undefined ? collections : collections.slice(0, limit);
  if (visible.length === 0) return <StateBlock variant="empty" message={emptyMessage} />;

  return (
    <ul className={className ?? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
      {visible.map((collection) => {
        const query = collectionQuery(collection.rule);

        const body = (
          <>
            <h3 className="text-base font-black tracking-tight md:text-lg">{collection.title}</h3>
            <p className="text-sm font-medium">{collection.subtitle}</p>
            <p className="mt-auto text-sm font-bold">{collection.count} 条提示词</p>
          </>
        );

        return (
          <li key={collection.id} className="flex">
            {query === null ? (
              <div className={cardClassName("w-full gap-3 p-4")}>
                {body}
                <p className="text-xs font-medium">
                  该合集按提示词正文匹配，当前的筛选参数暂不支持这种条件，因此本期不提供跳转链接。
                </p>
              </div>
            ) : (
              <Link
                href={queryHref(basePath, query)}
                className={cardClassName("w-full gap-3 p-4 no-underline")}
              >
                {body}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
