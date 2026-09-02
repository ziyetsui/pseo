/**
 * Number presentation shared by every surface that renders an interaction
 * metric. Both formatters take `number | null` because a missing metric is
 * rendered as an em dash — never as `0` (AGENTS.md §1, global constraint 4).
 *
 * The grouping is done by hand rather than through `Intl.NumberFormat` so the
 * output is identical in every runtime (node, jsdom, the browser) regardless of
 * which ICU data happens to be bundled.
 */

/** Rendered in place of a metric the source post did not expose. */
export const MISSING_VALUE = "—";

/** `2512` → `2,512`; `null` → `—`. Used by the L1 card and the creator tiles. */
export function formatThousands(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return MISSING_VALUE;
  const rounded = Math.trunc(value);
  const sign = rounded < 0 ? "-" : "";
  return sign + String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const COMPACT_UNITS: readonly { readonly limit: number; readonly suffix: string }[] = [
  { limit: 1_000, suffix: "K" },
  { limit: 1_000_000, suffix: "M" },
  { limit: 1_000_000_000, suffix: "B" },
];

/**
 * The prototype's L2/L3 badge format: `3849` → `3.8K`, `2449` → `2.4K`,
 * `12000` → `12K`, `128` → `128`, `null` → `—`.
 *
 * One decimal is kept only when it carries information (`3.8K`, not `12.0K`).
 * A value that rounds up into the next unit is promoted rather than printed as
 * `1000K`.
 */
export function formatCompactCount(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return MISSING_VALUE;
  const rounded = Math.trunc(value);
  const abs = Math.abs(rounded);
  if (abs < COMPACT_UNITS[0]!.limit) return String(rounded);

  const sign = rounded < 0 ? "-" : "";
  for (let index = COMPACT_UNITS.length - 1; index >= 0; index -= 1) {
    const unit = COMPACT_UNITS[index]!;
    if (abs < unit.limit) continue;
    const scaled = Math.round((abs / unit.limit) * 10) / 10;
    // `999_950 / 1000` rounds to `1000.0K`; promote it to the next unit instead.
    if (scaled >= 1000 && index < COMPACT_UNITS.length - 1) {
      const next = COMPACT_UNITS[index + 1]!;
      return `${sign}${trimDecimal(Math.round((abs / next.limit) * 10) / 10)}${next.suffix}`;
    }
    return `${sign}${trimDecimal(scaled)}${unit.suffix}`;
  }
  return String(rounded);
}

function trimDecimal(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
