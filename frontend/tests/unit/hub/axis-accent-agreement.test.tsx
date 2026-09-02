import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TAXONOMY_ACCENT, accentFillClassName } from "@/components/ui/accent";
import { ModelTiles } from "@/features/gallery/ModelTiles";
import { FacetChips } from "@/features/search/FacetChips";
import { TaxonomyTiles } from "@/features/hub/TaxonomyTiles";
import type { TaxonomyWithCount } from "@/lib/content/types";

import { makeFacetGroups, makeTaxonomy } from "../support/prompt-fixtures";

const BASE = "/zh-CN/prompts";

/** The only four fills the accent module can emit. */
const ACCENT_FILLS = ["bg-accent-red", "bg-accent-blue", "bg-accent-yellow", "bg-foreground"];

const model: TaxonomyWithCount = {
  ...makeTaxonomy({ href: "/zh-CN/prompts/models/nano-banana-pro" }),
  id: "model:nano-banana-pro",
  slug: "nano-banana-pro",
  label: "Nano Banana Pro",
  count: 14,
  highValueCount: 3,
};

/**
 * The accents a band paints as DECORATION — the rank marker, the proportion
 * bar's fill, the chip row's axis edge. All of them are `aria-hidden`, which is
 * exactly what separates them from the fills that carry content (a selected
 * chip inverting to `bg-foreground`, the 热门 stamp's yellow pill).
 */
function decorationAccents(root: HTMLElement): string[] {
  const found = new Set<string>();
  for (const el of root.querySelectorAll('[aria-hidden="true"], [aria-hidden="true"] *')) {
    for (const fill of ACCENT_FILLS) {
      if (el.classList.contains(fill)) found.add(fill);
    }
  }
  return [...found];
}

/**
 * One axis, one colour, at every page level it appears on.
 *
 * 按模型浏览 is the same taxonomy axis on L1 and on L2, and it shipped red on
 * one and yellow on the other because the gallery band assigned itself the
 * third step of the band rotation instead of reading the shared axis map. A
 * colour that means "models" on one page and "not models" on the next encodes
 * nothing, and this is the assertion that stops it coming back: the band, the
 * gallery tile and the chip row are rendered side by side and asked for the
 * same answer.
 */
describe("a taxonomy axis wears one accent everywhere", () => {
  it("gives L1's 按模型浏览 band and L2's model tiles the same accent", () => {
    const expected = accentFillClassName(TAXONOMY_ACCENT.model);

    const hub = render(<TaxonomyTiles basePath={BASE} axis="model" terms={[model]} />);
    expect(decorationAccents(hub.container)).toEqual([expected]);
    hub.unmount();

    const gallery = render(<ModelTiles models={[model]} />);
    expect(decorationAccents(gallery.container)).toEqual([expected]);
    gallery.unmount();
  });

  it("gives the 模型 chip row's edge that same accent", () => {
    render(<FacetChips basePath={BASE} query={{}} groups={makeFacetGroups()} />);
    const row = screen.getByRole("group", { name: "模型" });
    expect(decorationAccents(row)).toEqual([accentFillClassName(TAXONOMY_ACCENT.model)]);
  });

  it("colours every hub taxonomy band from the axis map, not from a rotation", () => {
    for (const axis of ["model", "useCase", "technique", "style"] as const) {
      const band = render(<TaxonomyTiles basePath={BASE} axis={axis} terms={[model]} />);
      expect(decorationAccents(band.container), axis).toEqual([
        accentFillClassName(TAXONOMY_ACCENT[axis]),
      ]);
      band.unmount();
    }
  });
});
