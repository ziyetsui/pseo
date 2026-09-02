/**
 * Bauhaus brand mark: red circle, blue square, yellow triangle.
 * Purely decorative — the accessible name comes from the adjacent site name.
 */
export function BrandMark() {
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center gap-1">
      <span className="block size-4 rounded-pill bg-accent-red" />
      <span className="block size-4 bg-accent-blue" />
      <span className="shape-triangle block size-4 bg-accent-yellow" />
    </span>
  );
}
