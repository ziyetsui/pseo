import type { ModelDetail } from "@/lib/content/types";

export interface ModelIdentityProps {
  model: ModelDetail;
}

/**
 * The prototype's centred hero heading: the H1 and the lede, nothing else.
 *
 * `model.summary` is the prototype's lede verbatim
 * (`{n} 条点名该模型的真实提示词 · {hv} 条热门 · {c} 位创作者 · 收录 {from} 至 {to}`)
 * with every number computed by the repository from this model's own prompts.
 *
 * The snapshot date is not repeated here — the footer states
 * `数据更新于 {observedAt}` on every page and each card carries its own
 * observation date, so a third copy would only be noise (global constraint 4 is
 * about never showing an undated metric, not about restating the date).
 */
export function ModelIdentity({ model }: ModelIdentityProps) {
  // Widened from the current `null`-only type so that the day an official URL
  // exists this branch renders a real link instead of silently staying dead.
  const officialUrl: string | null = model.officialUrl;

  return (
    <>
      <h1 className="text-4xl font-black tracking-tighter text-balance uppercase md:text-6xl">
        {model.label} 提示词
      </h1>

      <p className="mx-auto mt-6 max-w-2xl text-lg font-medium text-balance">{model.summary}</p>

      {officialUrl === null ? null : (
        <p className="mt-3 text-sm font-medium">
          <a
            href={officialUrl}
            target="_blank"
            rel="noopener nofollow"
            className="inline-flex min-h-11 items-center underline"
          >
            {model.label} 官方站点 ↗<span className="sr-only">（外部链接，新窗口打开）</span>
          </a>
        </p>
      )}
    </>
  );
}
