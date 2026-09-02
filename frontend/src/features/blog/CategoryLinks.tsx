import { ChipLink } from "@/components/ui/Chip";
import { StateBlock } from "@/components/ui/StateBlock";
import { cx } from "@/components/ui/class-names";
import type { ArticleCategory } from "@/lib/content";

export interface CategoryWithCount {
  category: ArticleCategory;
  /** Number of articles currently in the category — counted, never declared. */
  count: number;
}

export interface CategoryLinksProps {
  categories: readonly CategoryWithCount[];
  /** Slug of the category being viewed, when the list is rendered on one. */
  activeSlug?: string;
  className?: string;
}

export function CategoryLinks({ categories, activeSlug, className }: CategoryLinksProps) {
  if (categories.length === 0) {
    return <StateBlock variant="empty" message="还没有可浏览的文章分类。" className={className} />;
  }

  return (
    <ul className={cx("flex flex-wrap gap-3", className)}>
      {categories.map(({ category, count }) => (
        <li key={category.id}>
          <ChipLink
            href={category.href}
            label={category.label}
            count={count}
            active={category.slug === activeSlug}
            activeHint="（当前分类）"
          />
        </li>
      ))}
    </ul>
  );
}
