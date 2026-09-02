import { ButtonLink } from "@/components/ui/Button";
import { cx } from "@/components/ui/class-names";
import { pressClassName, transitionClassName } from "@/components/ui/hover";
import { controlLabelClassName, microLabelClassName } from "@/components/ui/type-scale";
import { serializePromptQuery } from "@/lib/content/query";
import type { PromptQuery } from "@/lib/content/types";

export interface SearchFormProps {
  /** Page the form submits to, e.g. `promptsHome(locale)`. */
  basePath: string;
  /** The query currently reflected in the URL. */
  query: PromptQuery;
  label?: string;
  /**
   * Required: the prototype writes a different one on every page (L1
   * `搜索提示词、模型、风格、镜头语言、创作者…`, L2 `搜索图片提示词…`, L3 the
   * generate-box prompt), so there is no sensible shared default and each page
   * must state its own.
   */
  placeholder: string;
  submitLabel?: string;
  resetLabel?: string;
  /** Input id. Override when two search forms share a page. */
  inputId?: string;
  className?: string;
}

/**
 * The search field is the anchor of this block, so it carries the page's
 * heaviest border (2px on mobile, 4px from `md` up — the token scale's two
 * steps) and a taller box than any control around it.
 *
 * `搜索` is a solid red block flush inside that border rather than an outlined
 * button floating beside it: colour blocking is how this system says "this one",
 * and a floating button of the same weight as the surrounding chips is exactly
 * what left the block without a landing point.
 */
const FIELD = "flex border-2 border-foreground bg-surface md:border-4";
const INPUT = "min-h-12 w-full min-w-0 bg-transparent px-4 py-2 font-medium md:min-h-14";
/**
 * No border of its own except the divider against the input, and no offset
 * shadow: the block is inside the field's frame, so a second frame would
 * reintroduce the seam this removes. Hover swaps the fill to foreground — the
 * palette has no darker red, and geometry/colour is the language here.
 *
 * Press is `invert`, not `flatten`. `flatten` is for an object whose shadow IS
 * its height, and it travels by exactly the offset it collapses — this block
 * has no shadow by construction (see above), so there would be nothing to
 * collapse and the 4px of travel would slide a flush-mounted block out past the
 * field's own 2px/4px frame, opening a white gap on two sides. Its one surface
 * is its fill, so the press previews the fill the tap produces, which is also
 * the only feedback it gives on touch where there is no hover.
 *
 * `fill` rather than a bare `transition`: colour and background are the only
 * things that move here, and the bare utility would drag `outline-color` along
 * with them and fade the focus ring in from white.
 */
const SUBMIT = cx(
  "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center border-s-2 border-foreground bg-accent-red px-4 text-surface md:border-s-4 md:px-6",
  controlLabelClassName(),
  transitionClassName("fill"),
  "hover:bg-foreground",
  pressClassName("invert"),
);

/**
 * A plain GET form — no JavaScript involved.
 *
 * The browser turns a submit into `?q=…`, which is exactly the URL contract the
 * rest of the filter UI uses. Every other active param is re-emitted as a
 * hidden input, otherwise submitting the search box would silently drop the
 * facets the reader had already chosen.
 */
export function SearchForm({
  basePath,
  query,
  label = "搜索提示词",
  placeholder,
  submitLabel = "搜索",
  resetLabel = "重置",
  inputId = "prompt-search",
  className,
}: SearchFormProps) {
  const preserved = serializePromptQuery({ ...query, q: undefined });

  return (
    <form
      role="search"
      method="get"
      action={basePath}
      className={className ?? "flex flex-wrap items-end gap-3"}
    >
      <div className="flex min-w-60 flex-1 flex-col gap-2">
        <label htmlFor={inputId} className={microLabelClassName()}>
          {label}
        </label>
        <div className={FIELD}>
          <input
            id={inputId}
            type="search"
            name="q"
            defaultValue={query.q ?? ""}
            placeholder={placeholder}
            className={INPUT}
          />
          <button type="submit" className={SUBMIT}>
            {submitLabel}
          </button>
        </div>
      </div>

      {Object.entries(preserved).flatMap(([name, value]) =>
        (Array.isArray(value) ? value : [value]).map((entry, index) => (
          <input key={`${name}-${index}-${entry}`} type="hidden" name={name} value={entry} />
        )),
      )}

      {/*
        Always present, as in the prototype, where 重置 sits next to 搜索 at
        every moment. With nothing filtered it simply points back at the same
        unfiltered page, so it is never a dead control. It keeps the ordinary
        outline skin: it is the secondary of the pair, and the submit block is
        now part of the field rather than its neighbour.
      */}
      <ButtonLink href={basePath} variant="outline">
        {resetLabel}
      </ButtonLink>
    </form>
  );
}
