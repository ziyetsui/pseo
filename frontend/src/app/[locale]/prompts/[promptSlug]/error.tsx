"use client";

import { StateBlock } from "@/components/ui/StateBlock";

/**
 * Route-level error boundary. `reset` re-renders the segment, so the reader can
 * retry without losing the page; the failure is never dressed up as content.
 */
export default function PromptDetailError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 pb-32 md:px-8 md:pt-12 md:pb-16">
      <StateBlock
        variant="error"
        message="这条提示词没能加载出来。可以重试，或稍后再打开。"
        onRetry={reset}
      />
    </div>
  );
}
