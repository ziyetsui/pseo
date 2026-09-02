"use client";

import { StateBlock } from "@/components/ui/StateBlock";

export default function BlogArticleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
      <StateBlock variant="error" message="这篇文章加载失败。" onRetry={reset} />
    </div>
  );
}
