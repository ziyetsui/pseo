/**
 * The mark beside the wordmark. Purely decorative — the accessible name comes
 * from the adjacent site name, which is why it is `aria-hidden`.
 *
 * A single rounded ink square: it takes the ink rather than an accent, so it
 * reads in both colour schemes without the wordmark ever competing with the nav
 * beside it, and it wears the control radius so it belongs to the same family
 * as the buttons.
 */
export function BrandMark() {
  return <span aria-hidden="true" className="block size-4 shrink-0 rounded-[5px] bg-foreground" />;
}
