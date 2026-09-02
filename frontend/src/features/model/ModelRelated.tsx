import { HairlineList, HairlineRow } from "@/components/ui/HairlineList";
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
 * would silently change the prototype's information architecture. That is
 * `HairlineRow`'s own non-link variant: same rule, same 44px floor, no chevron
 * and no anchor.
 *
 * 其他模型 and 按用例 are different: they are DATA columns, and when the data
 * set has none, the column used to print a heading over a sentence saying so.
 * Beside two columns that do carry links that reads as a fourth kind of row
 * rather than as information, so an empty data column is dropped. 上级 and
 * 创作者 are fixed rows, never empty, so the section always keeps a body.
 */
export function ModelRelated({ locale, relatedModels, relatedUseCases }: ModelRelatedProps) {
  const allGroups: { id: string; title: string; body: React.ReactNode }[] = [
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
        relatedModels.length === 0 ? null : (
          <HairlineList>
            {relatedModels.map((term, index) => {
              const last = index === relatedModels.length - 1;
              return (
                <HairlineRow
                  key={term.id}
                  href={term.href ?? undefined}
                  last={last}
                  className={term.href === null ? "text-foreground/70" : undefined}
                >
                  {term.label}
                  {term.href === null ? COMING_SOON_NOTE : null}
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
        relatedUseCases.length === 0 ? null : (
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
          <HairlineRow last className="text-foreground/70">
            全部创作者{COMING_SOON_NOTE}
          </HairlineRow>
        </HairlineList>
      ),
    },
  ];

  const groups = allGroups.filter((group) => group.body !== null);

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
