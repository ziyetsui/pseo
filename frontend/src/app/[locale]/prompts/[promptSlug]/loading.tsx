import { StateBlock } from "@/components/ui/StateBlock";

/** Route-level loading state for the prompt detail page. */
export default function PromptDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 pb-32 md:px-8 md:pt-12 md:pb-16">
      <StateBlock variant="loading" skeletonCount={6} />
    </div>
  );
}
