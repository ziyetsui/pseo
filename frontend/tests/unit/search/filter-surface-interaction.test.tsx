import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PRESS_FLATTEN_MARKER } from "@/components/ui/hover";
import { ActiveFilters } from "@/features/search/ActiveFilters";
import { SearchForm } from "@/features/search/SearchForm";
import { AnchorNav } from "@/features/hub/AnchorNav";
import { ModelTiles } from "@/features/gallery/ModelTiles";
import { TaxonomyTiles } from "@/features/hub/TaxonomyTiles";
import type { AppliedFilter, TaxonomyWithCount } from "@/lib/content/types";

import { makeTaxonomy } from "../support/prompt-fixtures";

const BASE = "/zh-CN/prompts";

function listSources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? listSources(resolve(dir, entry.name))
      : /\.tsx?$/.test(entry.name)
        ? [resolve(dir, entry.name)]
        : [],
  );
}

/** Every source file this lane owns. */
const LANE_FILES = ["search", "hub", "gallery", "model"].flatMap((feature) =>
  listSources(resolve(process.cwd(), "src/features", feature)),
);

/** Comments talk ABOUT these utilities; only class strings may contain them. */
function classStringsIn(source: string): string[] {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
  return [...withoutComments.matchAll(/"[^"\n]*"|'[^'\n]*'/g)].map((match) => match[0]);
}

/**
 * A bare `transition` expands to twenty-one properties in Tailwind v4 and
 * `transition-colors` to seven, and BOTH lists include `outline-color`.
 * `:focus-visible` paints an outline whose colour starts at `currentcolor`, so
 * either utility fades the focus ring in from the element's own text colour
 * instead of painting it. Every transition on this surface therefore names its
 * properties, via `transitionClassName`.
 *
 * Asserted over the whole lane rather than over one component, so a control
 * added later cannot quietly reintroduce it.
 */
describe("the filter surface names the properties it animates", () => {
  it("never puts a bare `transition` or `transition-colors` in a class string", () => {
    for (const file of LANE_FILES) {
      for (const literal of classStringsIn(readFileSync(file, "utf8"))) {
        expect(literal, file).not.toMatch(/(^|[\s"'])transition([\s"']|$)/);
        expect(literal, file).not.toContain("transition-colors");
        expect(literal, file).not.toContain("transition-all");
      }
    }
  });
});

/**
 * Touch has no hover. Until a press state existed, a tap on any of these
 * produced nothing at all between the finger going down and the next render —
 * and on a phone these are this site's primary filter and navigation controls.
 */
describe("the filter surface answers a press", () => {
  it("fills the band under the reset link", () => {
    render(
      <ActiveFilters
        basePath={BASE}
        query={{ q: "cat" }}
        total={3}
        appliedFilters={[{ key: "q", value: "cat", label: "关键词「cat」" } as AppliedFilter]}
      />,
    );
    const reset = screen.getByRole("link", { name: "清除全部筛选" });
    expect(reset.className).toContain("active:bg-muted");
    expect(reset.className).toContain("transition-[color,background-color]");
    // The press state is not bought with the touch target.
    expect(reset.className).toContain("min-h-11");
  });

  it("previews the search submit's fill instead of sliding it out of its frame", () => {
    render(<SearchForm basePath={BASE} query={{}} placeholder="搜索图片提示词…" />);
    const submit = screen.getByRole("button", { name: "搜索" });
    expect(submit.className).toContain("active:bg-foreground");
    // `flatten` would translate a block that has no shadow to collapse, out
    // past the field's own 2px/4px border.
    expect(submit.className).not.toContain("active:translate");
    expect(submit.className).not.toContain("press-flatten");
  });

  it("fills the band under each hub anchor", () => {
    render(<AnchorNav />);
    for (const link of screen.getAllByRole("link")) {
      expect(link.className, link.textContent ?? "").toContain("active:bg-muted");
      expect(link.className, link.textContent ?? "").toContain("min-h-11");
    }
  });
});

const linkedModel: TaxonomyWithCount = {
  ...makeTaxonomy({ href: "/zh-CN/prompts/models/nano-banana-pro" }),
  id: "model:nano-banana-pro",
  slug: "nano-banana-pro",
  label: "Nano Banana Pro",
  count: 14,
  highValueCount: 3,
};

/**
 * On a phone the two-up browse grid IS the product's main surface, and it gave
 * no tap feedback at all: a tile carries a hard offset shadow but had no
 * `:active`, so between the finger going down and the next route painting
 * nothing happened and people tapped twice. The tiles pick this up through the
 * card chassis, which is exactly the point — asserting it here is what keeps
 * these bands inside the chassis rather than reinventing a shell.
 */
describe("browse tiles press flat under a finger", () => {
  it("gives a hub taxonomy tile and a gallery model tile the same press", () => {
    const hub = render(<TaxonomyTiles basePath={BASE} axis="model" terms={[linkedModel]} />);
    const hubTile = hub.container.querySelector("a");
    expect(hubTile?.className).toContain(PRESS_FLATTEN_MARKER);
    hub.unmount();

    const gallery = render(<ModelTiles models={[linkedModel]} />);
    const galleryTile = gallery.container.querySelector('a[data-model-tile="nano-banana-pro"]');
    expect(galleryTile?.className).toContain(PRESS_FLATTEN_MARKER);
  });
});
