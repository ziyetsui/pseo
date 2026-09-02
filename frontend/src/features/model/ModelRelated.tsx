import type { ReactNode } from "react";

import { HairlineList, HairlineRow } from "@/components/ui/HairlineList";
import { cx } from "@/components/ui/class-names";
import { dividerClassName } from "@/components/ui/dividers";
import { microLabelClassName } from "@/components/ui/type-scale";
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

/**
 * A hairline row for a destination this phase does not build.
 *
 * `HairlineRow` requires a real `href` by design — a row that navigates
 * nowhere is text, not a link — so the 即将推出 entries keep the row's rhythm
 * (44px target, the `row` divider tier) without its chevron, which would
 * promise a destination that does not exist. See the lane report's primitive
 * gap note.
 */
function ComingSoonRow({ children, last = false }: { children: ReactNode; last?: boolean }) {
  return (
    <li className="flex flex-col">
      <span
        className={cx(
          "flex min-h-11 w-full items-center gap-3 py-2 text-sm font-medium text-foreground/70",
          last ? undefined : dividerClassName("row", "bottom"),
        )}
      >
        {children}
      </span>
    </li>
  );
}

/**
 * The prototype's four-column `mesh`: 上级 / 其他模型 / 按用例 / 创作者, with its
 * own link labels (`图片提示词`, `提示词库首页`, model names, Chinese use-case
 * names, `全部创作者`).
 *
 * This is a dense text index, not a set of cards: it is built from
 * `HairlineList` / `HairlineRow`, whose rules are the lightest of the three
 * divider tiers and whose chevron stays transparent until the row is hovered
 * or focused. Same links, same labels, same order as before — only the weight
 * changes, so the cards higher up the page are the only heavy objects left.
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
        <HairlineList>
          <HairlineRow href={promptsImage(locale)}>图片提示词</HairlineRow>
          <HairlineRow href={promptsHome(locale)} last>
            提示词库首页
          </HairlineRow>
        </HairlineList>
      ),
    },
    {
      id: "model-related-models",
      title: "其他模型",
      body:
        relatedModels.length === 0 ? (
          <p className="text-sm font-medium">暂无可关联的其他模型。</p>
        ) : (
          <HairlineList>
            {relatedModels.map((term, index) => {
              const last = index === relatedModels.length - 1;
              return term.href === null ? (
                <ComingSoonRow key={term.id} last={last}>
                  {term.label}
                  {COMING_SOON_NOTE}
                </ComingSoonRow>
              ) : (
                <HairlineRow key={term.id} href={term.href} last={last}>
                  {term.label}
                </HairlineRow>
              );
            })}
          </HairlineList>
        ),
    },
    {
      id: "model-related-use-cases",
      title: "按用例",
      body:
        relatedUseCases.length === 0 ? (
          <p className="text-sm font-medium">暂无可关联的用例。</p>
        ) : (
          <HairlineList>
            {relatedUseCases.map((term, index) => (
              <HairlineRow
                key={term.id}
                href={queryHref(promptsHome(locale), setFacet({}, "useCase", [term.slug]))}
                last={index === relatedUseCases.length - 1}
              >
                {term.labelZh ?? term.label}
              </HairlineRow>
            ))}
          </HairlineList>
        ),
    },
    {
      id: "model-related-creators",
      title: "创作者",
      body: (
        <HairlineList>
          <ComingSoonRow last>全部创作者{COMING_SOON_NOTE}</ComingSoonRow>
        </HairlineList>
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
              className={dividerClassName("column", "bottom", {
                className: microLabelClassName("pb-2 text-foreground/70"),
              })}
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
