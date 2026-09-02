import Link from "next/link";

import { cardClassName } from "@/components/ui/Card";
import { GeometricMark } from "@/components/ui/GeometricMark";
import { cx } from "@/components/ui/class-names";
import type { ArticleSummary } from "@/lib/content";

import { ArticleMeta } from "./ArticleMeta";
import { FixtureBadge } from "./FixtureNotice";

export interface ArticleCardProps {
  article: ArticleSummary;
  /** The featured slot renders larger type; everything else is a list card. */
  featured?: boolean;
  className?: string;
}

/**
 * One article as a Bauhaus card. The heading is always `<h3>` because every
 * surface that uses it sits under a `Section`'s `<h2>`.
 */
export function ArticleCard({ article, featured = false, className }: ArticleCardProps) {
  return (
    <article className={cardClassName(cx("h-full gap-4 p-5 md:p-6", className))}>
      <div className="flex flex-wrap items-center gap-3">
        <GeometricMark shape={featured ? "circle" : "square"} color={featured ? "red" : "blue"} />
        {article.isFixture ? <FixtureBadge /> : null}
      </div>
      <h3
        className={cx(
          "font-black tracking-tighter",
          featured ? "text-2xl md:text-4xl" : "text-xl md:text-2xl",
        )}
      >
        <Link href={article.href} className="underline decoration-accent-red decoration-2">
          {article.title}
        </Link>
      </h3>
      <p
        className={cx(
          "max-w-prose font-medium",
          featured ? "text-base md:text-lg" : "text-base",
        )}
      >
        {article.excerpt}
      </p>
      <ArticleMeta article={article} className="mt-auto" />
    </article>
  );
}
