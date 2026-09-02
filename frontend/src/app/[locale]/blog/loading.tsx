import { StateBlock } from "@/components/ui/StateBlock";

export default function BlogIndexLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
      <StateBlock variant="loading" skeletonCount={5} />
    </div>
  );
}
