import { StateBlock } from "@/components/ui/StateBlock";

/**
 * Route-level loading state. The shell (header, `<main>`, footer) comes from
 * the locale layout, so this only fills the content area.
 */
export default function ModelLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
      <StateBlock variant="loading" message="正在加载模型页。" skeletonCount={6} />
    </div>
  );
}
