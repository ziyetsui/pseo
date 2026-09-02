import Link from "next/link";

import { COMING_SOON_NOTE } from "@/components/layout/nav";
import type { Locale, Taxonomy } from "@/lib/content/types";
import { promptsHome, promptsImage } from "@/lib/i18n/routes";
import { queryHref, setFacet } from "@/features/search/query-links";

import { ModelSection } from "./ModelSection";

export const RELATED_SECTION_ID = "model-related";

export interface ModelRelatedProps {
  locale: Locale;
  /** Sibling models the data set links to. `href === null` ⇒ no page yet. */
  relatedModels: readonly Taxonomy[];
  /** Use cases that lead back to L1 pre-filtered on that term. */
  relatedUseCases: readonly Taxonomy[];
}

const LINK_CLASS = "inline-flex min-h-11 items-center px-1 text-sm font-bold underline";
const TEXT_CLASS = "inline-flex min-h-11 items-center px-1 text-sm font-medium";

/**
 * The prototype's four-column `mesh`: 上级 / 其他模型 / 按用例 / 创作者, with its
 * own link labels (`图片提示词`, `提示词库首页`, model names, Chinese use-case
 * names, `全部创作者`).
 *
 * Every entry is a real route from the typed builders. The 创作者 column points
 * at `/prompts/creators`, which does not ship this phase, so it keeps its place
 * as plain text with a 即将推出 note rather than becoming a dead `#` link
 * (global constraint 5) — the column itself is not deleted, because dropping it
 * would silently change the prototype's information architecture.
 */
export function ModelRelated({ locale, relatedModels, relatedUseCases }: ModelRelatedProps) {
  const groups: { id: string; title: string; body: React.ReactNode }[] = [
    {
      id: "model-related-parents",
      title: "上级",
      body: (
        <ul className="flex flex-col gap-1">
          <li>
            <Link href={promptsImage(locale)} className={LINK_CLASS}>
              图片提示词
            </Link>
          </li>
          <li>
            <Link href={promptsHome(locale)} className={LINK_CLASS}>
              提示词库首页
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
                  <span className={TEXT_CLASS}>
                    {term.label}
                    {COMING_SOON_NOTE}
                  </span>
                ) : (
                  <Link href={term.href} className={LINK_CLASS}>
                    {term.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        ),
    },
    {
      id: "model-related-use-cases",
      title: "按用例",
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
                  {term.labelZh ?? term.label}
                </Link>
              </li>
            ))}
          </ul>
        ),
    },
    {
      id: "model-related-creators",
      title: "创作者",
      body: (
        <ul className="flex flex-col gap-1">
          <li>
            <span className={TEXT_CLASS}>全部创作者{COMING_SOON_NOTE}</span>
          </li>
        </ul>
      ),
    },
  ];

  return (
    <ModelSection id={RELATED_SECTION_ID} title="相关">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {groups.map((group) => (
          <div key={group.id} className="flex flex-col gap-2">
            <h3
              id={group.id}
              className="text-xs font-black tracking-widest text-foreground/70 uppercase"
            >
              {group.title}
            </h3>
            {group.body}
          </div>
        ))}
      </div>
    </ModelSection>
  );
}
