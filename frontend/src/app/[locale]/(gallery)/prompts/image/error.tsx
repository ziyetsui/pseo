"use client";

import { StateBlock } from "@/components/ui/StateBlock";

/**
 * Route-level error boundary. `reset()` re-renders this segment, so the retry
 * button is a real retry rather than a full page reload.
 */
export default function ImageGalleryError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
      <StateBlock
        variant="error"
        message="图片提示词加载失败，内容暂时无法显示。"
        onRetry={reset}
        retryLabel="重新加载"
      />
    </div>
  );
}
