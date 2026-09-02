export interface MetricsSnapshotNoteProps {
  /** The snapshot every interaction metric in this region was read on. */
  observedAt: string;
  /**
   * Render the sentence visibly. Defaults to `false`: the prototype's card
   * grids carry no such line, so the statement is available to assistive tech
   * without adding a row the wireframe does not have. Surfaces that DO show it
   * in the prototype (the L2 statline, the footer's `数据更新于`) write their
   * own copy and do not use this component.
   */
  visible?: boolean;
  className?: string;
}

/**
 * One provenance statement per data region.
 *
 * Global constraint 4 requires every rendered interaction metric to carry the
 * date it was observed on. The prototype puts no such line on a card, so
 * repeating it per card (six times in one grid) is both noise and a deviation.
 * This component states it once for the whole region instead, next to the
 * region's heading, which is where a reader — or a screen reader walking the
 * region — actually needs it.
 */
export function MetricsSnapshotNote({
  observedAt,
  visible = false,
  className,
}: MetricsSnapshotNoteProps) {
  return (
    <p className={visible ? (className ?? "text-xs font-medium") : "sr-only"}>
      互动数据观测于 {observedAt}。
    </p>
  );
}
