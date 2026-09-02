import { StateBlock } from "@/components/ui/StateBlock";

/**
 * Route-level loading state. The shell (header, `<main>`, footer) comes from
 * the locale layout, so this only fills the content area.
 */
export default function PromptsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
      <StateBlock variant="loading" message="正在加载提示词库。" skeletonCount={6} />
    </div>
  );
}
