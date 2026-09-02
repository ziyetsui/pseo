import { describe, expect, it } from "vitest";

import { axisAccentClassName } from "@/features/search/axis-accent";
import { QUERY_FACET_KEYS, type QueryFacetKey } from "@/lib/content/types";

/** Colour utilities that already exist in `globals.css`. Nothing else is allowed. */
const EXISTING_TOKEN_UTILITIES = [
  "bg-accent-red",
  "bg-accent-blue",
  "bg-accent-yellow",
  "bg-foreground",
];

/** The axes each page shows at once — their edges must be distinguishable. */
const AXES_PER_PAGE: Record<string, readonly QueryFacetKey[]> = {
  L1: ["model", "useCase", "technique", "style"],
  L2: ["useCase", "style", "subject"],
  L3: ["useCase", "style", "subject"],
};

describe("axisAccentClassName", () => {
  it("returns an existing token utility for every filterable axis", () => {
    for (const key of QUERY_FACET_KEYS) {
      expect(EXISTING_TOKEN_UTILITIES, key).toContain(axisAccentClassName(key));
    }
  });

  it("keeps the mapping the teardown specified", () => {
    expect(axisAccentClassName("model")).toBe("bg-accent-red");
    expect(axisAccentClassName("useCase")).toBe("bg-accent-blue");
    expect(axisAccentClassName("technique")).toBe("bg-accent-yellow");
    expect(axisAccentClassName("style")).toBe("bg-foreground");
  });

  it.each(Object.entries(AXES_PER_PAGE))(
    "gives %s a different edge colour per axis shown together",
    (_page, axes) => {
      const colours = axes.map(axisAccentClassName);
      expect(new Set(colours).size).toBe(axes.length);
    },
  );
});
