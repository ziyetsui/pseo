import { Button, ButtonLink } from "@/components/ui/Button";
import { serializePromptQuery } from "@/lib/content/query";
import type { PromptQuery } from "@/lib/content/types";

export interface SearchFormProps {
  /** Page the form submits to, e.g. `promptsHome(locale)`. */
  basePath: string;
  /** The query currently reflected in the URL. */
  query: PromptQuery;
  label?: string;
  placeholder?: string;
  submitLabel?: string;
  resetLabel?: string;
  /** Input id. Override when two search forms share a page. */
  inputId?: string;
  className?: string;
}

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
  placeholder = "输入关键词、模型或作者",
  submitLabel = "搜索",
  resetLabel = "重置搜索",
  inputId = "prompt-search",
  className,
}: SearchFormProps) {
  const preserved = serializePromptQuery({ ...query, q: undefined });
  const hasState = query.q !== undefined || Object.keys(preserved).length > 0;

  return (
    <form
      role="search"
      method="get"
      action={basePath}
      className={className ?? "flex flex-wrap items-end gap-3"}
    >
      <div className="flex min-w-60 flex-1 flex-col gap-2">
        <label htmlFor={inputId} className="text-xs font-bold tracking-widest uppercase">
          {label}
        </label>
        <input
          id={inputId}
          type="search"
          name="q"
          defaultValue={query.q ?? ""}
          placeholder={placeholder}
          className="min-h-11 w-full border-2 border-foreground bg-surface px-3 py-2 font-medium"
        />
      </div>

      {Object.entries(preserved).flatMap(([name, value]) =>
        (Array.isArray(value) ? value : [value]).map((entry, index) => (
          <input key={`${name}-${index}-${entry}`} type="hidden" name={name} value={entry} />
        )),
      )}

      <Button type="submit" variant="primary">
        {submitLabel}
      </Button>

      {hasState ? (
        <ButtonLink href={basePath} variant="outline">
          {resetLabel}
        </ButtonLink>
      ) : null}
    </form>
  );
}
