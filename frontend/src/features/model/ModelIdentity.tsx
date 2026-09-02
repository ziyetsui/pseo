import type { ModelDetail } from "@/lib/content/types";

export interface ModelIdentityProps {
  model: ModelDetail;
  /** Snapshot date every metric on this page was observed on. */
  observedAt: string;
}

/**
 * The page's identity block: H1, the summary the repository derived from this
 * model's own prompts, an honest statement about the missing official link, and
 * the snapshot date the numbers belong to.
 */
export function ModelIdentity({ model, observedAt }: ModelIdentityProps) {
  // Widened from the current `null`-only type so that the day an official URL
  // exists this branch renders a real link instead of silently staying dead.
  const officialUrl: string | null = model.officialUrl;

  return (
    <header className="mt-6 max-w-3xl">
      <h1 className="text-4xl font-black tracking-tighter uppercase md:text-6xl">
        {model.label} 提示词
      </h1>

      <p className="mt-6 text-lg font-medium">{model.summary}</p>

      <p className="mt-3 text-sm font-medium">
        {officialUrl === null ? (
          "官方链接暂未收录"
        ) : (
          <a
            href={officialUrl}
            target="_blank"
            rel="noopener nofollow"
            className="inline-flex min-h-11 items-center underline"
          >
            {model.label} 官方站点 ↗<span className="sr-only">（外部链接，新窗口打开）</span>
          </a>
        )}
      </p>

      <p className="mt-1 text-sm font-medium">数据快照 {observedAt}</p>
    </header>
  );
}
