import type { TrendingWindow } from "@/lib/content/types";

/**
 * Tab labels, verbatim from the prototype's L1 tablist. Pages build their
 * `windows` from this so the labels cannot drift per page.
 *
 * This lives outside `TrendingTabs.tsx` on purpose: that file is a client
 * component, and a plain value imported from a client module into a server
 * component is serialized as a client reference — the server then reads
 * `undefined` and the exported HTML ships tabs with no names. Keeping shared
 * constants in a neutral module lets both sides import the same string.
 */
export const TRENDING_WINDOW_LABELS: Record<TrendingWindow, string> = {
  "7d": "近 7 天",
  "30d": "近 30 天",
  all: "全部",
};
