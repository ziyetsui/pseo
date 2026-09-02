import Link from "next/link";

import { Section } from "@/components/ui/Section";
import type { Locale, Taxonomy } from "@/lib/content/types";
import { promptsHome, promptsImage } from "@/lib/i18n/routes";
import { queryHref, setFacet } from "@/features/search/query-links";

export const RELATED_SECTION_ID = "model-related";

export interface ModelRelatedProps {
  locale: Locale;
  /** Sibling models the data set links to. `href === null` ⇒ no page yet. */
  relatedModels: readonly Taxonomy[];
  /** Use cases that lead back to L1 pre-filtered on that term. */
  relatedUseCases: readonly Taxonomy[];
}

function label(term: Taxonomy): string {
  return term.labelZh ?? term.label;
}

const LINK_CLASS = "inline-flex min-h-11 items-center px-1 text-sm font-bold underline";

/**
 * Where to go next. Every entry is a real route from the typed builders; a term
 * whose page does not exist in this phase is rendered as plain text with a
 * "即将推出" note rather than a dead `#` link.
 */
export function ModelRelated({ locale, relatedModels, relatedUseCases }: ModelRelatedProps) {
  const groups: { id: string; title: string; body: React.ReactNode }[] = [
    {
      id: "model-related-parents",
      title: "上级页面",
      body: (
        <ul className="flex flex-col gap-1">
          <li>
            <Link href={promptsImage(locale)} className={LINK_CLASS}>
              图片提示词
            </Link>
          </li>
          <li>
            <Link href={promptsHome(locale)} className={LINK_CLASS}>
              提示词库
            </Link>
          </li>
        </ul>
      ),
    },
    {
      id: "model-related-models",
      title: "其他模型",
      body:
        relatedModels.length === 0 ? (
          <p className="text-sm font-medium">暂无可关联的其他模型。</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {relatedModels.map((term) => (
              <li key={term.id}>
                {term.href === null ? (
                  <span className="text-sm font-medium">{label(term)}（模型页即将推出）</span>
                ) : (
                  <Link href={term.href} className={LINK_CLASS}>
                    {label(term)}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        ),
    },
    {
      id: "model-related-use-cases",
      title: "按用例浏览",
      body:
        relatedUseCases.length === 0 ? (
          <p className="text-sm font-medium">暂无可关联的用例。</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {relatedUseCases.map((term) => (
              <li key={term.id}>
                <Link
                  href={queryHref(promptsHome(locale), setFacet({}, "useCase", [term.slug]))}
                  className={LINK_CLASS}
                >
                  {label(term)}
                </Link>
              </li>
            ))}
          </ul>
        ),
    },
  ];

  return (
    <Section id={RELATED_SECTION_ID} title="相关内容">
      <div className="grid gap-6 md:grid-cols-3">
        {groups.map((group) => (
          <div key={group.id} className="flex flex-col gap-2">
            <h3 id={group.id} className="text-base font-black tracking-tight uppercase">
              {group.title}
            </h3>
            {group.body}
          </div>
        ))}
      </div>
    </Section>
  );
}
