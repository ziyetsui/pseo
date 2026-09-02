import { IS_BAUHAUS } from "@/components/ui/theme";

/**
 * The mark beside the wordmark. Purely decorative — the accessible name comes
 * from the adjacent site name, which is why both variants are `aria-hidden`.
 *
 * `bauhaus` is a direct quotation of the school: red circle, blue square,
 * yellow triangle. `neutral` cannot soften that — three primary primitives in
 * a row is the quotation, not its styling — so it replaces it rather than
 * translating it, with the single rounded token a hairline system uses for a
 * mark. It takes the ink rather than an accent, so it reads in both colour
 * schemes without the wordmark ever competing with the nav beside it, and it
 * wears the control radius so it belongs to the same family as the buttons.
 */
export function BrandMark() {
  if (!IS_BAUHAUS) {
    return <span aria-hidden="true" className="block size-4 shrink-0 rounded-[5px] bg-foreground" />;
  }

  return (
    <span aria-hidden="true" className="flex shrink-0 items-center gap-1">
      <span className="block size-4 rounded-pill bg-accent-red" />
      <span className="block size-4 bg-accent-blue" />
      <span className="shape-triangle block size-4 bg-accent-yellow" />
    </span>
  );
}
