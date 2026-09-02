import { CopyPromptButton } from "@/features/prompt/CopyPromptButton";

export interface ShareArticleProps {
  /** Absolute canonical URL of the article — the exact string that is copied. */
  url: string;
  /** Id of the element holding the URL; selected when the clipboard fails. */
  targetId?: string;
}

/**
 * Share = copy the canonical link. The URL is also rendered as selectable text
 * so the fallback path (clipboard blocked) leaves something to select by hand.
 */
export function ShareArticle({ url, targetId = "article-share-url" }: ShareArticleProps) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm font-medium">
        本文链接：
        <span id={targetId} className="font-mono text-xs break-all select-all">
          {url}
        </span>
      </p>
      <CopyPromptButton text={url} targetId={targetId} label="复制链接" variant="outline" />
    </div>
  );
}
